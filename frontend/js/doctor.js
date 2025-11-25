/**
 * Doctor Dashboard Logic
 * 
 * Handles doctor-specific UI and interactions.
 * Depends on: api.js, auth.js
 */

/**
 * Load patient list for doctor dashboard (placeholder)
 * TODO: Implement with actual API call
 * @returns {Promise<array>} - List of pending patient intakes
 */
async function loadPatientList() {
    console.log('TODO: Load patient list from API');
    // TODO: Call API endpoint to fetch pending patient intakes
    // const patients = await window.API.fetchDoctors();
    // return patients;

    // Placeholder demo data
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve([
                { patientId: 'pat-001', fullName: 'John Doe', age: 35, mainSymptoms: 'Headache', createdAt: new Date().toISOString() },
                { patientId: 'pat-002', fullName: 'Jane Smith', age: 42, mainSymptoms: 'Chest pain', createdAt: new Date().toISOString() }
            ]);
        }, 500);
    });
}

/**
 * Fetch detailed patient intake data
 * @param {string} patientId - Patient ID
 * @returns {Promise<object>} - Detailed patient intake
 */
async function loadPatientDetail(patientId) {
    try {
        if (!window.API) {
            throw new Error('API module not loaded');
        }
        return await window.API.fetchPatientData(patientId);
    } catch (err) {
        console.error('Failed to load patient detail:', err);
        alert('Error loading patient data: ' + err.message);
        return null;
    }
}

/**
 * Render patient list in dashboard
 * @param {array} patients - Patient records
 * @param {string} containerId - HTML element ID to render into
 */
function renderPatientList(patients, containerId = 'patientList') {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Container #${containerId} not found`);
        return;
    }

    if (patients.length === 0) {
        container.innerHTML = '<p>No pending patient intakes.</p>';
        return;
    }

    const html = `
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Age</th>
          <th>Symptoms</th>
          <th>Date</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${patients.map(p => `
          <tr>
            <td>${p.fullName}</td>
            <td>${p.age}</td>
            <td>${p.mainSymptoms}</td>
            <td>${new Date(p.createdAt).toLocaleDateString()}</td>
            <td><button onclick="openPatientDetail('${p.patientId}')">Review</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

    container.innerHTML = html;
}

/**
 * Open patient detail modal/page
 * @param {string} patientId - Patient ID to review
 */
async function openPatientDetail(patientId) {
    try {
        const patient = await loadPatientDetail(patientId);
        if (!patient) return;

        // Render patient data and form for doctor response
        displayPatientReviewForm(patient);
    } catch (err) {
        console.error('Error opening patient detail:', err);
    }
}

/**
 * Display patient review form for doctor
 * @param {object} patientData - Patient intake data
 */
function displayPatientReviewForm(patientData) {
    // TODO: Implement modal or page showing patient data and form for:
    // - Prescription
    // - Sick leave
    // - Notes
    // - AI-generated summary (if available)

    console.log('TODO: Display patient review form with:', patientData);

    const form = `
    <div id="patientReviewModal" style="display: block;">
      <h2>Patient: ${patientData.fullName}</h2>
      
      <h3>Patient Information</h3>
      <p><strong>Age:</strong> ${patientData.age}</p>
      <p><strong>Gender:</strong> ${patientData.gender}</p>
      <p><strong>Main Symptoms:</strong> ${patientData.mainSymptoms}</p>
      <p><strong>Pain Severity:</strong> ${patientData.painSeverity}/10</p>
      <p><strong>Medical History:</strong> ${patientData.medicalHistory || 'None'}</p>
      <p><strong>Current Medications:</strong> ${patientData.currentMedications || 'None'}</p>
      <p><strong>Allergies:</strong> ${patientData.allergies || 'None'}</p>
      
      ${patientData.aiSummary ? `
        <h3>AI-Generated Summary</h3>
        <p>${patientData.aiSummary}</p>
      ` : ''}
      
      <h3>Doctor Response</h3>
      <form onsubmit="submitDoctorResponse(event, '${patientData.patientId}')">
        <label>Prescription:</label>
        <textarea id="prescription" rows="3"></textarea>
        
        <label>Sick Leave (days):</label>
        <input id="sickLeave" type="number" min="0" max="30">
        
        <label>Notes:</label>
        <textarea id="doctorNotes" rows="3"></textarea>
        
        <button type="submit">Submit Response</button>
        <button type="button" onclick="closePatientDetail()">Cancel</button>
      </form>
    </div>
  `;

    const container = document.getElementById('reviewContainer') || document.body;
    container.innerHTML = form;
}

/**
 * Submit doctor response (prescription, sick leave, notes)
 * @param {Event} event - Form submit event
 * @param {string} patientId - Patient ID
 */
async function submitDoctorResponse(event, patientId) {
    event.preventDefault();

    try {
        const response = {
            prescription: document.getElementById('prescription')?.value || '',
            sickLeave: Number(document.getElementById('sickLeave')?.value || 0),
            doctorNotes: document.getElementById('doctorNotes')?.value || ''
        };

        if (!window.API) {
            throw new Error('API module not loaded');
        }

        const result = await window.API.submitDoctorResponse(patientId, response);

        if (result && result.status === 'ok') {
            alert('Doctor response submitted successfully!');
            closePatientDetail();
            // Reload patient list
            const patients = await loadPatientList();
            renderPatientList(patients);
        } else {
            throw new Error('Unexpected response from server');
        }
    } catch (err) {
        console.error('Error submitting doctor response:', err);
        alert('Error submitting response: ' + err.message);
    }
}

/**
 * Close patient detail view
 */
function closePatientDetail() {
    const modal = document.getElementById('patientReviewModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Initialize doctor dashboard on page load
 */
async function initDoctorDashboard() {
    try {
        const patients = await loadPatientList();
        renderPatientList(patients);
    } catch (err) {
        console.error('Failed to initialize dashboard:', err);
        alert('Error loading dashboard: ' + err.message);
    }
}

// Export for use in other modules
window.DoctorDashboard = {
    loadPatientList,
    loadPatientDetail,
    renderPatientList,
    openPatientDetail,
    displayPatientReviewForm,
    submitDoctorResponse,
    closePatientDetail,
    initDoctorDashboard
};
