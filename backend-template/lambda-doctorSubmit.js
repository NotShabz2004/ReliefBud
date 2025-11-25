/**
 * Lambda: Doctor Submit Response
 * 
 * Receives doctor response (prescription, sick leave, notes) to a patient intake.
 * Stores the response in DynamoDB and optionally notifies the patient.
 * 
 * Request Body:
 * {
 *   "patientId": "uuid",
 *   "prescription": "text",
 *   "sickLeave": 5,
 *   "doctorNotes": "text"
 * }
 * 
 * TODO: Implement DynamoDB write and notification service
 */

const crypto = require('crypto');

// CORS Headers
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'OPTIONS,POST',
    'Content-Type': 'application/json'
};

// Environment variables (to be set in Lambda console)
const TABLE_NAME = process.env.DYNAMODB_TABLE || 'PatientIntake';

// TODO: Import AWS SDK v3 modules when AWS integration is set up
// const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
// const { DynamoDBDocumentClient, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
// const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

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
 * Validate doctor response data
 */
function validateDoctorResponse(data) {
    const errors = [];

    if (!data.patientId || data.patientId.trim().length === 0) {
        errors.push('patientId is required');
    }

    if (!data.prescription || data.prescription.trim().length === 0) {
        errors.push('prescription is required');
    }

    if (errors.length > 0) {
        throw new Error('Validation failed: ' + errors.join('; '));
    }
}

/**
 * TODO: Save doctor response to DynamoDB
 * Update the patient intake record with doctor's response
 */
async function saveDoctorResponseToDynamoDB(patientId, responseData) {
    console.log(`TODO: Update DynamoDB record for patient ${patientId} with doctor response`);

    // TODO: Implement DynamoDB UpdateCommand
    // const result = await ddbDoc.send(
    //   new UpdateCommand({
    //     TableName: TABLE_NAME,
    //     Key: { patientId },
    //     UpdateExpression: 'SET #resp = :response, #updatedAt = :timestamp',
    //     ExpressionAttributeNames: {
    //       '#resp': 'doctorResponse',
    //       '#updatedAt': 'updatedAt'
    //     },
    //     ExpressionAttributeValues: {
    //       ':response': responseData,
    //       ':timestamp': new Date().toISOString()
    //     }
    //   })
    // );

    // Placeholder: log what would be saved
    console.log('Doctor response to be saved:', JSON.stringify(responseData, null, 2));

    return {
        patientId,
        ...responseData,
        submittedAt: new Date().toISOString()
    };
}

/**
 * TODO: Send notification to patient (via SNS, Email, or push notification)
 * Let patient know their prescription is ready
 */
async function notifyPatient(patientId, message) {
    console.log(`TODO: Notify patient ${patientId}: ${message}`);

    // TODO: Implement SNS publish or other notification service
    // const sns = new SNSClient({ region: process.env.AWS_REGION });
    // await sns.send(
    //   new PublishCommand({
    //     TopicArn: process.env.PATIENT_NOTIFICATION_TOPIC_ARN,
    //     Subject: 'Your Prescription is Ready',
    //     Message: message
    //   })
    // );

    // Placeholder
    console.log('Patient notification would be sent here');
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

    // Only accept POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Parse request body
        const data = parseRequestBody(event);

        // Validate required fields
        validateDoctorResponse(data);

        const { patientId, prescription, sickLeave, doctorNotes } = data;

        console.log(`Processing doctor response for patient: ${patientId}`);

        // Build response object
        const doctorResponse = {
            responseId: crypto.randomUUID(),
            patientId,
            prescription,
            sickLeave: sickLeave || 0,
            doctorNotes: doctorNotes || '',
            submittedAt: new Date().toISOString()
        };

        // TODO: Uncomment when DynamoDB integration is ready
        // const savedResponse = await saveDoctorResponseToDynamoDB(patientId, doctorResponse);

        // For now, just log
        await saveDoctorResponseToDynamoDB(patientId, doctorResponse);

        // TODO: Uncomment when notification service is set up
        // await notifyPatient(patientId, `Your prescription is ready: ${prescription}`);

        // Placeholder notification
        await notifyPatient(patientId, `Your prescription is ready: ${prescription}`);

        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
                status: 'ok',
                message: 'Doctor response received and patient notified',
                responseId: doctorResponse.responseId
            })
        };

    } catch (err) {
        console.error('Handler error:', err);

        if (err.message.includes('Validation failed')) {
            return {
                statusCode: 400,
                headers: CORS_HEADERS,
                body: JSON.stringify({ error: err.message })
            };
        }

        return {
            statusCode: 500,
            headers: CORS_HEADERS,
            body: JSON.stringify({ error: 'Internal server error: ' + err.message })
        };
    }
};
