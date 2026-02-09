import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { TestState, StepDescriptor, CheckDescriptor } from '@/runner/state';
import { testStatus, stepStatus, checkStatus } from '../indicators';
import { FailureDisplay } from './FailureDisplay';
import { formatDuration } from '../util';

interface TestDisplayProps {
    title: string;
    state: TestState;
    showActions: boolean;
    showThoughts: boolean;
}

export function TestDisplay({ title, state, showActions, showThoughts }: TestDisplayProps) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        if (state.status !== 'running' || !state.startedAt) {
            if (state.startedAt && state.doneAt) {
                setElapsed(state.doneAt - state.startedAt);
            }
            return;
        }
        setElapsed(Date.now() - state.startedAt);
        const interval = setInterval(() => {
            setElapsed(Date.now() - state.startedAt!);
        }, 100);
        return () => clearInterval(interval);
    }, [state.status, state.startedAt, state.doneAt]);

    const ts = testStatus(state.status);
    const timerText = state.status !== 'pending' ? ` [${formatDuration(elapsed)}]` : '';

    return (
        <Box flexDirection="column">
            <Box>
                {state.status === 'running' ? (
                    <Text color={ts.color}><Spinner type="dots" /></Text>
                ) : (
                    <Text color={ts.color}>{ts.char}</Text>
                )}
                <Text> {title}</Text>
                <Text dimColor>{timerText}</Text>
            </Box>

            {state.stepsAndChecks.map((item, i) => (
                <StepOrCheckDisplay
                    key={i}
                    item={item}
                    showActions={showActions}
                    showThoughts={showThoughts}
                />
            ))}

            {state.failure && (
                <Box marginLeft={2}>
                    <FailureDisplay failure={state.failure} />
                </Box>
            )}
        </Box>
    );
}

interface StepOrCheckDisplayProps {
    item: StepDescriptor | CheckDescriptor;
    showActions: boolean;
    showThoughts: boolean;
}

function StepOrCheckDisplay({ item, showActions, showThoughts }: StepOrCheckDisplayProps) {
    const s = item.variant === 'step' ? stepStatus(item.status) : checkStatus(item.status);

    const merged: Array<{ kind: 'action' | 'thought'; text: string; t: number }> = [];
    if (item.variant === 'step') {
        if (showActions) {
            for (const a of item.actions) {
                merged.push({ kind: 'action', text: a.pretty, t: a.time });
            }
        }
        if (showThoughts) {
            for (const th of item.thoughts) {
                merged.push({ kind: 'thought', text: th.text, t: th.time });
            }
        }
        merged.sort((a, b) => a.t === b.t ? (a.kind === 'thought' ? -1 : 1) : a.t - b.t);
    }

    return (
        <Box flexDirection="column" marginLeft={2}>
            <Box>
                <Text color={s.color}>{s.char}</Text>
                <Text> {item.description}</Text>
            </Box>
            {merged.map((m, i) => (
                <Box key={i} marginLeft={2}>
                    {m.kind === 'thought' ? (
                        <Text dimColor>{'💭 '}{m.text}</Text>
                    ) : (
                        <Text dimColor>{m.text}</Text>
                    )}
                </Box>
            ))}
        </Box>
    );
}
