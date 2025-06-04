/* Add health form email address generator

2 options - all emails or health form needs update emails
if choose all emails - prompt user to choose a table, and then choose a field/fields to
if choose health form needs update - give user options to send emails to: 1. empty ones, 2. expired ones, 3. about to expire ones
Then generate the string and add a copy button */

import React, {useState} from 'react';
import { Box, Text, Button } from '@airtable/blocks/ui';
import { BackgroundSet } from './components/UIChunks';

function EmailHelperPage({ onNavigate }) {
    const [mode, setMode] = useState(null);
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
                <Text>This page will help you get all email addresses you need in one click.</Text>

                {!mode && (
                    <>
                    <Text> What would you like to do?</Text>
                    <Box display="flex" gap={3} marginBottom={3}>
                        <Button variant="primary" onClick={() => setMode('all')}>
                            Get All Emails
                        </Button>
                        <Button variant="primary" onClick={() => setMode('health')}>
                            Get Health Form Update emails
                        </Button>
                    </Box>
                    </>
                )}
                {mode === 'all' && (
                    <Box>
                        <Text><strong>All Emails TODO</strong></Text>
                    </Box>
                )}

                {mode === 'health' && (
                    <Box>
                        <Text><strong>Health Form Update TODO</strong></Text>
                    </Box>
                )}

            </Box>
        </BackgroundSet>
    );
}

export default EmailHelperPage;