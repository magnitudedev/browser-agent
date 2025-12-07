import { MultiMediaMessage } from '@/ai/baml_client';
import { Observation, ObservationRetentionOptions, ObservationRole, ObservationSource } from './observation';
import { jsonToObservableData, MultiMediaJson, observableDataToJson } from './serde';
import { applyMask, maskObservations } from './masking';
import { Image as BamlImage } from '@boundaryml/baml';

// export interface AgentMemoryEvents {
//     'thought': (thought: string) => void;
// }

export interface SerializedAgentMemory {
    instructions?: string;
    observations: {
        source: ObservationSource,
        role: ObservationRole,
        timestamp: number,
        data: MultiMediaJson,
        options?: ObservationRetentionOptions,
    }[];
}

export interface AgentMemoryOptions {
    instructions?: string | null,
    promptCaching?: boolean,
    thoughtLimit?: number, // limit for thoughts
    minScreenshots?: number, // keep this many screenshots after batch drop (default: 3)
    maxScreenshots?: number, // trigger batch drop when exceeding this (default: 12)
}

export interface MemoryRenderOptions {

}

const DEFAULT_MIN_SCREENSHOTS = 3;
const DEFAULT_MAX_SCREENSHOTS = 12;

export class AgentMemory {
    private options: Required<AgentMemoryOptions>;
    private observations: Observation[] = [];
    private freezeMask?: boolean[];

    constructor(options?: AgentMemoryOptions) {
        this.options = {
            instructions: options?.instructions ?? null,
            promptCaching: options?.promptCaching ?? false,
            thoughtLimit: options?.thoughtLimit ?? 20,
            minScreenshots: options?.minScreenshots ?? DEFAULT_MIN_SCREENSHOTS,
            maxScreenshots: options?.maxScreenshots ?? DEFAULT_MAX_SCREENSHOTS,
        };
    }

    public get instructions() {
        // why is this on memory? prob should just be on agent
        return this.options.instructions;
    }

    public get minScreenshots() {
        return this.options.minScreenshots;
    }

    public get maxScreenshots() {
        return this.options.maxScreenshots;
    }

    public async render(options?: MemoryRenderOptions): Promise<MultiMediaMessage[]> {
        // Check if we need to batch drop (reset freeze mask to trigger limit-based culling)
        if (this.options.promptCaching && this.freezeMask) {
            const visibleScreenshots = this.countVisibleScreenshots(this.freezeMask);
            if (visibleScreenshots > this.options.maxScreenshots) {
                // Trigger batch drop by resetting freeze mask
                // Masking will then apply minScreenshots limit
                this.freezeMask = undefined;
            }
        }

        const mask = await maskObservations(this.observations, this.freezeMask);
        const visibleObservations = applyMask(this.observations, mask);

        let messages: MultiMediaMessage[] = [];
        for (const { observation } of visibleObservations) {
            const message = await observation.render({
                prefix: observation.source.startsWith('action:taken') || observation.source.startsWith('thought') ?
                    [`[${new Date(observation.timestamp).toTimeString().split(' ')[0]}]: `] : []
            });
            messages.push(message);
        }

        // Freeze current visibility for next render (cache control is handled in BAML via loop.last)
        if (this.options.promptCaching) {
            this.freezeMask = mask;
        }

        return messages;
    }

    private countVisibleScreenshots(mask: boolean[]): number {
        let count = 0;
        for (let i = 0; i < mask.length && i < this.observations.length; i++) {
            if (mask[i] && this.observations[i].retention?.type === 'screenshot') {
                count++;
            }
        }
        return count;
    }

    public async simpleRender(): Promise<(BamlImage | string)[]> {
        // Render with no filtering, no masking, no cache control
        //let messages: MultiMediaMessage[] = [];
        let content: (BamlImage | string)[] = [];
        for (const observation of this.observations) {
            const message = await observation.render({
                prefix: observation.source.startsWith('action:taken') || observation.source.startsWith('thought') ?
                    [`[${new Date(observation.timestamp).toTimeString().split(' ')[0]}]: `] : []
            });
            // ignore message stuff, just push content
            content = [...content, ...message.content];
        }
        return content;
    }

    public isEmpty(): boolean {
        return this.observations.length === 0;
    }

    public recordThought(content: string): void {
        this.observations.push(
            Observation.fromThought(content, { type: 'thought', limit: this.options.thoughtLimit })
        );
        //this.events.emit('thought', content);
    }

    public recordObservation(obs: Observation): void {
        this.observations.push(obs);
    }

    public getLastThoughtMessage(): string | null {
        for (let i = this.observations.length - 1; i >= 0; i--) {
            const obs = this.observations[i];
            // toString() is a little funky here, or the idea that thought might not just be text
            if (obs.source.startsWith('thought')) return obs.toString();
        }
        return null;
    }

    public async toJSON(): Promise<SerializedAgentMemory> {
        const observations = [];
        for (const observation of this.observations) {
            observations.push({
                source: observation.source,
                role: observation.role,
                timestamp: observation.timestamp,
                data: await observableDataToJson(observation.content),
                options: observation.retention,
            });
        }
        return {
            // TODO: include other options as well
            ...(this.options.instructions ? { instructions: this.options.instructions } : {}),
            observations: observations
        };
    }

    // TODO: turn into class static method / rework cons
    public async loadJSON(data: SerializedAgentMemory) {
        //jsonToObservableData(data);
        const observations = [];
        for (const observation of data.observations) {
            observations.push(new Observation(
                observation.source,
                observation.role,
                await jsonToObservableData(observation.data),
                observation.options,
                observation.timestamp
            ));
            
        }
        // nvm
        //this.instructions = this.instructions;

        this.observations = observations;


        // return {
        //     ...(this.instructions ? { instructions: this.instructions } : {}),
        //     observations: observations
        // };
    }
}
