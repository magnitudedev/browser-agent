import React from 'react';
import { Box, Text } from 'ink';

interface TestGroupDisplayProps {
    groupName: string;
    children: React.ReactNode;
}

export function TestGroupDisplay({ groupName, children }: TestGroupDisplayProps) {
    return (
        <Box flexDirection="column" marginLeft={2}>
            <Text bold color="blueBright">{'↳ '}{groupName}</Text>
            <Box flexDirection="column" marginLeft={2}>
                {children}
            </Box>
        </Box>
    );
}
