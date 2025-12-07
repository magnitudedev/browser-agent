import { Image as BamlImage } from '@boundaryml/baml';
import { StoredMedia } from './serde';

// Re-export the base Image class from magnitude-harness
export { Image } from 'magnitude-harness';
import { Image } from 'magnitude-harness';

/**
 * Convert an Image to a BAML Image for use with AI models
 */
export async function imageToBaml(image: Image): Promise<BamlImage> {
    const format = await image.getFormat();
    const data = await image.toBase64();
    return BamlImage.fromBase64(`image/${format}`, data);
}

/**
 * Convert an Image to a JSON representation for serialization
 */
export async function imageToJson(image: Image): Promise<StoredMedia> {
    return {
        type: 'media',
        format: await image.getFormat(),
        storage: 'base64',
        base64: await image.toBase64()
    };
}