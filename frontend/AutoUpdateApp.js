import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    Text,
    Button,
    useBase,
    TablePickerSynced,
    Loader
} from '@airtable/blocks/ui';
import { useGlobalConfig } from '@airtable/blocks/ui';
import Papa from 'papaparse';
import { formatRowForAirtable } from './helpers/formatRow';
import { parseCustomDate, getLatestEnrolledTimeFromFirstRow, getWeekNumberFromDate, extractDateAndDay} from './helpers/dateUtils';
import { splitFullName, studentExists, extractWeekFromClass, findParticipantRecordId } from './helpers/studentUtils';
import { MissingStudentBanner, FileDropZone, ImportActions, BackgroundSet} from './components/UIChunks'

function AutoUpdateApp({onNavigate, externalCsvDataForSchedule}) {
    // Airtable Block CLi hooks & declaration
    const base = useBase();
    const table = base.getTableByNameIfExists("Enrollsy Import");
    const formUrl = `https://airtable.com/appphAT0hdIvIuCsL/pagJLHpFMpnQSpWT1/form`;

    // React hooks declaration
    const [csvData, setCsvData] = useState([]);
    const [filename, setFilename] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [missingStudent, setMissingStudent] = useState(null);
    const [checkBeforeAdd, setCheckBeforeAdd] = useState(true);
    const [addedRecordsSummary, setAddedRecordsSummary] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef();

    // React Event handlers
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

    // Event Listeners for User interactions
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

    // Event handler for csv file cleaning
    useEffect(() => {
        if (!externalCsvDataForSchedule) return;
    
        setFilename(externalCsvDataForSchedule.name);
    
        Papa.parse(externalCsvDataForSchedule, {
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
    }, [externalCsvDataForSchedule]);
    
    // Function to covert the cleaned csv file data into object
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

    /* Main function for handling import:
    1. Find the corresponding student records in the basic info pool based on the csv data
    2. Create new records/update existing records for the summer camp program
    3. Based on the nature of the enrollment (Core Time/Extended Care), update the student records differently
    4. Print out a summary to user
    */
    const handleStartImport = async () => {
        setIsLoading(true);
        const summaryList = [];
        try {
            if (!table) return;
            const airtableFields = table.fields;
            const latestEnrolled = await getLatestEnrolledTimeFromFirstRow(table);
            const studentTable = base.getTableByNameIfExists('Student Basic Info');

            const rowsToImport = csvData.filter(row => {
                const parsed = parseCustomDate(row['Enrolled']);
                // console.log(parsed);
                return parsed && (!latestEnrolled || parsed > latestEnrolled);
            });

            // Step 1: Check that all students exist before inserting anything
            for (let row of rowsToImport) {
                const { first, last } = splitFullName(row['Student']);
                console.log(first + last);

                const exists = await studentExists(first, last, studentTable);

                if (!exists) {
                    setMissingStudent({ first, last });
                    alert(`Student "${first} ${last}" not found.\nYou can use the 'Add Student' page to create their record first.`);
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
            

            // First pass: Handle all "Core Time" rows
            for (let row of rowsToImport) {
                if (!row['Student']) continue;
                const classText = row['Class'] || '';
                const weekName = extractWeekFromClass(classText);

                if (weekName && classText.includes('Core Time')) {
                    const { first, last } = splitFullName(row['Student']);
                    const weekOption = weekOptions.find(opt => opt.name === weekName);

                    if (!weekOption) {
                        console.warn(`Week choice "${weekName}" not found in Week# field`);
                        continue;
                    }

                    const participantId = await findParticipantRecordId(first, last, participantTable);
                    if (!participantId) {
                        console.warn(`No matching participant for ${first} ${last}`);
                        continue;
                    }

                    // Check if entry already exists
                    const exists = checkBeforeAdd && [...participantsWithWeeks.records].some(
                        r =>
                            r.getCellValue("First Name")?.trim() === first &&
                            r.getCellValue("Last Name")?.trim() === last &&
                            r.getCellValue("Week#")?.name === weekName
                    );

                    if (exists) {
                        console.log(`Core Time already exists for ${first} ${last} in ${weekName}`);
                        alert(`Core Time already exists for ${first} ${last} in ${weekName}`);
                        continue;
                    }

                    await weekTable.createRecordAsync({
                        'First Name': first,
                        'Last Name': last,
                        'Week#': { name: weekOption.name },
                        'Link to All Par with Weeks': [{ id: participantId }],
                    });

                    summaryList.push({
                        first,
                        last,
                        weeks: [weekOption.name],
                        extended: false
                    });
                    
                }
            }

            // Second pass: Handle all "Extended Care" updates
            for (let row of rowsToImport) {
                const classText = row['Class'] || '';
                if (!classText.includes('Extended Care')) continue;

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
                    console.warn(`No matching participant record for ${first} ${last} in ${weekLabel}`);
                    continue;
                }

                await weekTable.updateRecordAsync(match.id, {
                    [dayOfWeek]: { name: "8:30-6:00" }
                });

                const existing = summaryList.find(s => s.first === first && s.last === last);
                if (existing) {
                    existing.extended = true;
                } else {
                    summaryList.push({
                        first,
                        last,
                        weeks: [],
                        extended: true
                    });
                }
                setAddedRecordsSummary(summaryList);
            }
            
        } catch (error) {
            console.error("Error during import:", error);
            alert("An error occurred. Check the console for details.");
        } finally {
            setIsLoading(false); 
            alert(`Updated ${summaryList.length} records into database`);
        }
    };

    // Reset all uploaded file and referred file
    const resetUpload = () => {
        setCsvData([]);
        setFilename('');
        inputRef.current.value = '';
    };

    
    // UI Layout render in JSX
    return (
        <BackgroundSet>
            <Box padding={3}>
                <Button onClick={() => onNavigate('home')} marginBottom={3}>
                    ← Back
                </Button>

                <Text fontWeight="bold" fontSize={4} marginBottom={4} lineHeight={1.6}>
                    Upload Enrollsy .csv file below to update student schedule
                </Text>

                {missingStudent && (
                    <MissingStudentBanner
                        student={missingStudent}
                        formUrl={formUrl}
                        onClose={() => setMissingStudent(null)}
                        onNavigate={onNavigate}
                    />
                )}

                <Box marginBottom={3}>
                    <label>
                        <input
                            type="checkbox"
                            checked={checkBeforeAdd}
                            onChange={() => setCheckBeforeAdd(!checkBeforeAdd)}
                            style={{ marginRight: '8px' }}
                        />
                        Check & Update Weeks (Slower but recommended)
                    </label>
                </Box>

                {isLoading && (
                    <Box marginTop={3} marginBottom={3} display="flex" justifyContent="center">
                        <Loader scale={0.5} />
                    </Box>
                )}

                <FileDropZone
                    isDragging={isDragging}
                    onClick={() => inputRef.current?.click()}
                />

                <input
                    ref={inputRef}
                    type="file"
                    accept=".csv"
                    style={{ display: 'none' }}
                    onChange={(e) => handleFiles(e.target.files)}
                />


                {filename && (
                    <ImportActions
                        filename={filename}
                        rowCount={csvData.length}
                        onImport={handleStartImport}
                        onReset={resetUpload}
                    />
                )}
                
                {addedRecordsSummary.length > 0 && (
                    <Box marginTop={3} padding={3} border="default" backgroundColor="#f8f9fa">
                        <Text fontWeight="bold">Import Summary:</Text>
                        {addedRecordsSummary.map((record, index) => (
                            <Box key={index} marginTop={1}>
                                <Text>
                                    {record.first} {record.last}
                                    {record.weeks.length > 0 && ` added to ${record.weeks.join(', ')}`}
                                    {record.extended && ` (Extended Care added)`}
                                </Text>
                            </Box>
                        ))}
                    </Box>
                )}

            </Box>
        </BackgroundSet>
    );
    
}

export default AutoUpdateApp;