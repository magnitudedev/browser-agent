import React from 'react';
import { Box, Text } from 'ink';
import { RegisteredTest } from '@/discovery/types';
import { TestFailure } from '@/runner/state';
import { AllTestStates } from '../types';
import { calculateCost } from '@/util';
import { FailureDisplay } from './FailureDisplay';

interface SummaryProps {
    testStates: AllTestStates;
    registeredTests: RegisteredTest[];
    model: string;
}

export function Summary({ testStates, registeredTests, model }: SummaryProps) {
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const statusCounts = { pending: 0, running: 0, passed: 0, failed: 0, cancelled: 0 };
    const failuresWithContext: Array<{ filepath: string; groupName?: string; testTitle: string; failure: TestFailure }> = [];

    const testContextMap = new Map<string, { filepath: string; groupName?: string; testTitle: string }>();
    for (const test of registeredTests) {
        testContextMap.set(test.id, { filepath: test.filepath, groupName: test.group, testTitle: test.title });
    }

    for (const [testId, state] of Object.entries(testStates)) {
        statusCounts[state.status]++;
        if (state.modelUsage.length > 0) {
            totalInputTokens += state.modelUsage[0].inputTokens;
            totalOutputTokens += state.modelUsage[0].outputTokens;
        }
        if (state.failure) {
            const context = testContextMap.get(testId);
            failuresWithContext.push({
                filepath: context?.filepath ?? 'Unknown File',
                groupName: context?.groupName,
                testTitle: context?.testTitle ?? 'Unknown Test',
                failure: state.failure,
            });
        }
    }

    let costDescription = '';
    const cost = calculateCost(model, totalInputTokens, totalOutputTokens);
    if (cost !== undefined) {
        costDescription = ` ($${cost.toFixed(2)})`;
    }

    return (
        <Box flexDirection="column">
            <Box gap={2}>
                {statusCounts.passed > 0 && <Text color="green">{'✓ '}{statusCounts.passed} passed</Text>}
                {statusCounts.failed > 0 && <Text color="red">{'✗ '}{statusCounts.failed} failed</Text>}
                {statusCounts.running > 0 && <Text color="blueBright">{'▷ '}{statusCounts.running} running</Text>}
                {statusCounts.pending > 0 && <Text dimColor>{'◌ '}{statusCounts.pending} pending</Text>}
                {statusCounts.cancelled > 0 && <Text dimColor>{'⊘ '}{statusCounts.cancelled} cancelled</Text>}
                <Text dimColor>tokens: {totalInputTokens} in, {totalOutputTokens} out{costDescription}</Text>
            </Box>

            {failuresWithContext.length > 0 && (
                <Box flexDirection="column" marginTop={1}>
                    <Text dimColor>Failures:</Text>
                    {failuresWithContext.map((f, i) => (
                        <Box key={i} flexDirection="column" marginLeft={2}>
                            <Text dimColor>{f.filepath}{f.groupName ? ` > ${f.groupName}` : ''} {'> '}{f.testTitle}</Text>
                            <FailureDisplay failure={f.failure} />
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
}
