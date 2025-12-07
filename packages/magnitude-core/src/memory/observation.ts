/**
 * Observations and declarations for what kind of data is "observable" - i.e. can be processed into BAML context or JSON.
 */
import { fnv1a32Hex } from '@/util';
import { Image } from './image';
import { MultiMediaJson, observableDataToJson } from './serde';
import { MultiMediaMessage } from '@/ai/baml_client';
import { type MultiMediaContentPart, renderContentParts } from './rendering';

// undefined in JSON is either removed if k/v or removed from array, not actually JSON-compatible technically
export type ObservableDataPrimitive = Image | string | number | boolean | null | undefined; // | Observation

export type ObservableDataArray = Array<RenderableContent>;

export type ObservableDataObject = {
    [key: string]: RenderableContent;
};

export type RenderableContent = ObservableDataPrimitive | ObservableDataArray | ObservableDataObject;

export type ObservationRole = 'user' | 'assistant';

export interface ObservationRetentionOptions {
    // Retention policy determines whether a given observation is actually rendered into context,
    // depending on what other observations are in the same memory
    type: string; // unique type identifier used for dedupe and limit logic
    limit?: number; // max number of this type of observation that is allowed to remain in memory
    dedupe?: boolean; // dedupe adjacent identical observations of the same type
}

// consider limiting media based on source - e.g. thought is only text
export type ObservationSource = `connector:${string}` | `action:taken:${string}` | `action:result:${string}` | `thought`;

export class Observation {
    public readonly source: ObservationSource; // where this observation came from
    public readonly role: ObservationRole;
    public readonly timestamp: number; // time this observation was made
    public readonly content: RenderableContent; // the arbitrarily-structured multimedia content of this observation
    public readonly retention?: ObservationRetentionOptions;

    constructor(source: ObservationSource, role: ObservationRole, content: RenderableContent, retention?: ObservationRetentionOptions, timestamp?: number) {
        this.source = source;
        this.role = role;
        this.content = content;
        this.timestamp = timestamp ?? Date.now();
        this.retention = retention;
    }

    static fromConnector(connectorId: string, content: RenderableContent, options?: ObservationRetentionOptions): Observation {
        return new Observation(`connector:${connectorId}`, 'user', content, options);
    }

    static fromActionTaken(actionId: string, content: RenderableContent, options?: ObservationRetentionOptions): Observation {
        // see notes on fromThought
        return new Observation(`action:taken:${actionId}`, 'user', content, options);
    }

    static fromActionResult(actionId: string, content: RenderableContent, options?: ObservationRetentionOptions): Observation {
        return new Observation(`action:result:${actionId}`, 'user', content, options);
    }

    static fromThought(content: RenderableContent, options?: ObservationRetentionOptions): Observation {
        // may want to reconsider this structure - probably want to show something that actually matches what the assistant sent else it might pattern match.
        // or just do these as user messages.
        // changed to user for now
        return new Observation(`thought`, 'user', content, options);
    }

    toString() {
        // will be pretty ugly usually
        return JSON.stringify(this.content);
    }

    async toJson(): Promise<MultiMediaJson> {
        return await observableDataToJson(this.content);
    }

    async render(options?: { prefix?: MultiMediaContentPart[], postfix?: MultiMediaContentPart[] }): Promise<MultiMediaMessage> {
        return {
            role: this.role,
            content: [ ...(options?.prefix ?? []), ...(await renderContentParts(this.content, { mode: 'json', indent: 2 })), ...(options?.postfix ?? [])]
        };
    }

    // async renderContentParts(): Promise<MultiMediaContentPart[]> {
    //     return await renderParts(this.content);
    // }

    // async toContext(): Promise<BamlRenderable[]> {
    //     return await observableDataToContext(this.data);
    // }

    async hash(): Promise<string> {
        // build str of all text+img content
        const stringifiedContent = JSON.stringify(await this.toJson());
        return fnv1a32Hex(stringifiedContent);
    }

    async equals(obs: Observation): Promise<boolean> {
        // TODO: deep eq for both text and img content
        return (await this.hash()) == (await obs.hash());
    }
}


// export async function renderObservations(observations: Observation[]): Promise<BamlRenderable[]> {
//     /**
//      * Refines observations (according to observation culling options) and converts to BAML-renderable content
//      */
//     const filteredObservations = await filterObservations(observations);

//     let content: BamlRenderable[] = [];
//     for (const obs of filteredObservations) {
//         if (obs.source.startsWith('action:taken') || obs.source.startsWith('thought')) {
//             content.push(`[${new Date(obs.timestamp).toTimeString().split(' ')[0]}]: `);
//         }
//         content = [...content, ...await obs.toContext(), "\n"];
//     }

//     return content;
// }