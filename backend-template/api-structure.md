# API Structure & Endpoints

## Overview
This document defines all API endpoints for the ReliefBud telemedicine platform. Each endpoint is designed to be implemented as an AWS Lambda function integrated with API Gateway.

---

## 1. Patient Intake Submission

### Endpoint
**POST** `/intake`

### Description
Patient submits their intake form. Triggers Bedrock AI analysis and DynamoDB storage.

### Request Body
```json
{
  "fullName": "John Doe",
  "age": 35,
  "gender": "Male",
  "mainSymptoms": "Severe headache and neck stiffness",
  "symptomDuration": "12 hours",
  "painSeverity": 8,
  "medicalHistory": "Hypertension",
  "currentMedications": "Lisinopril 10mg daily",
  "allergies": "Penicillin",
  "preferredDepartment": "General Medicine",
  "preferredDoctor": "Dr. Smith",
  "createdAt": "2024-11-25T10:30:00Z"
}
```

### Response (200 OK)
```json
{
  "status": "ok",
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Patient intake received and queued for processing"
}
```

### Error Responses

**400 Bad Request** - Validation failed
```json
{
  "error": "Validation failed: fullName is required; mainSymptoms is required"
}
```

**500 Internal Server Error** - Server-side failure
```json
{
  "error": "Internal server error: DynamoDB write failed"
}
```

### Lambda Implementation
- File: `lambda-intake.js`
- Environment Variables:
  - `DYNAMODB_TABLE`: Name of patient intake table
  - `BEDROCK_MODEL_ID`: Claude 3 Sonnet model ID
  - `AWS_REGION`: AWS region

---

## 2. Fetch Doctors List

### Endpoint
**GET** `/doctors?department={department}`

### Description
Fetch list of available doctors, optionally filtered by department.

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| department | string | No | Filter by department (e.g., "Cardiology") |

### Response (200 OK)
```json
{
  "status": "ok",
  "count": 2,
  "doctors": [
    {
      "id": "doc-001",
      "name": "Dr. Smith",
      "specialty": "General Medicine",
      "experience": "15 years"
    },
    {
      "id": "doc-002",
      "name": "Dr. Lee",
      "specialty": "General Medicine",
      "experience": "10 years"
    }
  ]
}
```

### Example Requests
```
GET /doctors
GET /doctors?department=Cardiology
GET /doctors?department=Pediatrics
```

### Lambda Implementation
- File: `lambda-doctors.js`
- Static demo data (TODO: Replace with DynamoDB query)

---

## 3. Get Patient Intake Data

### Endpoint
**GET** `/patient/{patientId}`

### Description
Fetch detailed patient intake record (for doctor dashboard). **Requires authentication**.

### Path Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| patientId | string | UUID of patient |

### Response (200 OK)
```json
{
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2024-11-25T10:30:00Z",
  "fullName": "John Doe",
  "age": 35,
  "gender": "Male",
  "mainSymptoms": "Severe headache and neck stiffness",
  "symptomDuration": "12 hours",
  "painSeverity": 8,
  "medicalHistory": "Hypertension",
  "currentMedications": "Lisinopril 10mg daily",
  "allergies": "Penicillin",
  "preferredDepartment": "General Medicine",
  "aiSummary": "35-year-old male with acute-onset severe headache...",
  "aiSeverity": "high",
  "aiDepartment": "General Medicine"
}
```

### Error Responses

**404 Not Found** - Patient not found
```json
{
  "error": "Patient record not found"
}
```

**401 Unauthorized** - Missing or invalid auth token
```json
{
  "error": "Unauthorized: valid token required"
}
```

### Lambda Implementation
- TODO: Create `lambda-getPatient.js`
- DynamoDB Query: `GetCommand` on PatientIntake table
- Requires Cognito token validation

---

## 4. Doctor Submit Response

### Endpoint
**POST** `/doctor-submit`

### Description
Doctor submits prescription, sick leave, and clinical notes for a patient. **Requires authentication & doctor group**.

### Request Body
```json
{
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "prescription": "Ibuprofen 400mg three times daily for 7 days. Follow up with primary care in 1 week.",
  "sickLeave": 3,
  "doctorNotes": "Patient presents with typical migraine. Recommended hydration and rest. Monitor for improvement."
}
```

### Response (200 OK)
```json
{
  "status": "ok",
  "message": "Doctor response received and patient notified",
  "responseId": "550e8400-e29b-41d4-a716-446655440001"
}
```

### Error Responses

