/**
 * "Intents" are natural language descriptors that align 1:1 with executable web actions.
 * Micro converts intents into web actions.
 */

import { SwitchTabWebAction } from "magnitude-harness";

export interface Action {
    variant: string,
    [key: string]: any
}

export type ActionIntent = ClickIntent | TypeIntent | ScrollIntent | SwitchTabIntent; // really we want switch tab to be an option only if >1 tab
export type Intent = ActionIntent | CheckIntent;
//export type Recipe = Ingredient[];

export interface ClickIntent {
    variant: 'click';
    target: string;
}

export interface TypeIntent {
    variant: 'type';
    target: string;
    content: string;
}

export interface ScrollIntent {
    variant: 'scroll';
    target: string;
    deltaX: number;
    deltaY: number;
}

// For cases where no translation is needed from intent to action, they are the same
export type SwitchTabIntent = SwitchTabWebAction;

// export interface SwitchTabIntent {
//     variant: 'tab';
//     index: number;
// }

export interface CheckIntent {
    variant: 'check';
    //description: string;
    checks: string[];
}
