/**
 * Patient Intake Form Logic
 * 
 * Handles form submission, validation, and API communication.
 * Depends on: api.js
 */

/**
 * Build intake data object from form inputs
 * @returns {object} - Structured patient data
 */
function buildIntakeData() {
    return {
        fullName: document.getElementById('fullName')?.value || '',
        age: Number(document.getElementById('age')?.value || 0),
        gender: document.getElementById('gender')?.value || '',
        mainSymptoms: document.getElementById('mainSymptoms')?.value || '',
        symptomDuration: document.getElementById('symptomDuration')?.value || '',
        painSeverity: Number(document.getElementById('painSeverity')?.value || 0),
        medicalHistory: document.getElementById('medicalHistory')?.value || '',
        currentMedications: document.getElementById('currentMedications')?.value || '',
        allergies: document.getElementById('allergies')?.value || '',
        preferredDepartment: document.getElementById('department')?.value || '',
        preferredDoctor: document.getElementById('doctors')?.value || '',
        createdAt: new Date().toISOString()
    };
}

/**
 * Validate intake form before submission
 * @param {object} data - Patient data object
 * @returns {object} - { valid: boolean, errors: [string] }
 */
function validateIntakeForm(data) {
    const errors = [];

    if (!data.fullName || data.fullName.trim().length === 0) {
        errors.push('Full Name is required');
    }

    if (!data.age || data.age <= 0 || data.age > 150) {
        errors.push('Valid age is required');
    }

    if (!data.gender) {
        errors.push('Gender is required');
    }

    if (!data.mainSymptoms || data.mainSymptoms.trim().length === 0) {
        errors.push('Main Symptoms are required');
    }

    if (!data.symptomDuration || data.symptomDuration.trim().length === 0) {
        errors.push('Symptom Duration is required');
    }

    if (!data.painSeverity || data.painSeverity < 1 || data.painSeverity > 10) {
        errors.push('Pain Severity must be between 1 and 10');
    }

    if (!data.preferredDepartment) {
        errors.push('Preferred Department is required');
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Update doctor dropdown based on selected department
 * This function is called by the department select onchange event
 */
function updateDoctors() {
    const dept = document.getElementById('department')?.value;
    const doctorsSelect = document.getElementById('doctors');

    if (!doctorsSelect) return;

    // Clear and reset
    doctorsSelect.innerHTML = '<option value="">Select a doctor</option>';

    if (!dept) return;

    // Static demo list (in production, this would fetch from API)
    const deptDoctors = {
        'General Medicine': ['Dr. Smith', 'Dr. Lee'],
        'Cardiology': ['Dr. Johnson', 'Dr. Patel'],
        'Pediatrics': ['Dr. Brown', 'Dr. Davis'],
        'Dermatology': ['Dr. Wilson', 'Dr. Martinez']
    };

    const doctors = deptDoctors[dept] || [];
    doctors.forEach(docName => {
        const option = document.createElement('option');
        option.value = docName;
        option.textContent = docName;
        doctorsSelect.appendChild(option);
    });
}

/**
 * Main submit handler for patient intake form
 * Called from patientform.html's Submit button
 */
async function submitForm() {
    try {
        // Build and validate
        const data = buildIntakeData();
        const validation = validateIntakeForm(data);

        if (!validation.valid) {
            alert('Form validation failed:\n' + validation.errors.join('\n'));
            return;
        }

        // Show loading state
        const submitBtn = document.querySelector('button[onclick="submitForm()"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
        }

        // Submit to API
        const response = await window.API.submitPatientIntake(data);

        // Success: navigate to success page
        if (response && response.status === 'ok') {
            // Store patientId in sessionStorage for reference on success page
            if (response.patientId) {
                sessionStorage.setItem('patientId', response.patientId);
            }
            window.location.href = 'psuccessful.html';
        } else {
            throw new Error('Unexpected response format');
        }

    } catch (err) {
        console.error('Form submission failed:', err);
        const errorMsg = window.API ? window.API.formatErrorMessage(err) : err.message;
        alert('Error submitting form:\n' + errorMsg);

        // Re-enable button
        const submitBtn = document.querySelector('button[onclick="submitForm()"]');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit';
        }
    }
}

// Export functions for global use
window.PatientForm = {
    buildIntakeData,
    validateIntakeForm,
    updateDoctors,
    submitForm
};
