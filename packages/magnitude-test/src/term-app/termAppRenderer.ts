import React from 'react';
import { render } from 'ink';
import { TestRenderer } from '@/renderer';
import { RegisteredTest, MagnitudeConfig } from '@/discovery/types';
import { TestState } from '@/runner/state';
import { AllTestStates } from './types';
import { InkApp, StateBridge } from './components/InkApp';
import { describeModel } from '@/util';

export class TermAppRenderer implements TestRenderer {
    private magnitudeConfig: MagnitudeConfig;
    private initialTests: RegisteredTest[];
    private firstModelReportedInUI = false;

    private bridge: StateBridge | null = null;
    private testStates: AllTestStates = {};
    private inkInstance: ReturnType<typeof render> | null = null;

    constructor(config: MagnitudeConfig, initialTests: RegisteredTest[]) {
        this.magnitudeConfig = config;
        this.initialTests = [...initialTests];
    }

    public start(): void {
        process.stdout.write('\n');

        // Initialize all tests as pending
        for (const test of this.initialTests) {
            this.testStates[test.id] = {
                status: 'pending',
                stepsAndChecks: [],
                modelUsage: [],
            };
        }

        this.firstModelReportedInUI = false;

        this.inkInstance = render(
            React.createElement(InkApp, {
                tests: this.initialTests,
                config: this.magnitudeConfig,
                initialStates: { ...this.testStates },
                onReady: (bridge: StateBridge) => {
                    this.bridge = bridge;
                    // Flush any updates that arrived before mount
                    bridge.update({ ...this.testStates });
                },
            }),
            { exitOnCtrlC: false }
        );
    }

    public onTestStateUpdated(test: RegisteredTest, newState: TestState): void {
        const existing = this.testStates[test.id] || {};
        this.testStates[test.id] = {
            ...existing,
            ...newState,
            startedAt: newState.startedAt || existing.startedAt,
        };

        // Detect first model for the UI title bar
        if (!this.firstModelReportedInUI &&
            newState.modelUsage &&
            newState.modelUsage.length > 0) {
            const firstModelEntry = newState.modelUsage[0];
            if (firstModelEntry?.llm) {
                const modelName = describeModel(firstModelEntry.llm);
                if (modelName) {
                    this.bridge?.setModel(modelName);
                    this.firstModelReportedInUI = true;
                }
            }
        }

        // If bridge not ready yet, testStates is still buffered — flushed on mount
        this.bridge?.update({ ...this.testStates });
    }

    public stop(): void {
        this.inkInstance?.unmount();
        process.stderr.write('\n');
    }
}
