/**
 * Lambda: Patient Intake Handler
 * 
 * Receives patient intake form data, validates it, calls Bedrock for AI summary,
 * and stores the data in DynamoDB.
 * 
 * Environment Variables (to be set in Lambda console):
 * - DYNAMODB_TABLE: Name of DynamoDB table (e.g., "PatientIntake")
 * - BEDROCK_MODEL_ID: Bedrock model identifier (e.g., "anthropic.claude-3-sonnet")
 * - AWS_REGION: AWS region (default: us-east-1)
 * 
 * TODO: Replace placeholder comments with actual AWS SDK implementations
 */

const crypto = require('crypto');

// TODO: Import AWS SDK v3 modules once AWS integration is set up
// const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
// const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
// const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const REGION = process.env.AWS_REGION || 'us-east-1';
const TABLE_NAME = process.env.DYNAMODB_TABLE || 'PatientIntake';
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet';

// TODO: Initialize AWS clients (uncomment when setting up AWS)
// const ddbClient = new DynamoDBClient({ region: REGION });
// const ddbDoc = DynamoDBDocumentClient.from(ddbClient);
// const bedrock = new BedrockRuntimeClient({ region: REGION });

// CORS Headers
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET',
    'Content-Type': 'application/json'
};

/**
 * Helper: Handle CORS preflight requests
 */
function handleCORSPreflight() {
    return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ message: 'OK' })
    };
}

/**
 * Helper: Build error response
 */
function errorResponse(statusCode, message) {
    return {
        statusCode,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: message })
    };
}

/**
 * Helper: Parse request body
 */
function parseRequestBody(event) {
    try {
        if (typeof event.body === 'string') {
            return JSON.parse(event.body);
        }
        return event.body;
    } catch (err) {
        throw new Error('Invalid JSON in request body');
    }
}

/**
 * Validate incoming patient data
 */
function validatePatientData(data) {
    const errors = [];

    if (!data.fullName || data.fullName.trim().length === 0) {
        errors.push('fullName is required');
    }

    if (!data.age || data.age <= 0 || data.age > 150) {
        errors.push('age must be a valid number between 1 and 150');
    }

    if (!data.mainSymptoms || data.mainSymptoms.trim().length === 0) {
        errors.push('mainSymptoms is required');
    }

    if (errors.length > 0) {
        throw new Error('Validation failed: ' + errors.join('; '));
    }
}

/**
 * TODO: Call Bedrock to generate AI summary
 * Replace this stub with actual Bedrock InvokeModelCommand
 */
async function generateAISummary(patientData) {
    console.log('TODO: Call Bedrock API to generate AI summary');
    // TODO: Implement Bedrock call
    // const prompt = buildBedrockPrompt(patientData);
    // const bedrockResponse = await bedrock.send(
    //   new InvokeModelCommand({
    //     modelId: BEDROCK_MODEL_ID,
    //     body: JSON.stringify({ input: prompt }),
    //     contentType: 'application/json'
    //   })
    // );
    // Parse response and extract summary, severity, department recommendation
    // return {
    //   aiSummary: summary,
    //   aiSeverity: severity,
    //   aiDepartment: recommendedDept
    // };

    return {
        aiSummary: 'PLACEHOLDER: AI summary pending Bedrock integration',
        aiSeverity: null,
        aiDepartment: null
    };
}

/**
 * TODO: Write patient intake to DynamoDB
 * Replace this stub with actual DynamoDB PutCommand
 */
async function savePatientIntakeToDynamoDB(patientId, createdAt, patientData, aiData) {
    console.log('TODO: Write patient intake to DynamoDB table:', TABLE_NAME);

    const item = {
        patientId,
        createdAt,
        fullName: patientData.fullName,
        age: patientData.age,
        gender: patientData.gender || null,
        mainSymptoms: patientData.mainSymptoms,
        symptomDuration: patientData.symptomDuration || null,
        painSeverity: patientData.painSeverity || null,
        medicalHistory: patientData.medicalHistory || null,
        currentMedications: patientData.currentMedications || null,
        allergies: patientData.allergies || null,
        preferredDepartment: patientData.preferredDepartment || null,
        preferredDoctor: patientData.preferredDoctor || null,
        aiSummary: aiData.aiSummary,
        aiSeverity: aiData.aiSeverity,
        aiDepartment: aiData.aiDepartment,
        receivedAtEpoch: Date.now()
    };

    // TODO: Uncomment and use actual DynamoDB client when AWS is set up
    // await ddbDoc.send(new PutCommand({
    //   TableName: TABLE_NAME,
    //   Item: item
    // }));

    // For now, just log the item that would be saved
    console.log('Item to be saved:', JSON.stringify(item, null, 2));

    return item;
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return handleCORSPreflight();
    }

    // Only accept POST
    if (event.httpMethod !== 'POST') {
        return errorResponse(405, 'Method not allowed');
    }

    try {
        // Parse request body
        const patientData = parseRequestBody(event);

        // Validate required fields
        validatePatientData(patientData);

        // Generate IDs and timestamps
        const patientId = crypto.randomUUID();
        const createdAt = new Date().toISOString();

        console.log(`Processing intake for patient: ${patientId}`);

        // TODO: Uncomment when Bedrock integration is ready
        // const aiData = await generateAISummary(patientData);

        // For now, use placeholder
        const aiData = await generateAISummary(patientData);

        // TODO: Uncomment when DynamoDB integration is ready
        // const savedItem = await savePatientIntakeToDynamoDB(patientId, createdAt, patientData, aiData);

        // For now, just log
        await savePatientIntakeToDynamoDB(patientId, createdAt, patientData, aiData);

        // Return success response
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                status: 'ok',
                patientId,
                message: 'Patient intake received and queued for processing'
            })
        };

    } catch (err) {
        console.error('Handler error:', err);

        if (err.message.includes('Validation failed')) {
            return errorResponse(400, err.message);
        }

        return errorResponse(500, 'Internal server error: ' + err.message);
    }
};

/**
 * Helper: Build Bedrock prompt
 * TODO: Refine prompt based on medical requirements
 */
function buildBedrockPrompt(patientData) {
    return `You are a concise medical assistant. Create a brief professional patient summary (3-6 sentences) suitable for a clinician, along with severity assessment and department recommendation.

Patient Information:
- Full Name: ${patientData.fullName}
- Age: ${patientData.age}
- Gender: ${patientData.gender || 'N/A'}
- Main Symptoms: ${patientData.mainSymptoms}
- Symptom Duration: ${patientData.symptomDuration || 'N/A'}
- Pain Severity (1-10): ${patientData.painSeverity || 'N/A'}
- Medical History: ${patientData.medicalHistory || 'None reported'}
- Current Medications: ${patientData.currentMedications || 'None reported'}
- Allergies: ${patientData.allergies || 'None reported'}
- Preferred Department: ${patientData.preferredDepartment || 'Any'}

Return your response as JSON:
{
  "summary": "Clinical summary text here",
  "severity": "low|moderate|high|critical",
  "recommendedDepartment": "General Medicine|Cardiology|Pediatrics|Dermatology|Other"
}`;
}
