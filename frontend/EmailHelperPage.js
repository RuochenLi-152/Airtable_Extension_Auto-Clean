/* Add health form email address generator

2 options - all parents emails or health form needs update emails
Then prompt to choose field
Then generate the string and add a copy button */

import React from 'react';
import { Box, Text, Button } from '@airtable/blocks/ui';
import { BackgroundSet } from './components/UIChunks';

function EmailHelperPage({ onNavigate }) {
    return (
        <BackgroundSet>
            <Button
                margin={3}
                variant="default"
                onClick={() => onNavigate('home')}
            >
                ← Back
            </Button>

            <Box padding={3}>
                <Text fontWeight="bold" fontSize={4} marginBottom={4}>
                    Email Helper Tools
                </Text>

                <Text>This page will help you draft and manage emails related to students or programs.</Text>
            </Box>
        </BackgroundSet>
    );
}

export default EmailHelperPage;