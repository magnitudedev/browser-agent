import { RenderableContent } from "@/memory/observation";
import { MultiMediaContentPart } from "@/memory/rendering";
import { Image, imageToBaml } from "@/memory/image";
import { Image as BamlImage } from '@boundaryml/baml';


async function buildJsonPartsRecursive(
    data: RenderableContent,
    partsList: MultiMediaContentPart[],
    indent: number,
    currentLevel: number = 0,
    isRoot: boolean = false
): Promise<void> {
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
    if (data === null) {
        partsList.push('null');
        return;
    }
    if (data === undefined) {
        return; // Undefined values are omitted in JSON
    }
    if (typeof data === 'string') {
        if (isRoot) {
            partsList.push(data);
        } else {
            partsList.push(JSON.stringify(data));
        }
        return;
    }
    if (typeof data === 'number' || typeof data === 'boolean') {
        partsList.push(String(data));
        return;
    }

    const newline = indent > 0 ? '\n' : '';
    const spacing = indent > 0 ? ' '.repeat(currentLevel * indent) : '';
    const nextSpacing = indent > 0 ? ' '.repeat((currentLevel + 1) * indent) : '';

    if (Array.isArray(data)) {
        partsList.push('[');
        
        for (let index = 0; index < data.length; index++) {
            const item = data[index];
            if (item !== undefined) { // Skip undefined values in arrays
                if (index > 0) {
                    partsList.push(',');
                }
                if (indent > 0) {
                    partsList.push(newline + nextSpacing);
                } else if (index > 0) {
                    partsList.push(' ');
                }
                await buildJsonPartsRecursive(item, partsList, indent, currentLevel + 1, false);
            }
        }
        
        if (data.length > 0 && indent > 0) {
            partsList.push(newline + spacing);
        }
        partsList.push(']');
        return;
    }

    if (typeof data === 'object' && data !== null) {
        partsList.push('{');
        
        const entries = Object.entries(data).filter(([, val]) => val !== undefined);
        
        for (let index = 0; index < entries.length; index++) {
            const [key, value] = entries[index];
            
            if (index > 0) {
                partsList.push(',');
            }
            if (indent > 0) {
                partsList.push(newline + nextSpacing);
            } else if (index > 0) {
                partsList.push(' ');
            }
            
            // Add the key
            partsList.push(JSON.stringify(key));
            partsList.push(': ');
            
            // Add the value
            await buildJsonPartsRecursive(value, partsList, indent, currentLevel + 1, false);
        }
        
        if (entries.length > 0 && indent > 0) {
            partsList.push(newline + spacing);
        }
        partsList.push('}');
        return;
    }

    throw new Error(`Object type not supported for JSON rendering: '${typeof data}'. Data: ${data}`);
}

export async function renderJsonParts(data: RenderableContent, indent: number): Promise<MultiMediaContentPart[]> {
    const rawList: MultiMediaContentPart[] = [];
    await buildJsonPartsRecursive(data, rawList, indent, 0, true);

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