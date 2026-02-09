import React from 'react';
import { Box, Text, Spacer } from 'ink';
import { VERSION } from '@/version';

interface TitleBarProps {
    model: string;
}

export function TitleBar({ model }: TitleBarProps) {
    return (
        <Box paddingX={1}>
            <Text bold color="blueBright">Magnitude v{VERSION}</Text>
            <Spacer />
            <Text dimColor>{model}</Text>
        </Box>
    );
}
