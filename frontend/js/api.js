/**
 * API Configuration and Request Handlers
 * 
 * This module centralizes all API endpoint URLs and HTTP request logic.
 * Replace placeholders with actual API Gateway URLs after AWS deployment.
 * 
 * Example: const API_URL_INTAKE = "https://abc123.execute-api.us-east-1.amazonaws.com/prod";
 */

// ===== ENDPOINT PLACEHOLDERS (Replace after AWS deployment) =====
const API_URL_INTAKE = "===replace_with_intake_endpoint===";
const API_URL_DOCTORS = "===replace_with_doctors_endpoint===";
const API_URL_PATIENT_GET = "===replace_with_get_patient_endpoint===";
const API_URL_DOCTOR_SUBMIT = "===replace_with_doctor_submit_endpoint===";

// ===== HTTP UTILITY FUNCTIONS =====

/**
 * Helper: Make authenticated API request
 * @param {string} url - API endpoint
 * @param {object} options - fetch options (method, body, headers)
 * @returns {Promise<object>} - parsed JSON response
 */
async function apiRequest(url, options = {}) {
    const defaultHeaders = {
        'Content-Type': 'application/json'
    };

    // TODO: Add Cognito token to headers once auth.js is integrated
    // const token = await getAuthToken();
    // if (token) {
    //   defaultHeaders['Authorization'] = `Bearer ${token}`;
    // }

    const response = await fetch(url, {
        method: options.method || 'GET',
        headers: { ...defaultHeaders, ...options.headers },
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`API Error [${response.status}]: ${error}`);
    }

    try {
        return await response.json();
    } catch (err) {
        console.error('Failed to parse JSON response:', err);
        throw new Error('Invalid JSON response from API');
    }
}

// ===== INTAKE API =====

/**
 * Submit patient intake form
 * @param {object} intakeData - Patient intake form data
 * @returns {Promise<object>} - { status, patientId }
 */
async function submitPatientIntake(intakeData) {
    if (!API_URL_INTAKE.includes('===')) {
        return apiRequest(API_URL_INTAKE, {
            method: 'POST',
            body: intakeData
        });
    } else {
        console.error('API_URL_INTAKE is not configured. Update api.js with your API Gateway URL.');
        throw new Error('API endpoint not configured');
    }
}

// ===== DOCTORS API =====

/**
 * Fetch list of doctors, optionally filtered by department
 * @param {string} department - Optional department filter
 * @returns {Promise<array>} - List of doctors
 */
async function fetchDoctors(department = null) {
    let url = API_URL_DOCTORS;
    if (department) {
        url += `?department=${encodeURIComponent(department)}`;
    }

    if (!url.includes('===')) {
        return apiRequest(url, { method: 'GET' });
    } else {
        console.error('API_URL_DOCTORS is not configured. Update api.js with your API Gateway URL.');
        throw new Error('API endpoint not configured');
    }
}

// ===== PATIENT DATA API =====

/**
 * Fetch patient intake data by ID
 * @param {string} patientId - Patient ID
 * @returns {Promise<object>} - Patient intake record
 */
async function fetchPatientData(patientId) {
    const url = `${API_URL_PATIENT_GET}/${patientId}`;

    if (!API_URL_PATIENT_GET.includes('===')) {
        return apiRequest(url, { method: 'GET' });
    } else {
        console.error('API_URL_PATIENT_GET is not configured. Update api.js with your API Gateway URL.');
        throw new Error('API endpoint not configured');
    }
}

// ===== DOCTOR SUBMISSION API =====

/**
 * Doctor submits prescription/sick leave
 * @param {string} patientId - Patient ID
 * @param {object} doctorData - { prescription, sickLeave, notes, etc }
 * @returns {Promise<object>} - Success response
 */
async function submitDoctorResponse(patientId, doctorData) {
    if (!API_URL_DOCTOR_SUBMIT.includes('===')) {
        return apiRequest(API_URL_DOCTOR_SUBMIT, {
            method: 'POST',
            body: {
                patientId,
                ...doctorData
            }
        });
    } else {
        console.error('API_URL_DOCTOR_SUBMIT is not configured. Update api.js with your API Gateway URL.');
        throw new Error('API endpoint not configured');
    }
}

// ===== ERROR HANDLING UTILITIES =====

/**
 * Format API error for user display
 * @param {Error} err - Error object
 * @returns {string} - User-friendly message
 */
function formatErrorMessage(err) {
    if (err.message.includes('API Error')) {
        return `Server error: ${err.message}`;
    }
    return err.message || 'An unexpected error occurred';
}

// Export for use in other modules
window.API = {
    submitPatientIntake,
    fetchDoctors,
    fetchPatientData,
    submitDoctorResponse,
    formatErrorMessage
};
