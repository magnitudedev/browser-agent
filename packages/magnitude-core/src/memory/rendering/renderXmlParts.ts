/**
 * Convert observations to form that can be passed as BAML context, rendered as a custom XML-like structure.
 */
import { Image as BamlImage } from '@boundaryml/baml';
import { RenderableContent, ObservableDataObject, ObservableDataArray, ObservableDataPrimitive } from '@/memory/observation';
import { Image, imageToBaml } from '@/memory/image';


export type MultiMediaContentPart = BamlImage | string;

//export type BamlRenderable = BamlImage | string;
// export type BamlRenderable = {
//     role: ''
//     content: (BamlImage | string)[]
// }

async function buildXmlPartsRecursive(
    data: RenderableContent,
    indentLevel: number,
    partsList: MultiMediaContentPart[],
    isInsideList: boolean = false
): Promise<void> {
    const indent = '  '.repeat(indentLevel);

    if (data instanceof Image) {
        const bamlImg = await imageToBaml(data);
        if (bamlImg) {
            partsList.push(bamlImg);
        }
        return;
    }
    if (data instanceof BamlImage) {
        partsList.push(data);
        return;
    }
    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean' || data === null) {
        partsList.push(String(data)); // No XML escaping, direct string conversion
        return;
    }
    if (data === undefined) {
        return; // Undefined values are omitted
    }

    if (Array.isArray(data)) {
        // data.forEach(async (item, index) => {
        //     await buildXmlPartsRecursive(item, indentLevel, partsList, true);
        //     if (index < data.length - 1) {
        //         partsList.push("\n");
        //     }
        // });
        for (let index = 0; index < data.length; index++) {
            await buildXmlPartsRecursive(data[index], indentLevel, partsList, true);
            if (index < data.length - 1) {
                partsList.push("\n");
            }
        }
        return;
    }

    if (typeof data === 'object' && data !== null) {
        const objectEntries = Object.entries(data as ObservableDataObject).filter(([, val]) => val !== undefined);
        
        objectEntries.forEach(async ([key, value], entryIndex) => {
            const tagName = key; // Use key directly as tag name
            const currentValueParts: MultiMediaContentPart[] = [];
            
            await buildXmlPartsRecursive(value, indentLevel + 1, currentValueParts, false);

            // Merge adjacent strings in currentValueParts for easier analysis
            const mergedValueParts: MultiMediaContentPart[] = [];
            let currentStr = "";
            for (const part of currentValueParts) {
                if (typeof part === 'string') {
                    currentStr += part;
                } else {
                    if (currentStr) mergedValueParts.push(currentStr);
                    currentStr = "";
                    mergedValueParts.push(part);
                }
            }
            if (currentStr) mergedValueParts.push(currentStr);

            // Apply styling rules
            if (mergedValueParts.length === 1 && mergedValueParts[0] instanceof BamlImage) {
                partsList.push(`${indent}<${tagName}>`);
                partsList.push(mergedValueParts[0]); // The BamlImage
                partsList.push(`</${tagName}>`);
            } else if (mergedValueParts.length === 1 && typeof mergedValueParts[0] === 'string') {
                const contentStr = mergedValueParts[0] as string;
                if (contentStr.includes('\n')) {
                    partsList.push(`${indent}<${tagName}>\n${contentStr}\n${indent}</${tagName}>`);
                } else {
                    partsList.push(`${indent}<${tagName}>${contentStr}</${tagName}>`);
                }
            } else { // Empty content or multiple parts (complex/nested)
                partsList.push(`${indent}<${tagName}>\n`);
                mergedValueParts.forEach((part, partIdx) => {
                    partsList.push(part);
                    if (partIdx < mergedValueParts.length - 1) {
                        partsList.push("\n");
                    }
                });
                partsList.push(`\n${indent}</${tagName}>`);
            }

            if (entryIndex < objectEntries.length - 1) {
                partsList.push("\n"); // Newline between sibling XML elements
            }
        });
        return;
    }

    throw new Error(`Object type not supported for LLM context: ${typeof data}`);
}

export async function renderXmlParts(data: RenderableContent): Promise<MultiMediaContentPart[]> {
    const rawList: MultiMediaContentPart[] = [];
    await buildXmlPartsRecursive(data, 0, rawList);

    // Merge adjacent strings
    if (rawList.length === 0) {
        return [];
    }

    const mergedList: MultiMediaContentPart[] = [];
    let currentString = "";

    for (const item of rawList) {
        if (typeof item === 'string') {
            currentString += item;
        } else { // It's a BamlImage
            if (currentString.length > 0) {
                mergedList.push(currentString);
            }
            currentString = ""; // Reset accumulator
            mergedList.push(item); // Push the BamlImage
        }
    }
    // Add any trailing string
    if (currentString.length > 0) {
        mergedList.push(currentString);
    }
    
    return mergedList;
}
