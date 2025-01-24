export class DegreeAuditParser {
    constructor() {
        this.courseData = [];
        this.requirements = {};
        this.studentInfo = {};
        this.document = document;
    }

    async parseFromDOM() {
        console.log('Starting to parse DOM...');
        
        const auditContent = this.findAuditContent();
        if (!auditContent) {
            console.error('Could not find audit content');
            return null;
        }
        
        console.log('Found audit content:', auditContent);
        
        const studentInfo = this.parseStudentInfo(auditContent);
        console.log('Parsed student info:', studentInfo);
        
        const sections = this.parseAllSections(auditContent);
        console.log('Parsed sections:', sections);
        
        const allCourses = [];
        
        Object.values(sections).forEach(section => {
            if (section.courses && Array.isArray(section.courses)) {
                section.courses.forEach(course => {
                    if (course && course.code && course.term) {
                        if (!allCourses.some(c => c.code === course.code && c.term === course.term)) {
                            allCourses.push(course);
                            console.log('Added course:', course);
                        }
                    }
                });
            }
            
            if (section.subrequirements && Array.isArray(section.subrequirements)) {
                section.subrequirements.forEach(subreq => {
                    if (subreq.courses && Array.isArray(subreq.courses)) {
                        subreq.courses.forEach(course => {
                            if (course && course.code && course.term) {
                                if (!allCourses.some(c => c.code === course.code && c.term === course.term)) {
                                    allCourses.push(course);
                                    console.log('Added course from subrequirement:', course);
                                }
                            }
                        });
                    }
                });
            }
        });
        
        console.log(`Total courses found: ${allCourses.length}`);
        console.log('All courses:', allCourses);
        
        const result = {
            studentInfo: studentInfo || {},
            requirements: sections || {},
            completedCourses: allCourses
        };
        
        console.log('Final parsed data:', result);
        return result;
    }

    findAuditContent() {
        const possibleContainers = [
            this.document.querySelector('#auditContent'),
            this.document.querySelector('#audit'),
            Array.from(this.document.querySelectorAll('div')).find(div => {
                const text = div.textContent;
                return text && (
                    text.includes('My Audit - Audit Results') ||
                    text.includes('DEGREE REQUIREMENTS') ||
                    text.includes('MAJOR REQUIREMENTS')
                );
            })
        ];

        return possibleContainers.find(container => container !== null);
    }

    parseStudentInfo(container) {
        console.log('Parsing student info from container:', container.innerHTML);
        
        const studentInfoSelectors = [
            '#studentInfo',
            '.studentInfo',
            '.student-info',
            'div[class*="student"]',
            'div[class*="header"]'
        ];
        
        let studentInfoSection = null;
        for (const selector of studentInfoSelectors) {
            const found = container.querySelector(selector);
            if (found) {
                console.log(`Found student info section with selector "${selector}":`, found.outerHTML);
                studentInfoSection = found;
                break;
            }
        }
        
        const text = (studentInfoSection || container).textContent;
        console.log('Parsing student info from text:', text);
        
        const nameMatch = text.match(/(?:Student:|Name:)?\s*([^]+?)(?=\s+(?:BS|BA|Program|ID|Major))/i);
        const programCodeMatch = text.match(/(?:Program|Major)\s*(?:Code)?:?\s*([A-Z0-9-]+)/i);
        const programMatch = text.match(/(?:CURRENT|PROGRAM|MAJOR):\s*([^]+?)(?=\s*(?:IP|AT LEAST|\n|$))/i);
        const nuIdMatch = text.match(/(?:NU ID|STUDENT ID|ID)(?:\s*#)?:?\s*(\d+)/i);
        const catalogMatch = text.match(/Catalog(?:\s*Year)?:?\s*([^]+?)(?=\n|$)/i);
        const gradMatch = text.match(/(?:Graduation|GRADUATION|Expected\s+Graduation)\s*(?:Date|DATE)?(?:\s*LN)?:?\s*([^]+?)(?=\n|$)/i);
        const gpaMatch = text.match(/(?:OVERALL\s*)?GPA:?\s*([\d.]+)/i);
        const preparedOnMatch = text.match(/(?:Prepared|Generated)\s*(?:On|Date):?\s*(\d{2}\/\d{2}\/\d{4}\s*\d{2}:\d{2}\s*[AP]M)/i);
        
        console.log('Matches found:', {
            name: nameMatch?.[1],
            programCode: programCodeMatch?.[1],
            program: programMatch?.[1],
            nuId: nuIdMatch?.[1],
            catalog: catalogMatch?.[1],
            graduation: gradMatch?.[1],
            gpa: gpaMatch?.[1],
            preparedOn: preparedOnMatch?.[1]
        });
        
        this.studentInfo = {
            name: nameMatch?.[1]?.trim(),
            programCode: programCodeMatch?.[1]?.trim(),
            program: programMatch?.[1]?.trim(),
            nuId: nuIdMatch?.[1],
            catalogYear: catalogMatch?.[1]?.trim(),
            graduationDate: gradMatch?.[1]?.trim(),
            gpa: gpaMatch ? parseFloat(gpaMatch[1]) : null,
            preparedOn: preparedOnMatch?.[1]?.trim()
        };

        const khouryGpaMatch = text.match(/KHOURY\s+(?:COLLEGE)?\s*GPA\s*REQUIREMENT[^]*?(\d+\.\d+)\s+GPA/i);
        const businessGpaMatch = text.match(/BUSINESS\s*GPA\s*REQUIREMENT[^]*?(\d+\.\d+)\s+GPA/i);
        
        if (khouryGpaMatch) {
            this.studentInfo.khouryGpa = parseFloat(khouryGpaMatch[1]);
        }
        if (businessGpaMatch) {
            this.studentInfo.businessGpa = parseFloat(businessGpaMatch[1]);
        }

        const notSatisfiedMatch = text.includes('AT LEAST ONE REQUIREMENT HAS NOT BEEN SATISFIED');
        this.studentInfo.requirementsSatisfied = !notSatisfiedMatch;

        const standingMatch = text.match(/ACADEMIC\s+STANDING:?\s*([^]*?)(?:\n|$)/i);
        if (standingMatch) {
            this.studentInfo.academicStanding = standingMatch[1].trim();
        }

        const totalHoursMatch = text.match(/(\d+)\s+total\s+(?:semester\s+)?hours\s+required/i);
        const hoursAddedMatch = text.match(/(\d+\.?\d*)\s+HOURS?\s+ADDED/i);
        const hoursNeededMatch = text.match(/NEEDS?:?\s*(\d+\.?\d*)\s+HOURS?/i);
        
        if (totalHoursMatch) {
            this.studentInfo.totalHoursRequired = parseInt(totalHoursMatch[1]);
            this.studentInfo.hoursCompleted = hoursAddedMatch ? parseFloat(hoursAddedMatch[1]) : 0;
            this.studentInfo.hoursNeeded = hoursNeededMatch ? parseFloat(hoursNeededMatch[1]) : 0;
        }

        console.log('Parsed student info:', this.studentInfo);
        return this.studentInfo;
    }

    parseAllSections(container) {
        const sections = {};
        console.log('Container HTML:', container.innerHTML);
        
        const sectionSelectors = [
            'div[class^="section"]',
            '.auditBlock',
            '.requirement',
            'div[class*="block"]',
            'div[class*="requirement"]'
        ];
        
        let majorSections = [];
        for (const selector of sectionSelectors) {
            const found = container.querySelectorAll(selector);
            console.log(`Found ${found.length} sections with selector "${selector}"`);
            if (found.length > 0) {
                majorSections = found;
                break;
            }
        }
        
        console.log('Found major sections:', majorSections.length);
        
        majorSections.forEach((section, index) => {
            console.log(`Processing section ${index}:`, section.outerHTML);
            
            const headerSelectors = [
                '.blockheader',
                '.header',
                '.reqTitle',
                'div[class*="header"]',
                'div[class*="title"]'
            ];
            
            let headerText = '';
            for (const selector of headerSelectors) {
                const headerElem = section.querySelector(selector);
                if (headerElem) {
                    headerText = headerElem.textContent;
                    console.log(`Found header with selector "${selector}":`, headerText);
                    break;
                }
            }
            
            const sectionName = this.getSectionName(headerText);
            
            if (sectionName) {
                console.log('Processing section:', sectionName);
                
                const courses = this.parseCoursesInSection(section);
                console.log(`Found ${courses.length} courses in section ${sectionName}`);
                
                sections[sectionName] = {
                    name: sectionName,
                    status: this.getSectionStatus(section),
                    description: this.getSectionDescription(headerText),
                    courses: courses,
                    subrequirements: this.parseSubrequirements(section)
                };
            } else {
                console.log('Could not determine section name from header:', headerText);
            }
        });
        
        return sections;
    }

    parseSubrequirements(section) {
        const subreqs = Array.from(section.querySelectorAll('.subrequirement'));
        return subreqs.map(subreq => {
            const title = subreq.querySelector('.subreqTitle')?.textContent?.trim();
            const statusElement = subreq.querySelector('.status');
            const statusClass = Array.from(statusElement?.classList || [])
                .find(cls => cls.startsWith('Status_'));
            const status = statusClass?.replace('Status_', '') || 'UNKNOWN';

            const courses = this.parseCoursesInSection(subreq);

            const selectCoursesTable = subreq.querySelector('.selectcourses');
            const courseOptions = [];
            if (selectCoursesTable) {
                const courseElements = selectCoursesTable.querySelectorAll('.course');
                courseElements.forEach(elem => {
                    const dept = elem.getAttribute('department')?.trim();
                    const num = elem.getAttribute('number')?.trim();
                    if (dept && num && !dept.includes('CS-D')) {
                        courseOptions.push(`${dept} ${num}`);
                    }
                });
            }

            const description = title?.split('\n')
                .map(line => line.trim())
                .filter(line => line)
                .join(' ');

            const countMatch = description?.match(/Complete.*?(\d+).*?(?:course|courses)/i);
            const requiredCount = countMatch ? parseInt(countMatch[1]) : null;

            return {
                title,
                status,
                courses,
                courseOptions,
                description,
                requiredCount
            };
        });
    }

    getSectionName(text) {
        const lines = text.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && (
                trimmed.includes('COURSES') ||
                trimmed.includes('REQUIREMENT') ||
                trimmed.includes('CONCENTRATION') ||
                trimmed.includes('MINOR') ||
                trimmed.includes('ELECTIVE') ||
                /^[A-Z\s&-]+$/.test(trimmed)
            )) {
                return trimmed;
            }
        }
        return null;
    }

    getSectionDescription(text) {
        const lines = text.split('\n')
            .map(line => line.trim())
            .filter(line => 
                line && 
                !line.includes('COURSES') && 
                !line.includes('REQUIREMENT') &&
                !/^[A-Z\s&-]+$/.test(line)
            );

        return lines[0] || null;
    }

    parseCoursesInSection(section) {
        console.log('Parsing courses from section:', section.outerHTML);
        const courses = [];
        
        const courseSelectors = [
            '.takenCourse',                          
            '.inprogressCourse',                    
            '.completedCourses tr.takenCourse',     
            '.inprogressCourses tr.takenCourse',     
            'tr[class*="course"]',                   
            '.subreqBody tr',                        
            'tr[class*="taken"]',                    
            'tr:not(.header)',                      
            'div[class*="course"]'                   
        ];

        const courseRows = new Set();
        courseSelectors.forEach(selector => {
            const found = section.querySelectorAll(selector);
            console.log(`Found ${found.length} rows with selector "${selector}"`);
            found.forEach(row => courseRows.add(row));
        });

        console.log(`Found ${courseRows.size} total potential course rows`);

        courseRows.forEach((row, index) => {
            console.log(`Processing row ${index}:`, row.outerHTML);
            
            if (row.classList.contains('header') || !row.textContent.trim()) {
                console.log('Skipping header or empty row');
                return;
            }

            const dataSelectors = {
                term: ['.term', 'td[class*="term"]', '*[class*="term"]', 'td:nth-child(1)'],
                course: ['.course', 'td[class*="course"]', '*[class*="course"]', 'td:nth-child(2)'],
                credits: ['.credit', 'td[class*="credit"]', '*[class*="credit"]', 'td:nth-child(3)'],
                grade: ['.grade', 'td[class*="grade"]', '*[class*="grade"]', 'td:nth-child(4)'],
                description: ['.description', 'td[class*="description"]', '*[class*="description"]', 'td:nth-child(5)'],
                condition: ['.ccode', 'td[class*="ccode"]', '*[class*="condition"]', 'td:nth-child(6)']
            };

            const courseData = {};
            for (const [field, selectors] of Object.entries(dataSelectors)) {
                for (const selector of selectors) {
                    const elem = row.querySelector(selector);
                    if (elem) {
                        courseData[field] = elem.textContent.trim();
                        console.log(`Found ${field} with selector "${selector}":`, courseData[field]);
                        break;
                    }
                }
            }

            if (!courseData.course) {
                const text = row.textContent.trim();
                const courseMatch = text.match(/([A-Z]{2,4})\s*(\d{4})/);
                if (courseMatch) {
                    courseData.course = `${courseMatch[1]} ${courseMatch[2]}`;
                    console.log('Extracted course code from text:', courseData.course);
                } else {
                    console.log('No course code found in row');
                    return;
                }
            }

            const [department, number] = courseData.course.split(/\s+/);
            if (!department || !number) {
                console.log('Invalid course code format:', courseData.course);
                return;
            }

            let termInfo = courseData.term?.toLowerCase() || '';
            let termYear = '';
            let termPeriod = '';

            const yearMatch = termInfo.match(/\d{4}/);
            if (yearMatch) {
                termYear = yearMatch[0];
                if (termInfo.includes('fall')) {
                    termPeriod = 'Fall';
                } else if (termInfo.includes('spring')) {
                    termPeriod = 'Spring';
                } else if (termInfo.includes('summer')) {
                    if (termInfo.includes('1') || termInfo.includes('i')) {
                        termPeriod = 'Summer 1';
                    } else if (termInfo.includes('2') || termInfo.includes('ii')) {
                        termPeriod = 'Summer 2';
                    } else {
                        termPeriod = 'Summer';
                    }
                }
            }

            const course = {
                term: courseData.term,
                termYear: termYear,
                termPeriod: termPeriod,
                department,
                number,
                code: courseData.course,
                credits: courseData.credits ? parseFloat(courseData.credits) : null,
                name: courseData.description,
                grade: courseData.grade?.trim()
            };

            if (row.classList.contains('inprogressCourse') || 
                courseData.grade?.includes('IP') || 
                courseData.condition?.includes('IP') ||
                row.classList.contains('inprogress') ||
                row.classList.contains('ip')) {
                course.status = 'IN_PROGRESS';
            } else if (courseData.grade?.includes('T')) {
                course.status = 'TRANSFER';
            } else if (courseData.grade?.includes('NT')) {
                course.status = 'NO_TRANSFER';
            } else if (courseData.grade && !['F', 'W', 'I'].includes(courseData.grade.trim())) {
                course.status = 'COMPLETED';
            } else {
                course.status = 'NOT_COMPLETED';
            }

            console.log('Parsed course:', course);
            courses.push(course);
        });

        console.log(`Successfully parsed ${courses.length} courses from section`);
        return courses;
    }

    parseRequirementsInSection(section) {
        const requirements = [];
        const text = section.textContent;
        
        const patterns = [
            /Complete.*?(\d+).*?(?:course|courses|credits?)/gi,
            /(?:Minimum|Min).*?grade.*?([A-D][+-]?)/gi,
            /(\d+).*?credits?.*?required/gi,
            /Select.*?(\d+).*?(?:course|courses).*?from/gi,
            /Complete.*?concentration/gi
        ];

        patterns.forEach(pattern => {
            const matches = text.matchAll(pattern);
            for (const match of matches) {
                requirements.push({
                    text: match[0],
                    count: match[1] ? parseInt(match[1]) : null,
                    type: pattern.source.includes('grade') ? 'GRADE' : 'COMPLETION'
                });
            }
        });

        return requirements;
    }

    determineSectionStatus(requirement) {
        if (requirement.status) {
            return requirement.status;
        }

        if (requirement.subrequirements?.length > 0) {
            const allCompleted = requirement.subrequirements.every(sr => sr.status === 'OK');
            const anyInProgress = requirement.subrequirements.some(sr => sr.status === 'IP');
            const anyNotStarted = requirement.subrequirements.some(sr => sr.status === 'NO');

            if (allCompleted) return 'COMPLETED';
            if (anyInProgress) return 'IN_PROGRESS';
            if (anyNotStarted) return 'NOT_STARTED';
            return 'UNKNOWN';
        }

        const completedCourses = requirement.courses.filter(c => c.status === 'COMPLETED');
        const inProgressCourses = requirement.courses.filter(c => c.status === 'IN_PROGRESS');
        
        if (requirement.requiredCount) {
            if (completedCourses.length >= requirement.requiredCount) {
                return 'COMPLETED';
            } else if (completedCourses.length + inProgressCourses.length >= requirement.requiredCount) {
                return 'IN_PROGRESS';
            } else {
                return 'NOT_STARTED';
            }
        }

        if (completedCourses.length > 0) {
            return 'COMPLETED';
        } else if (inProgressCourses.length > 0) {
            return 'IN_PROGRESS';
        }

        return 'NOT_STARTED';
    }

    getSectionStatus(section) {
        const statusIndicators = {
            'OK': ['ok', 'complete', 'satisfied'],
            'IP': ['ip', 'in progress', 'inprogress'],
            'NO': ['no', 'not satisfied', 'incomplete'],
            'NONE': ['none']
        };

        const sectionClasses = Array.from(section.classList);
        for (const [status, indicators] of Object.entries(statusIndicators)) {
            if (indicators.some(indicator => 
                sectionClasses.some(cls => 
                    cls.toLowerCase().includes(indicator)
                )
            )) {
                return status;
            }
        }

        const statusText = section.querySelector('.status, .reqStatus')?.textContent?.trim().toLowerCase();
        if (statusText) {
            for (const [status, indicators] of Object.entries(statusIndicators)) {
                if (indicators.some(indicator => statusText.includes(indicator))) {
                    return status;
                }
            }
        }

        return 'UNKNOWN';
    }
} 