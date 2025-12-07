/**
 * Utilities for converting multi-media observation data to/from JSON
 */
import { Base64Image } from "magnitude-harness";
import { RenderableContent, ObservableDataObject } from "./observation";
import { Image, imageToJson } from './image';



// JSON primitives for the custom multi-media dialect
// export type StoredMedia = {
//     type: 'media',
//     mediaType: string, // e.g. image/png mime type
//     storageType: 'url',
//     url: string
// } | {
//     type: 'media',
//     mediaType: string,
//     storageType: 'base64',
//     base64: string//Base64Image
// }; // TODO: add file storage type
export type StoredMedia = {
    type: 'media',
    format: string,
    storage: 'base64',
    base64: string
}

export interface StoredPrimitive {
    type: 'primitive',
    //data: string
    content: string | boolean | number
}

type MultiMediaPrimitive = StoredMedia | StoredPrimitive | undefined | null;
type MultiMediaArray = Array<MultiMediaJson>;
export type MultiMediaObject = {
    [key: string]: MultiMediaJson;
};

export type MultiMediaJson = MultiMediaPrimitive | MultiMediaArray | MultiMediaObject;

export async function observableDataToJson(data: RenderableContent): Promise<MultiMediaJson> {
    if (data instanceof Image) {
        return await imageToJson(data);
    }

    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
        return { type: "primitive", content: data };
    }

    if (data === undefined) {
        return undefined; // JSON.stringify will omit keys with this value or handle standalone undefined
    }

    if (data === null) {
        return null;
    }

    if (Array.isArray(data)) {
        // Filter out undefined items first, then map and process the rest.
        return Promise.all(data
            .filter(item => item !== undefined)
            .map(item => observableDataToJson(item))
        );
    }

    if (typeof data === 'object') { // Known not to be null or array here
        const processedObject: { [key: string]: any } = {};
        for (const key in data) {
            if (Object.prototype.hasOwnProperty.call(data, key)) {
                const value = (data as ObservableDataObject)[key];
                const processedValue = observableDataToJson(value);

                // Only add the key to the new object if its processed value is not undefined
                if (processedValue !== undefined) {
                    processedObject[key] = processedValue;
                }
            }
        }
        return processedObject;
    }

    // Fallback for any unexpected data types not covered by ObservableData.
    // Returning undefined is consistent with how unrepresentable values are handled.
    return undefined;
}

// TODO: Implement deserialization, and actually leverage serde for logging stuff


export async function jsonToObservableData(data: MultiMediaJson): Promise<RenderableContent> {
    // Handle null and undefined primitives
    if (data === null || data === undefined) {
        return data;
    }

    // Handle arrays by recursively converting each item
    if (Array.isArray(data)) {
        return Promise.all(data.map(item => jsonToObservableData(item)));
    }

    // Handle objects, which can be StoredMedia, StoredPrimitive, or a generic object
    if (typeof data === 'object') {
        // Check for our special typed objects
        if ('type' in data && typeof data.type === 'string') {
            switch (data.type) {
                case 'media':
                    // Cast the object to StoredMedia and use the static `fromBase64` method.
                    const media = data as StoredMedia;
                    if (media.storage === 'base64') {
                        return Image.fromBase64(media.base64);
                    }
                    throw new Error(`Unsupported media storage type: ${media.storage}`);

                case 'primitive':
                    // Unwrap the primitive value from its container object.
                    return (data as StoredPrimitive).content;
            }
        }

        // Handle generic observable data object by recursively converting each property's value
        const result: ObservableDataObject = {};
        const keys = Object.keys(data);
        
        // Process all values concurrently for better performance
        const values = await Promise.all(
            keys.map(key => jsonToObservableData((data as MultiMediaObject)[key]))
        );

        // Reconstruct the object from the processed keys and values
        keys.forEach((key, index) => {
            result[key] = values[index];
        });

        return result;
    }
    
    // According to the MultiMediaJson type definition, raw primitives (string, number, boolean)
    // are not valid at the top level and should be wrapped in a StoredPrimitive object.
    // Throw an error if we encounter them, as the input is malformed.
    throw new Error(`Invalid MultiMediaJson format: Unexpected primitive value '${data}'.`);
}