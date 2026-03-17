import React from 'react';
import { Text } from 'ink';
import { TestFailure } from '@/runner/state';

interface FailureDisplayProps {
    failure: TestFailure;
}

export function FailureDisplay({ failure }: FailureDisplayProps) {
    return (
        <Text color="red">{'↳ '}{failure.message ?? 'Unknown error details'}</Text>
    );
}
