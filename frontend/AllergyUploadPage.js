/* ALERT - PAGE NOT FINISHED */
import React, { useState, useRef, useEffect } from 'react';
import { Box, Text, Button, useBase } from '@airtable/blocks/ui';
import Papa from 'papaparse';
import { FileDropZone, ImportActions } from './components/UIChunks';

function AllergyUploadPage({ onNavigate }) {
    const base = useBase();
    const [csvData, setCsvData] = useState([]);
    const [filename, setFilename] = useState('');
    const [isDragging, setIsDragging] = useState(false);
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

    const handleFiles = (files) => {
        const file = files[0];
        if (!file || !file.name.endsWith('.csv')) return;

        setFilename(file.name);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: function (results) {
                setCsvData(results.data);
                console.log("Loaded allergy CSV:", results.data);
            },
        });
    };

    const resetUpload = () => {
        setCsvData([]);
        setFilename('');
        inputRef.current.value = '';
    };

    const handleUpload = async () => {
        resetUpload();
    };

    return (
        <Box padding={3}>
            <Text fontWeight="bold" fontSize={4} marginBottom={4}>
                Upload Allergy Info .csv File
            </Text>

            <Button
                marginBottom={3}
                variant="default"
                onClick={() => onNavigate('home')}
            >
                ← Back
            </Button>

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
                    onImport={handleUpload}
                    onReset={resetUpload}
                />
            )}
        </Box>
    );
}

export default AllergyUploadPage;
