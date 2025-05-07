import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    Text,
    Button,
    useBase,
    TablePickerSynced
} from '@airtable/blocks/ui';
import { useGlobalConfig } from '@airtable/blocks/ui';
import Papa from 'papaparse';
import { formatRowForAirtable } from './helpers/formatRow';
import { parseCustomDate, getLatestEnrolledTimeFromFirstRow, getWeekNumberFromDate, extractDateAndDay} from './helpers/dateUtils';
import { splitFullName, studentExists, extractWeekFromClass, findParticipantRecordId } from './helpers/studentUtils';

function AutoUpdateApp() {
    const base = useBase();
    const globalConfig = useGlobalConfig();
    const selectedTableId = globalConfig.get("targetTable");
    const table = base.getTableByIdIfExists(selectedTableId);
    const formUrl = `https://airtable.com/appphAT0hdIvIuCsL/pagJLHpFMpnQSpWT1/form`;

    const [csvData, setCsvData] = useState([]);
    const [filename, setFilename] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [missingStudent, setMissingStudent] = useState(null);
    const inputRef = useRef();

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files?.length > 0) handleFiles(e.dataTransfer.files);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    useEffect(() => {
        window.addEventListener('dragover', handleDragOver);
        window.addEventListener('drop', handleDrop);
        window.addEventListener('dragleave', handleDragLeave);
        return () => {
            window.removeEventListener('dragover', handleDragOver);
            window.removeEventListener('drop', handleDrop);
            window.removeEventListener('dragleave', handleDragLeave);
        };
    }, []);

    const tablePicker = (
        <Box marginBottom={3}>
            <Text fontWeight="bold">Target Table:</Text>
            <TablePickerSynced globalConfigKey="targetTable" />
        </Box>
    );

    if (table && table.name.trim() !== "Enrollsy Import") {
        return (
            <Box padding={3}>
                <Text fontWeight="bold" marginBottom={2}>
                    Upload CSV to Auto-Clean for: {base.name}
                </Text>
                {tablePicker}
                <Text color="red" marginTop={2}>⚠️ Please select the "Enrollsy Import" table to continue.</Text>
            </Box>
        );
    }

    const handleFiles = (files) => {
        const file = files[0];
        if (!file || !file.name.endsWith('.csv')) return;

        setFilename(file.name);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: function (results) {
                const cleanedData = [];
                let lastStudent = '';
                let lastEnrolled = '';

                for (let row of results.data) {
                    const currentStudent = row['Student']?.trim();
                    if (currentStudent) lastStudent = currentStudent;
                    else row['Student'] = lastStudent;

                    const currentEnrolled = row['Enrolled']?.trim();
                    if (currentEnrolled) lastEnrolled = currentEnrolled;
                    else row['Enrolled'] = lastEnrolled;

                    if (row['Student']) cleanedData.push(row);
                }

                setCsvData(cleanedData);
            },
        });
    };

    const handleStartImport = async () => {
        if (!table) return;
        const airtableFields = table.fields;
        const latestEnrolled = await getLatestEnrolledTimeFromFirstRow(table);
        const studentTable = base.getTableByNameIfExists('Student Basic Info');

        const rowsToImport = csvData.filter(row => {
            const parsed = parseCustomDate(row['Enrolled']);
            return parsed && (!latestEnrolled || parsed > latestEnrolled);
        });

    // Step 1: Check that all students exist before inserting anything
    for (let row of rowsToImport) {
        const { first, last } = splitFullName(row['Student']);

        const exists = await studentExists(first, last, studentTable);

        if (!exists) {
            setMissingStudent({ first, last });
            alert(`⚠️ Student "${first} ${last}" not found.\nPlease go to Forms and create their record first.`);
            return;
        }
    }

    // Step 2: If all pass, proceed with import
    for (let row of rowsToImport) {
        const formatted = formatRowForAirtable(row, airtableFields);
        await table.createRecordAsync(formatted);
    }

    //Step 3: Update to the Participants with Weeks(all) table
    const weekTable = base.getTableByNameIfExists('Participants by week(All)');
    const weekField = weekTable.getField('Week#');
    const weekOptions = weekField.options.choices;
    const participantTable = base.getTableByNameIfExists('All Participants with Weeks');
    const participantsWithWeeks = await weekTable.selectRecordsAsync();
    

    for (let row of rowsToImport) {
        const classText = row['Class'] || '';
        const weekName = extractWeekFromClass(classText);

        if (weekName && classText.includes('Core Time')) {
            const { first, last } = splitFullName(row['Student']);
            const weekOption = weekOptions.find(opt => opt.name === weekName);

            if (!weekOption) {
                console.warn(`⚠️ Week choice "${weekName}" not found in Week# field`);
                continue;
            }

            const participantId = await findParticipantRecordId(first, last, participantTable);
            if (!participantId) {
                console.warn(`❌ No matching participant for ${first} ${last}`);
                continue; // skip creating if link target is missing
            }

            await weekTable.createRecordAsync({
                'First Name': first,
                'Last Name': last,
                'Week#': { name: weekOption.name },
                'Link to All Par with Weeks': [{ id: participantId }],
            });
        //  Step 3.1, if it's extended care, update the record for that specific day
        } else if (classText.includes('Extended Care')) {
            const { first, last } = splitFullName(row['Student']);
            const extracted = extractDateAndDay(classText);
            if (!extracted) continue;
    
            const { dayOfWeek, dateStr } = extracted;
            const weekNum = getWeekNumberFromDate(dateStr);
            const weekLabel = `Week ${weekNum}`;
    
            const match = [...participantsWithWeeks.records].find(r =>
                r.getCellValue("First Name")?.trim() === first &&
                r.getCellValue("Last Name")?.trim() === last &&
                r.getCellValue("Week#")?.name === weekLabel
            );
    
            if (!match) {
                console.warn(`⚠️ No matching participant record for ${first} ${last} in ${weekLabel}`);
                continue;
            }
    
            await weekTable.updateRecordAsync(match.id, {
                [dayOfWeek]: { name: "8:30-6:00" }
            });
        }
    }
    alert(`✅ Imported ${rowsToImport.length} rows into "${table.name}"`);
    };

    const resetUpload = () => {
        setCsvData([]);
        setFilename('');
        inputRef.current.value = '';
    };

    return (
        <Box padding={3}>
            <Text fontWeight="bold" marginBottom={4}>
                Upload Enrollsy .csv file below to auto update student records! 
            </Text>
    
            {tablePicker}
    
            {!table ? (
                <Text color="red" marginTop={2}>
                    ⚠️ No table selected.
                </Text>
            ) : table.name.trim() !== "Enrollsy Import" ? (
                <Text color="red" marginTop={2}>
                    ⚠️ Please select the "Enrollsy Import" table to continue.
                </Text>
            ) : (
                <>
                {missingStudent && (
                    <Box marginBottom={3} backgroundColor="#fff3cd" padding={3} borderRadius={4} border="thick" borderColor="yellow">
                        <Text color="orange" fontWeight="bold">
                            ⚠️ Student "{missingStudent.first} {missingStudent.last}" not found in the database.
                        </Text>
                        <Text>
                            Please create a record for this student before importing.
                        </Text>
                        <Box marginTop={2}>
                            <a
                                href={formUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    backgroundColor: '#ffc107',
                                    color: 'black',
                                    padding: '8px 12px',
                                    textDecoration: 'none',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                }}
                            >
                                ➕ Open Student Form
                            </a>
                        </Box>
                        <Button
                            variant="primary"
                            marginTop={3}
                            onClick={() => setMissingStudent(null)}
                        >
                            Done
                        </Button>
                    </Box>
                )}
                    <Box
                        height="200px"
                        border="thick"
                        borderStyle="dashed"
                        borderColor={isDragging ? 'blue' : 'lightGray'}
                        backgroundColor={isDragging ? '#e3f2fd' : 'white'}
                        borderRadius={6}
                        padding={4}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        textAlign="center"
                        cursor="pointer"
                        onClick={() => inputRef.current?.click()}
                    >
                        <Text>
                            {isDragging
                                ? '📥 Drop your CSV file here!'
                                : '📂 Drag & drop your CSV here, or click to browse'}
                        </Text>
                    </Box>
    
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".csv"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFiles(e.target.files)}
                    />
    
                    {filename && (
                        <Box marginTop={3}>
                            <Text>
                                📎 Loaded: {filename} ({csvData.length} rows)
                            </Text>
                            <Box marginTop={2} display="flex" gap={2}>
                                <Button
                                    variant="primary"
                                    onClick={handleStartImport}
                                    marginRight={3}
                                >
                                    Start Import
                                </Button>
                                <Button variant="danger" onClick={resetUpload}>
                                    Remove File
                                </Button>
                            </Box>
                        </Box>
                    )}
                </>
            )}
        </Box>
    );
    
}

export default AutoUpdateApp;