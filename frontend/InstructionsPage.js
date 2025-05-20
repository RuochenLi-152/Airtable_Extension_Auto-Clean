import React from 'react';
import { Box, Text, Button } from '@airtable/blocks/ui';

export function InstructionsPage({ onNavigate }) {
    return (
        <Box padding={4}>
            <Button marginBottom={4} onClick={() => onNavigate('home')}>
                ← Back
            </Button>

            <Text fontSize={5} fontWeight="bold" marginBottom={3}>
                How to Use This Extension?
            </Text>

            <Text marginBottom={2}>
                1. Download the csv file from Enrollsy, under "Students" tab with proper view
            </Text>

            <Text marginBottom={2}>
                2. Click into "Add Students" page, drag or drop the csv file into the box to automatically detect and create new students that are not recorded. 
                Records are stored in the "Student Basic Info" table
            </Text>

            <Text marginBottom={2}>
                3. Click into "Update Schedule" page, drag or drop the csv file into the box to automatically detect and update students' schedule change from the uploaded file.
                Records are stored in the "All Participants with Weeks" & "Participants by Week" table
            </Text>
            <Text marginBottom={2}>
                4. After finish, a summary will be generated under the upload box, from where you can check if the records have been updated/added as expected.
            </Text>
            <Text marginBottom={2} fontWeight={'bold'}>
            If you encounter any errors or unexpected behavior, please note that some field and table names in this extension are hard-coded for ease of use. Feel free to ask me or send an email for support or customization.
            </Text>
            <Text marginTop={4} fontSize={1} color="gray">
                Created by Ruochen Li, 2025
            </Text>
        </Box>
    );
}
