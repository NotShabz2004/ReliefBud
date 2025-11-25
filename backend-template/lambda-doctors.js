/**
 * Lambda: Fetch Doctors List
 * 
 * Returns a list of doctors, optionally filtered by department.
 * 
 * Query Parameters:
 * - department: Optional department filter (e.g., "Cardiology")
 * 
 * TODO: Replace with actual doctor database query
 */

// CORS Headers
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'OPTIONS,GET',
    'Content-Type': 'application/json'
};

/**
 * Helper: Get doctors by department
 * TODO: Replace with actual DynamoDB query
 */
function getDoctorsByDepartment(department) {
    // Static demo data - replace with actual database query
    const doctors = {
        'General Medicine': [
            { id: 'doc-001', name: 'Dr. Smith', specialty: 'General Medicine', experience: '15 years' },
            { id: 'doc-002', name: 'Dr. Lee', specialty: 'General Medicine', experience: '10 years' }
        ],
        'Cardiology': [
            { id: 'doc-003', name: 'Dr. Johnson', specialty: 'Cardiology', experience: '20 years' },
            { id: 'doc-004', name: 'Dr. Patel', specialty: 'Cardiology', experience: '12 years' }
        ],
        'Pediatrics': [
            { id: 'doc-005', name: 'Dr. Brown', specialty: 'Pediatrics', experience: '8 years' },
            { id: 'doc-006', name: 'Dr. Davis', specialty: 'Pediatrics', experience: '6 years' }
        ],
        'Dermatology': [
            { id: 'doc-007', name: 'Dr. Wilson', specialty: 'Dermatology', experience: '11 years' },
            { id: 'doc-008', name: 'Dr. Martinez', specialty: 'Dermatology', experience: '9 years' }
        ]
    };

    return doctors[department] || [];
}

/**
 * Helper: Get all doctors
 * TODO: Replace with actual DynamoDB scan/query
 */
function getAllDoctors() {
    const allDoctors = [
        { id: 'doc-001', name: 'Dr. Smith', specialty: 'General Medicine', experience: '15 years' },
        { id: 'doc-002', name: 'Dr. Lee', specialty: 'General Medicine', experience: '10 years' },
        { id: 'doc-003', name: 'Dr. Johnson', specialty: 'Cardiology', experience: '20 years' },
        { id: 'doc-004', name: 'Dr. Patel', specialty: 'Cardiology', experience: '12 years' },
        { id: 'doc-005', name: 'Dr. Brown', specialty: 'Pediatrics', experience: '8 years' },
        { id: 'doc-006', name: 'Dr. Davis', specialty: 'Pediatrics', experience: '6 years' },
        { id: 'doc-007', name: 'Dr. Wilson', specialty: 'Dermatology', experience: '11 years' },
        { id: 'doc-008', name: 'Dr. Martinez', specialty: 'Dermatology', experience: '9 years' }
    ];

    return allDoctors;
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({ message: 'OK' })
        };
    }

    // Only accept GET
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Extract department filter from query parameters
        const department = event.queryStringParameters?.department;

        let doctors;
        if (department) {
            console.log(`Fetching doctors for department: ${department}`);
            doctors = getDoctorsByDepartment(department);
        } else {
            console.log('Fetching all doctors');
            doctors = getAllDoctors();
        }

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                status: 'ok',
                count: doctors.length,
                doctors
            })
        };

    } catch (err) {
        console.error('Handler error:', err);
        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Internal server error: ' + err.message })
        };
    }
};
