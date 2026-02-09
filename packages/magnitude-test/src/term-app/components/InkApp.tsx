import React, { useState, useEffect } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { RegisteredTest, MagnitudeConfig } from '@/discovery/types';
import { AllTestStates } from '../types';
import { MAX_APP_WIDTH } from '../constants';
import { TitleBar } from './TitleBar';
import { TestDisplay } from './TestDisplay';
import { TestGroupDisplay } from './TestGroupDisplay';
import { Summary } from './Summary';

export interface StateBridge {
    update: (states: AllTestStates) => void;
    setModel: (model: string) => void;
}

interface InkAppProps {
    tests: RegisteredTest[];
    config: MagnitudeConfig;
    initialStates: AllTestStates;
    onReady: (bridge: StateBridge) => void;
}

function groupRegisteredTestsForDisplay(tests: RegisteredTest[]):
    Record<string, { ungrouped: RegisteredTest[]; groups: Record<string, RegisteredTest[]> }> {
    const files: Record<string, { ungrouped: RegisteredTest[]; groups: Record<string, RegisteredTest[]> }> = {};
    for (const test of tests) {
        if (!files[test.filepath]) {
            files[test.filepath] = { ungrouped: [], groups: {} };
        }
        if (test.group) {
            if (!files[test.filepath].groups[test.group]) {
                files[test.filepath].groups[test.group] = [];
            }
            files[test.filepath].groups[test.group].push(test);
        } else {
            files[test.filepath].ungrouped.push(test);
        }
    }
    return files;
}

export function InkApp({ tests, config, initialStates, onReady }: InkAppProps) {
    const [testStates, setTestStates] = useState<AllTestStates>(initialStates);
    const [model, setModel] = useState('');
    const { exit } = useApp();
    const { stdout } = useStdout();

    const showActions = config.display?.showActions ?? true;
    const showThoughts = config.display?.showThoughts ?? false;

    useEffect(() => {
        onReady({ update: setTestStates, setModel });
    }, []);

    useInput((_input, key) => {
        if (key.ctrl && _input === 'c') {
            exit();
        }
    });

    const width = Math.min(stdout?.columns ?? MAX_APP_WIDTH, MAX_APP_WIDTH);
    const grouped = groupRegisteredTestsForDisplay(tests);

    return (
        <Box flexDirection="column" width={width}>
            <TitleBar model={model} />
            <Box flexDirection="column" paddingX={1}>
                {Object.entries(grouped).map(([filepath, { ungrouped, groups }]) => (
                    <Box key={filepath} flexDirection="column">
                        <Text bold color="blueBright">{'☰ '}{filepath}</Text>

                        {ungrouped.map(test => {
                            const state = testStates[test.id];
                            if (!state) return null;
                            return (
                                <Box key={test.id} marginLeft={2}>
                                    <TestDisplay
                                        title={test.title}
                                        state={state}
                                        showActions={showActions}
                                        showThoughts={showThoughts}
                                    />
                                </Box>
                            );
                        })}

                        {Object.entries(groups).map(([groupName, groupTests]) => (
                            <TestGroupDisplay key={groupName} groupName={groupName}>
                                {groupTests.map(test => {
                                    const state = testStates[test.id];
                                    if (!state) return null;
                                    return (
                                        <TestDisplay
                                            key={test.id}
                                            title={test.title}
                                            state={state}
                                            showActions={showActions}
                                            showThoughts={showThoughts}
                                        />
                                    );
                                })}
                            </TestGroupDisplay>
                        ))}
                    </Box>
                ))}

                <Box marginTop={1}>
                    <Summary testStates={testStates} registeredTests={tests} model={model} />
                </Box>
            </Box>
        </Box>
    );
}
