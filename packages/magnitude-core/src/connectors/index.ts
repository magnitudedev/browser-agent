import { ActionDefinition } from '@/actions';
import { Observation } from '@/memory/observation';

export interface AgentConnector {
    // Unique connector ID (required)
    id: string;
    // Event handlers (optional)
    onStart?(): Promise<void>;
    onStop?(): Promise<void>;
    // Action space (optional)
    getActionSpace?(): ActionDefinition<any>[];
    // State retrieval (WIP)
    //viewState?(): Promise<Observation>;
    // Observation retrieval (WIP)
    collectObservations?(): Promise<Observation[]>;
    // TODO: unify ^ prob return ObservableData from both viewState/collectObservations? or union/option of either
    getInstructions?(): Promise<void | string>;
    runActionBatch?<T>(run: () => Promise<T>): Promise<T>;
}

//export { BrowserConnector, BrowserConnectorOptions } from './browserConnector';