**400 Bad Request** - Validation failed
```json
{
  "error": "Validation failed: patientId is required; prescription is required"
}
```

**401 Unauthorized** - Not authenticated as doctor
```json
{
  "error": "Unauthorized: doctor credentials required"
}
```

**403 Forbidden** - User not in doctor group
```json
{
  "error": "Forbidden: user is not authorized as a doctor"
}
```

### Lambda Implementation
- File: `lambda-doctorSubmit.js`
- DynamoDB Update: Update patient record with doctor response
- SNS Notification: Notify patient of prescription ready (TODO)

---

## CORS Headers (All Endpoints)

All endpoints must return these CORS headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: *
Access-Control-Allow-Methods: OPTIONS,GET,POST,PUT,DELETE
Content-Type: application/json
```

### CORS Preflight (OPTIONS)

All endpoints must handle `OPTIONS` requests:

**Request**
```
OPTIONS /intake
```

**Response (200 OK)**
```
[CORS headers only, no body]
```

---

## Authentication & Authorization

### Patient Endpoints
- `/intake` (POST): **No auth required** (public intake submission)
- `/doctors` (GET): **No auth required** (public doctor list)

### Doctor Endpoints
- `/patient/{id}` (GET): **Requires Cognito token + "doctor" group**
- `/doctor-submit` (POST): **Requires Cognito token + "doctor" group**

### Token Validation Flow
```
1. Frontend calls API with Authorization header: "Bearer {idToken}"
2. API Gateway custom authorizer validates token via Cognito
3. Lambda checks user groups using token payload
4. Only "doctor" group members access doctor endpoints
```

---

## API Gateway Setup

### HTTP API (Recommended for simplicity)

```bash
# Create HTTP API
aws apigatewayv2 create-api \
  --name reliefbud-api \
  --protocol-type HTTP \
  --target 'arn:aws:lambda:us-east-1:ACCOUNT_ID:function:lambda-intake'

# Create routes
aws apigatewayv2 create-integration \
  --api-id {api-id} \
  --integration-type AWS_LAMBDA \
  --integration-method POST \
  --payload-format-version '2.0' \
  --target 'arn:aws:lambda:us-east-1:ACCOUNT_ID:function:lambda-intake'

aws apigatewayv2 create-route \
  --api-id {api-id} \
  --route-key 'POST /intake' \
  --target 'integrations/{integration-id}'
```

### REST API (Traditional)

```bash
# Create REST API
aws apigateway create-rest-api \
  --name reliefbud-api \
  --description 'ReliefBud Telemedicine API'

# Create resources and methods
# Note: More verbose than HTTP API
```

---

## Rate Limiting & Quotas (TODO)

- Patient intake: 100 requests/day per IP
- Doctor list: Unlimited
- Patient data fetch: Depends on doctor access policy
- Doctor submit: 500 requests/day per doctor

---

## Webhook Events (Future Enhancement)

Plan for event-based notifications:
- `patient.intake.received`
- `doctor.prescription.ready`
- `patient.assigned.to.doctor`

---

## API Testing Tools

### cURL Examples

**Submit patient intake:**
```bash
curl -X POST https://api.reliefbud.example/intake \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "age": 35,
    "gender": "Male",
    "mainSymptoms": "Headache",
    "symptomDuration": "2 days",
    "painSeverity": 7,
    "preferredDepartment": "General Medicine"
  }'
```

**Fetch doctors:**
```bash
curl -X GET 'https://api.reliefbud.example/doctors?department=Cardiology'
```

### Postman Collection
Import into Postman:
- Base URL: `https://api.reliefbud.example`
- Collections: Intake, Doctors, Patient Data, Doctor Submit
- Environments: dev, staging, production

---

## Version Management

Current version: **v1** (implicit)

Future: Support `/v2` endpoints for breaking changes.

---

## Error Codes Reference

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (no token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 405 | Method Not Allowed |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

---

## Monitoring & Logging

### CloudWatch Metrics to Track
- Request count by endpoint
- Error rate by endpoint
- Lambda execution time
- DynamoDB throttling
- Bedrock API latency

### Log Format
```json
{
  "timestamp": "2024-11-25T10:30:00Z",
  "requestId": "abc-123-def",
  "endpoint": "POST /intake",
  "statusCode": 200,
  "executionTime": 1250,
  "patientId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## References
- AWS API Gateway: https://docs.aws.amazon.com/apigateway/
- Lambda integration: https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html
- RESTful best practices: https://restfulapi.net/
