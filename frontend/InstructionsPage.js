import React from 'react';
import { Box, Text, Button } from '@airtable/blocks/ui';

export function InstructionsPage({ onNavigate }) {
    return (
        <Box padding={4}>
            <Button marginBottom={3} onClick={() => onNavigate('home')}>
                ← Back
            </Button>

            <Text fontSize={5} fontWeight="bold" marginBottom={3}>
                How to Use This Extension?
            </Text>

            <Text marginBottom={2}>
                1. XXX
            </Text>
            <Text marginBottom={2}>
                2. XXX
            </Text>
            <Text marginBottom={2}>
                3. XXX
            </Text>
            <Text marginBottom={2}>
                4. XXX
            </Text>
        </Box>
    );
}
