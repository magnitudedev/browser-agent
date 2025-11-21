import { MultiMediaContentPart } from "@/memory/rendering";
import { ModelHarness, ModelHarnessEvents } from "./modelHarness";
import { allBrowserAgentRoles, BrowserAgentRole, LLMClient } from "./types";
import { ActionDefinition } from "@/actions";
import { AgentContext } from "./baml_client";
import { Action } from "@/actions/types";
import { Image } from '@/memory/image';
import EventEmitter from "eventemitter3";
import z from "zod";


export class MultiModelHarness {
    /**
     * Delegates model responsibilites to different LLMs and consolidates their usage
     */
    // Roles may reference the same harness
    private roles: Record<BrowserAgentRole, ModelHarness> = {} as Record<BrowserAgentRole, ModelHarness>;
    private uniqueModels: ModelHarness[] = [];

    public readonly events: EventEmitter<ModelHarnessEvents> = new EventEmitter();

    constructor(clients: LLMClient[]) {
        // Sort by specificity (from least specific to most specific)
        const sortedClients = clients.toSorted((a, b) => (b.roles ? b.roles.length : 9999) - (a.roles ? a.roles.length : 9999));
        for (const client of sortedClients) {
            const harness = new ModelHarness({ llm: client });
            this.uniqueModels.push(harness);
            if (client.roles) {
                for (const role of client.roles) {
                    this.roles[role] = harness;
                }
            } else {
                for (const role of allBrowserAgentRoles) {
                    this.roles[role] = harness;
                }
            }

            // Forward token usage events upward
            harness.events.on('tokensUsed', (usage) => { this.events.emit('tokensUsed', usage) }, this);
        }
    }

    async setup() {
        await Promise.all(this.uniqueModels.map(model => model.setup()));
    }

    describe(): string {
        // for now - describe least specific model
        return this.uniqueModels[0].describeModel();
    }
    
    // TODO: generalize responsibility delegation
    async partialAct<T>(
        context: AgentContext,
        task: string,
        data: MultiMediaContentPart[],
        actionVocabulary: ActionDefinition<T>[]
    ): Promise<{ reasoning: string, actions: Action[] }> {
        return await this.roles['act'].partialAct(context, task, data, actionVocabulary);
    }

    async extract<T extends z.Schema>(instructions: string, schema: T, screenshot: Image, domContent: string): Promise<z.infer<T>> {
        return await this.roles['extract'].extract(instructions, schema, screenshot, domContent);
    }

    async query<T extends z.Schema>(context: AgentContext, query: string, schema: T): Promise<z.infer<T>> {
        return await this.roles['query'].query(context, query, schema);
    }

    async ground<T>(screenshot: Image, actions: Action[], actionVocabulary: ActionDefinition<T>[]): Promise<Action[]> {
        return await this.roles['ground'].ground(screenshot, actions, actionVocabulary);
    }

    get numUniqueModels() {
        return this.uniqueModels.length;
    }
}