export class SheetsService {
    constructor() {
        this.spreadsheetId = null;
    }

    async authenticate() {
        try {
            return new Promise((resolve, reject) => {
                chrome.identity.getAuthToken({ 
                    interactive: true,
                    scopes: ['https://www.googleapis.com/auth/spreadsheets']
                }, (token) => {
                    if (chrome.runtime.lastError) {
                        console.error('Auth error:', chrome.runtime.lastError);
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    console.log('Authentication successful, token received');
                    resolve(token);
                });
            });
        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    }

    async createSpreadsheet(auditData) {
        try {
            const token = await this.authenticate();
            console.log('Got auth token, creating spreadsheet...');
            
            const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    properties: {
                        title: `NEU Course Plan - ${auditData?.studentInfo?.name || 'My Courses'}`,
                    },
                    sheets: [
                        { properties: { title: 'Course Schedule' } },
                        { properties: { title: 'Student Info' } },
                        { properties: { title: 'Requirements' } },
                        { properties: { title: 'Course History' } },
                        { properties: { title: 'Summary' } }
                    ]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Sheets API Error:', errorText);
                throw new Error(`Failed to create spreadsheet: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Spreadsheet created:', data);
            
            if (!data.spreadsheetId) {
                throw new Error('No spreadsheet ID in response');
            }

            this.spreadsheetId = data.spreadsheetId;
            
            console.log('Initializing sheets...');
            await Promise.all([
                this.initializeCourseSchedule(auditData),
                this.initializeStudentInfo(auditData),
                this.initializeRequirements(auditData),
                this.initializeCourseHistory(auditData)
            ]);

            return this.spreadsheetId;
        } catch (error) {
            console.error('Error in createSpreadsheet:', error);
            throw error;
        }
    }

    async initializeCourseSchedule(auditData) {
        try {
            const token = await this.authenticate();
            
            chrome.runtime.sendMessage({
                type: 'DEBUG_LOG',
                message: 'Initializing Course Schedule',
                data: {
                    hasCompletedCourses: !!auditData?.completedCourses,
                    completedCoursesCount: auditData?.completedCourses?.length || 0,
                    sampleCourse: auditData?.completedCourses?.[0] || null
                }
            });

            console.log('Initializing Course Schedule sheet with audit data:', auditData);
            
            if (auditData?.completedCourses) {
                console.log('Number of completed courses:', auditData.completedCourses.length);
                console.log('Sample course data:', auditData.completedCourses[0]);
            } else {
                console.warn('No completed courses found in auditData');
            }
            
            const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}?fields=sheets.properties`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to get sheet info: ${response.status} ${response.statusText}`);
            }

            const sheetData = await response.json();
            const courseScheduleSheet = sheetData.sheets[0];
            const sheetId = courseScheduleSheet.properties.sheetId;

            const totalYears = 5;
            const rowsPerYear = 15;
            const totalRows = totalYears * rowsPerYear + 15; 
            const coursesPerSemester = 8;

            const requests = [{
                updateSheetProperties: {
                    properties: {
                        sheetId: sheetId,
                        gridProperties: {
                            frozenRowCount: 1,
                            rowCount: totalRows,
                            columnCount: 4,
                            frozenColumnCount: 0
                        },
                        title: 'Course Schedule'
                    },
                    fields: 'gridProperties(frozenRowCount,rowCount,columnCount,frozenColumnCount),title'
                }
            }, {
                updateDimensionProperties: {
                    range: {
                        sheetId: sheetId,
                        dimension: 'COLUMNS',
                        startIndex: 0,
                        endIndex: 4
                    },
                    properties: {
                        pixelSize: 300  
                    },
                    fields: 'pixelSize'
                }
            }];

            requests.push({
                updateCells: {
                    range: {
                        sheetId: sheetId,
                        startRowIndex: 0,
                        endRowIndex: 1,
                        startColumnIndex: 0,
                        endColumnIndex: 4
                    },
                    rows: [{
                        values: [
                            { 
                                userEnteredValue: { stringValue: 'FALL' },
                                userEnteredFormat: {
                                    backgroundColor: { red: 0.05, green: 0.05, blue: 0.05 },
                                    textFormat: { 
                                        bold: true, 
                                        foregroundColor: { red: 1, green: 1, blue: 1 },
                                        fontSize: 12,
                                        fontFamily: "Arial"
                                    },
                                    horizontalAlignment: 'CENTER',
                                    verticalAlignment: 'MIDDLE',
                                    padding: { top: 8, bottom: 8 }
                                }
                            },
                            { 
                                userEnteredValue: { stringValue: 'SPRING' },
                                userEnteredFormat: {
                                    backgroundColor: { red: 0.05, green: 0.05, blue: 0.05 },
                                    textFormat: { 
                                        bold: true, 
                                        foregroundColor: { red: 1, green: 1, blue: 1 },
                                        fontSize: 12,
                                        fontFamily: "Arial"
                                    },
                                    horizontalAlignment: 'CENTER',
                                    verticalAlignment: 'MIDDLE',
                                    padding: { top: 8, bottom: 8 }
                                }
                            },
                            { 
                                userEnteredValue: { stringValue: 'SUMMER 1' },
                                userEnteredFormat: {
                                    backgroundColor: { red: 0.05, green: 0.05, blue: 0.05 },
                                    textFormat: { 
                                        bold: true, 
                                        foregroundColor: { red: 1, green: 1, blue: 1 },
                                        fontSize: 12,
                                        fontFamily: "Arial"
                                    },
                                    horizontalAlignment: 'CENTER',
                                    verticalAlignment: 'MIDDLE',
                                    padding: { top: 8, bottom: 8 }
                                }
                            },
                            { 
                                userEnteredValue: { stringValue: 'SUMMER 2' },
                                userEnteredFormat: {
                                    backgroundColor: { red: 0.05, green: 0.05, blue: 0.05 },
                                    textFormat: { 
                                        bold: true, 
                                        foregroundColor: { red: 1, green: 1, blue: 1 },
                                        fontSize: 12,
                                        fontFamily: "Arial"
                                    },
                                    horizontalAlignment: 'CENTER',
                                    verticalAlignment: 'MIDDLE',
                                    padding: { top: 8, bottom: 8 }
                                }
                            }
                        ]
                    }],
                    fields: '*'
                }
            });

            for (let year = 0; year < totalYears; year++) {
                const startRow = year * rowsPerYear + 1;
                
                requests.push({
                    updateCells: {
                        range: {
                            sheetId: sheetId,
                            startRowIndex: startRow,
                            endRowIndex: startRow + 1,
                            startColumnIndex: 0,
                            endColumnIndex: 4
                        },
                        rows: [{
                            values: [{
                                userEnteredValue: { stringValue: `YEAR ${year + 1}` },
                                userEnteredFormat: {
                                    backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 },
                                    textFormat: { 
                                        bold: true,
                                        fontSize: 11,
                                        fontFamily: "Arial"
                                    },
                                    horizontalAlignment: 'LEFT',
                                    verticalAlignment: 'MIDDLE',
                                    padding: { left: 8, right: 8, top: 4, bottom: 4 },
                                    borders: {
                                        top: { style: 'SOLID', width: 2, color: { red: 0.8, green: 0.8, blue: 0.8 } },
                                        bottom: { style: 'SOLID', width: 2, color: { red: 0.8, green: 0.8, blue: 0.8 } }
                                    }
                                }
                            }]
                        }],
                        fields: '*'
                    }
                });

                requests.push({
                    updateCells: {
                        range: {
                            sheetId: sheetId,
                            startRowIndex: startRow + 1,
                            endRowIndex: startRow + 2,
                            startColumnIndex: 0,
                            endColumnIndex: 4
                        },
                        rows: [{
                            values: Array(4).fill({
                                dataValidation: {
                                    condition: {
                                        type: 'ONE_OF_LIST',
                                        values: [
                                            { userEnteredValue: 'CLASSES' },
                                            { userEnteredValue: 'CO-OP (No Classes)' },
                                            { userEnteredValue: 'CO-OP (With Classes)' }
                                        ]
                                    },
                                    strict: true,
                                    showCustomUi: true
                                },
                                userEnteredValue: { stringValue: 'CLASSES' },
                                userEnteredFormat: {
                                    backgroundColor: { red: 0.97, green: 0.97, blue: 0.97 },
                                    textFormat: { 
                                        bold: true,
                                        fontSize: 10,
                                        fontFamily: "Arial"
                                    },
                                    horizontalAlignment: 'CENTER',
                                    verticalAlignment: 'MIDDLE',
                                    padding: { top: 4, bottom: 4 },
                                    borders: {
                                        bottom: { style: 'SOLID', width: 1, color: { red: 0.8, green: 0.8, blue: 0.8 } }
                                    }
                                }
                            })
                        }],
                        fields: '*'
                    }
                });

                for (let courseRow = 0; courseRow < coursesPerSemester; courseRow++) {
                    const rowIndex = startRow + courseRow + 2;
                    requests.push({
                        updateCells: {
                            range: {
                                sheetId: sheetId,
                                startRowIndex: rowIndex,
                                endRowIndex: rowIndex + 1,
                                startColumnIndex: 0,
                                endColumnIndex: 4
                            },
                            rows: [{
                                values: Array(4).fill({
                                    userEnteredFormat: {
                                        backgroundColor: courseRow % 2 === 0 
                                            ? { red: 0.98, green: 0.98, blue: 0.98 }
                                            : { red: 1, green: 1, blue: 1 },
                                        padding: { top: 4, right: 8, bottom: 4, left: 8 },
                                        verticalAlignment: 'MIDDLE',
                                        wrapStrategy: 'WRAP',
                                        textFormat: {
                                            fontFamily: "Arial",
                                            fontSize: 10
                                        }
                                    }
                                })
                            }],
                            fields: '*'
                        }
                    });
                }

                requests.push({
                    updateBorders: {
                        range: {
                            sheetId: sheetId,
                            startRowIndex: startRow,
                            endRowIndex: startRow + coursesPerSemester + 2,
                            startColumnIndex: 0,
                            endColumnIndex: 4
                        },
                        top: {
                            style: 'SOLID',
                            width: 2,
                            color: { red: 0.8, green: 0.8, blue: 0.8 }
                        },
                        bottom: {
                            style: 'SOLID',
                            width: 2,
                            color: { red: 0.8, green: 0.8, blue: 0.8 }
                        },
                        left: {
                            style: 'SOLID',
                            width: 2,
                            color: { red: 0.8, green: 0.8, blue: 0.8 }
                        },
                        right: {
                            style: 'SOLID',
                            width: 2,
                            color: { red: 0.8, green: 0.8, blue: 0.8 }
                        },
                        innerVertical: {
                            style: 'SOLID',
                            width: 1,
                            color: { red: 0.9, green: 0.9, blue: 0.9 }
                        }
                    }
                });

                requests.push({
                    updateBorders: {
                        range: {
                            sheetId: sheetId,
                            startRowIndex: startRow + 2,
                            endRowIndex: startRow + coursesPerSemester + 2,
                            startColumnIndex: 0,
                            endColumnIndex: 4
                        },
                        innerHorizontal: {
                            style: 'SOLID',
                            width: 1,
                            color: { red: 0.9, green: 0.9, blue: 0.9 }
                        }
                    }
                });
            }

            if (auditData?.completedCourses) {
                chrome.runtime.sendMessage({
                    type: 'DEBUG_LOG',
                    message: 'Processing completed courses',
                    data: {
                        courses: auditData.completedCourses
                    }
                });
                
                const coursesByYearAndTerm = {};
                
                const years = [...new Set(auditData.completedCourses
                    .map(course => {
                        chrome.runtime.sendMessage({
                            type: 'DEBUG_LOG',
                            message: `Processing course for year: ${course.code}`,
                            data: course
                        });
                        return course.termYear;
                    })
                    .filter(year => year))]
                    .sort();
                
                chrome.runtime.sendMessage({
                    type: 'DEBUG_LOG',
                    message: 'Found years',
                    data: { years }
                });

                years.forEach((year, index) => {
                    const relativeYear = index + 1;
                    coursesByYearAndTerm[relativeYear] = {
                        fall: [],
                        spring: [],
                        summer1: [],
                        summer2: []
                    };

                    const coursesForYear = auditData.completedCourses
                        .filter(course => course.termYear === year);
                    
                    chrome.runtime.sendMessage({
                        type: 'DEBUG_LOG',
                        message: `Found courses for year ${year}`,
                        data: { 
                            year,
                            coursesCount: coursesForYear.length,
                            courses: coursesForYear
                        }
                    });

                    coursesForYear.forEach(course => {
                        let termKey;
                        switch (course.termPeriod) {
                            case 'Fall':
                                termKey = 'fall';
                                break;
                            case 'Spring':
                                termKey = 'spring';
                                break;
                            case 'Summer 1':
                                termKey = 'summer1';
                                break;
                            case 'Summer 2':
                                termKey = 'summer2';
                                break;
                        }

                        if (termKey) {
                            coursesByYearAndTerm[relativeYear][termKey].push(course);
                            chrome.runtime.sendMessage({
                                type: 'DEBUG_LOG',
                                message: `Added course to ${termKey} for year ${relativeYear}`,
                                data: { course }
                            });
                        }
                    });
                });

                chrome.runtime.sendMessage({
                    type: 'DEBUG_LOG',
                    message: 'Final organized courses',
                    data: { coursesByYearAndTerm }
                });

                Object.entries(coursesByYearAndTerm).forEach(([year, terms]) => {
                    console.log(`Placing courses for year ${year}:`, terms);
                    const yearNum = parseInt(year);
                    const baseRow = 4 + ((yearNum - 1) * rowsPerYear);
                    console.log(`Base row for year ${year}: ${baseRow}`);

                    terms.fall.forEach((course, index) => {
                        console.log(`Placing Fall course at index ${index}:`, course);
                        const row = baseRow + 2 + index;
                        console.log(`Target row: ${row}`);
                        const courseString = `${course.department} ${course.number} - ${course.name || ''} - ${course.credits || ''} - ${course.grade || ''}`;
                        console.log(`Course string: ${courseString}`);
                        
                        requests.push({
                            updateCells: {
                                rows: [{
                                    values: [{
                                        userEnteredValue: { stringValue: courseString },
                                        userEnteredFormat: {
                                            textFormat: { 
                                                bold: course.status === 'IN_PROGRESS',
                                                fontSize: 10,
                                                fontFamily: "Arial"
                                            },
                                            backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 },
                                            borders: {
                                                top: { style: 'SOLID' },
                                                bottom: { style: 'SOLID' },
                                                left: { style: 'SOLID' },
                                                right: { style: 'SOLID' }
                                            },
                                            padding: { top: 4, right: 8, bottom: 4, left: 8 },
                                            verticalAlignment: 'MIDDLE',
                                            wrapStrategy: 'WRAP'
                                        }
                                    }]
                                }],
                                fields: 'userEnteredValue,userEnteredFormat',
                                range: {
                                    sheetId: sheetId,
                                    startRowIndex: row - 1,
                                    endRowIndex: row,
                                    startColumnIndex: 0,
                                    endColumnIndex: 1
                                }
                            }
                        });
                    });

                    terms.spring.forEach((course, index) => {
                        console.log(`Placing Spring course at index ${index}:`, course);
                        const row = baseRow + 2 + index;
                        const courseString = `${course.department} ${course.number} - ${course.name || ''} - ${course.credits || ''} - ${course.grade || ''}`;
                        
                        requests.push({
                            updateCells: {
                                rows: [{
                                    values: [{
                                        userEnteredValue: { stringValue: courseString },
                                        userEnteredFormat: {
                                            textFormat: { 
                                                bold: course.status === 'IN_PROGRESS',
                                                fontSize: 10,
                                                fontFamily: "Arial"
                                            },
                                            backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 },
                                            borders: {
                                                top: { style: 'SOLID' },
                                                bottom: { style: 'SOLID' },
                                                left: { style: 'SOLID' },
                                                right: { style: 'SOLID' }
                                            },
                                            padding: { top: 4, right: 8, bottom: 4, left: 8 },
                                            verticalAlignment: 'MIDDLE',
                                            wrapStrategy: 'WRAP'
                                        }
                                    }]
                                }],
                                fields: 'userEnteredValue,userEnteredFormat',
                                range: {
                                    sheetId: sheetId,
                                    startRowIndex: row - 1,
                                    endRowIndex: row,
                                    startColumnIndex: 1,
                                    endColumnIndex: 2
                                }
                            }
                        });
                    });

                    terms.summer1.forEach((course, index) => {
                        const row = baseRow + 2 + index;
                        const courseString = `${course.department} ${course.number} - ${course.name || ''} - ${course.credits || ''} - ${course.grade || ''}`;
                        
                        requests.push({
                            updateCells: {
                                rows: [{
                                    values: [{
                                        userEnteredValue: { stringValue: courseString },
                                        userEnteredFormat: {
                                            textFormat: { 
                                                bold: course.status === 'IN_PROGRESS',
                                                fontSize: 10,
                                                fontFamily: "Arial"
                                            },
                                            backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 },
                                            borders: {
                                                top: { style: 'SOLID' },
                                                bottom: { style: 'SOLID' },
                                                left: { style: 'SOLID' },
                                                right: { style: 'SOLID' }
                                            },
                                            padding: { top: 4, right: 8, bottom: 4, left: 8 },
                                            verticalAlignment: 'MIDDLE',
                                            wrapStrategy: 'WRAP'
                                        }
                                    }]
                                }],
                                fields: 'userEnteredValue,userEnteredFormat',
                                range: {
                                    sheetId: sheetId,
                                    startRowIndex: row - 1,
                                    endRowIndex: row,
                                    startColumnIndex: 2,
                                    endColumnIndex: 3
                                }
                            }
                        });
                    });

                    terms.summer2.forEach((course, index) => {
                        const row = baseRow + 2 + index;
                        const courseString = `${course.department} ${course.number} - ${course.name || ''} - ${course.credits || ''} - ${course.grade || ''}`;
                        
                        requests.push({
                            updateCells: {
                                rows: [{
                                    values: [{
                                        userEnteredValue: { stringValue: courseString },
                                        userEnteredFormat: {
                                            textFormat: { 
                                                bold: course.status === 'IN_PROGRESS',
                                                fontSize: 10,
                                                fontFamily: "Arial"
                                            },
                                            backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 },
                                            borders: {
                                                top: { style: 'SOLID' },
                                                bottom: { style: 'SOLID' },
                                                left: { style: 'SOLID' },
                                                right: { style: 'SOLID' }
                                            },
                                            padding: { top: 4, right: 8, bottom: 4, left: 8 },
                                            verticalAlignment: 'MIDDLE',
                                            wrapStrategy: 'WRAP'
                                        }
                                    }]
                                }],
                                fields: 'userEnteredValue,userEnteredFormat',
                                range: {
                                    sheetId: sheetId,
                                    startRowIndex: row - 1,
                                    endRowIndex: row,
                                    startColumnIndex: 3,
                                    endColumnIndex: 4
                                }
                            }
                        });
                    });
                });
            }

            const notesStartRow = totalRows - 12;
            requests.push({
                updateCells: {
                    range: {
                        sheetId: sheetId,
                        startRowIndex: notesStartRow,
                        endRowIndex: notesStartRow + 1,
                        startColumnIndex: 0,
                        endColumnIndex: 4
                    },
                    rows: [{
                        values: [{
                            userEnteredValue: { stringValue: 'ADVISING NOTES' },
                            userEnteredFormat: {
                                backgroundColor: { red: 0.05, green: 0.05, blue: 0.05 },
                                textFormat: { 
                                    bold: true, 
                                    foregroundColor: { red: 1, green: 1, blue: 1 },
                                    fontSize: 12,
                                    fontFamily: "Arial"
                                },
                                horizontalAlignment: 'LEFT',
                                verticalAlignment: 'MIDDLE',
                                padding: { left: 8, right: 8, top: 8, bottom: 8 }
                            }
                        }]
                    }],
                    fields: '*'
                }
            });

            requests.push({
                updateCells: {
                    range: {
                        sheetId: sheetId,
                        startRowIndex: notesStartRow + 1,
                        endRowIndex: notesStartRow + 10,
                        startColumnIndex: 0,
                        endColumnIndex: 4
                    },
                    rows: Array(9).fill({
                        values: [{
                            userEnteredFormat: {
                                backgroundColor: { red: 0.98, green: 0.98, blue: 0.98 },
                                padding: { top: 4, right: 8, bottom: 4, left: 8 },
                                verticalAlignment: 'TOP',
                                wrapStrategy: 'WRAP',
                                textFormat: {
                                    fontFamily: "Arial",
                                    fontSize: 10
                                }
                            }
                        }]
                    }),
                    fields: '*'
                }
            });

            requests.push({
                updateBorders: {
                    range: {
                        sheetId: sheetId,
                        startRowIndex: notesStartRow,
                        endRowIndex: notesStartRow + 10,
                        startColumnIndex: 0,
                        endColumnIndex: 4
                    },
                    top: {
                        style: 'SOLID',
                        width: 2,
                        color: { red: 0.8, green: 0.8, blue: 0.8 }
                    },
                    bottom: {
                        style: 'SOLID',
                        width: 2,
                        color: { red: 0.8, green: 0.8, blue: 0.8 }
                    },
                    left: {
                        style: 'SOLID',
                        width: 2,
                        color: { red: 0.8, green: 0.8, blue: 0.8 }
                    },
                    right: {
                        style: 'SOLID',
                        width: 2,
                        color: { red: 0.8, green: 0.8, blue: 0.8 }
                    },
                    innerHorizontal: {
                        style: 'SOLID',
                        width: 1,
                        color: { red: 0.9, green: 0.9, blue: 0.9 }
                    }
                }
            });

            console.log('Sending batch update request');

            const updateResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}:batchUpdate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ requests })
            });

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                console.error('Batch update error response:', errorText);
                throw new Error(`Failed to initialize Course Schedule: ${updateResponse.status} ${updateResponse.statusText}`);
            }

            console.log('Course Schedule sheet initialized');
        } catch (error) {
            console.error('Error initializing Course Schedule:', error);
            throw error;
        }
    }

    async initializeStudentInfo(auditData) {
        try {
            const token = await this.authenticate();
            console.log('Initializing Student Info sheet...');
            
            const values = [
                ['Student Information'],
                ['Name', auditData?.studentInfo?.name || ''],
                ['Program', auditData?.studentInfo?.program || ''],
                ['NU ID', auditData?.studentInfo?.nuId || ''],
                ['Catalog Year', auditData?.studentInfo?.catalogYear || ''],
                ['Expected Graduation', auditData?.studentInfo?.graduationDate || ''],
                ['Overall GPA', auditData?.studentInfo?.gpa || ''],
                ['Total Credits Required', auditData?.studentInfo?.totalHoursRequired || ''],
                ['Credits Completed', auditData?.studentInfo?.hoursCompleted || ''],
                ['Credits Remaining', auditData?.studentInfo?.hoursNeeded || '']
            ];

            const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Student Info!A1:B${values.length}?valueInputOption=RAW`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ values })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to initialize Student Info: ${response.status} ${response.statusText}`);
            }

            console.log('Student Info sheet initialized');
        } catch (error) {
            console.error('Error initializing Student Info:', error);
            throw error;
        }
    }

    async initializeRequirements(auditData) {
        try {
            const token = await this.authenticate();
            console.log('Initializing Requirements sheet...');
            
            const values = [['Requirement', 'Status', 'Description']];
            
            if (auditData?.requirements) {
                Object.entries(auditData.requirements).forEach(([name, req]) => {
                    values.push([
                        name,
                        req.status || '',
                        req.description || ''
                    ]);
                });
            }

            const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Requirements!A1:C${values.length}?valueInputOption=RAW`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ values })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to initialize Requirements: ${response.status} ${response.statusText}`);
            }

            console.log('Requirements sheet initialized');
        } catch (error) {
            console.error('Error initializing Requirements:', error);
            throw error;
        }
    }

    async initializeCourseHistory(auditData) {
        try {
            const token = await this.authenticate();
            console.log('Initializing Course History sheet...');
            console.log('Raw audit data:', auditData);
            
            if (auditData?.completedCourses) {
                console.log('Number of completed courses:', auditData.completedCourses.length);
                auditData.completedCourses.forEach((course, index) => {
                    console.log(`Course ${index + 1}:`, {
                        code: course.code,
                        name: course.name,
                        credits: course.credits,
                        grade: course.grade,
                        term: course.term,
                        termYear: course.termYear,
                        termPeriod: course.termPeriod,
                        status: course.status,
                        department: course.department,
                        number: course.number
                    });
                });
            } else {
                console.warn('No completed courses found in auditData');
                console.log('Full auditData structure:', JSON.stringify(auditData, null, 2));
            }
            
            const values = [['Course Code', 'Name', 'Credits', 'Grade', 'Term', 'Status']];
            
            if (auditData?.completedCourses) {
                auditData.completedCourses.forEach(course => {
                    values.push([
                        course.code || '',
                        course.name || '',
                        course.credits || '',
                        course.grade || '',
                        course.term || '',
                        course.status || ''
                    ]);
                });
            }

            console.log('Course History values to be written:', values);

            const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Course History!A1:F${values.length}?valueInputOption=RAW`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ values })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Course History sheet error response:', errorText);
                throw new Error(`Failed to initialize Course History: ${response.status} ${response.statusText}`);
            }

            console.log('Course History sheet initialized successfully');
        } catch (error) {
            console.error('Error initializing Course History:', error);
            throw error;
        }
    }

    async initializeSummary(auditData) {
        // TODO: Implement summary sheet with overview statistics
    }
} 