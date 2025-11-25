# ReliefBud Backend Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the ReliefBud telemedicine backend on AWS. The architecture includes:

- **Lambda**: Serverless compute for business logic
- **API Gateway**: HTTP endpoints for frontend communication
- **DynamoDB**: NoSQL database for patient intakes and doctor responses
- **Bedrock**: AI-powered patient summary generation (Claude 3 Sonnet)
- **Cognito**: User authentication and authorization

---

## Architecture Diagram

```
Frontend (HTML/CSS/JS)
      ↓
   [api.js]
      ↓
API Gateway Endpoints
   ├─ POST /intake → lambda-intake.js
   ├─ GET  /doctors → lambda-doctors.js
   ├─ GET  /patient/{id} → lambda-getPatient.js (TODO)
   └─ POST /doctor-submit → lambda-doctorSubmit.js

Lambda Functions
   ├─ lambda-intake.js
   │  └─ → Bedrock (AI Summary)
   │  └─ → DynamoDB (PatientIntake table)
   │
   ├─ lambda-doctors.js
   │  └─ → DynamoDB (Doctors list or static)
   │
   ├─ lambda-doctorSubmit.js
   │  └─ → DynamoDB (Update intake with response)
   │  └─ → SNS (Notify patient)
   │
   └─ lambda-authorizer.js (Optional, for JWT validation)

Cognito
   ├─ User Pool (authentication)
   ├─ Groups (patient, doctor)
   └─ Identity Pool (AWS resource access)

DynamoDB
   ├─ PatientIntake table
   └─ (optional) Doctors table
```

---

## Prerequisites

### Required AWS Services
- AWS Lambda (Node.js 18.x runtime)
- AWS API Gateway (HTTP or REST)
- AWS DynamoDB
- AWS Bedrock (Claude 3 Sonnet access required)
- AWS Cognito (optional, for auth)

### Required Tools
- AWS CLI v2 (configured with credentials)
- Node.js 18.x
- npm or yarn
- Git

### AWS IAM Permissions
Ensure your IAM user has permissions for:
- Lambda (create, update, deploy)
- API Gateway (create, manage)
- DynamoDB (create table, read/write)
- Bedrock (InvokeModel)
- Cognito (create user pool, manage users)
- CloudWatch (view logs)

---

## Step 1: Clone/Download Backend Template

```bash
# Navigate to your project directory
cd path/to/reliefbud-project

# Your project structure should look like:
# reliefbud/
# ├── backend-template/
# │   ├── lambda-intake.js
# │   ├── lambda-doctors.js
# │   ├── lambda-doctorSubmit.js
# │   ├── dynamodb-schema.json
# │   ├── bedrock-prompt.md
# │   ├── api-structure.md
# │   ├── cognito-structure.md
# │   └── README.md (this file)
# ├── frontend/
# │   ├── js/
# │   │   ├── api.js
# │   │   ├── patient.js
# │   │   ├── auth.js
# │   │   └── doctor.js
# │   ├── css/
# │   │   ├── style.css
# │   │   ├── patient.css
# │   │   └── doc.css
# │   ├── index.html
# │   ├── patientlogin.html
# │   ├── patientform.html
# │   ├── psuccessful.html
# │   ├── doc.html
# │   └── doc-dashboard.html
```

---

## Step 2: Create DynamoDB Table

### Option A: AWS Console (Easiest)

1. Go to **DynamoDB** → **Tables** → **Create table**
2. **Table name**: `PatientIntake`
3. **Partition key**: `patientId` (String)
4. **Sort key**: `createdAt` (String)
5. **Billing mode**: `Pay per request`
6. **Scroll to Global secondary indexes**:
   - Click **Create GSI**
   - **Partition key**: `preferredDepartment`
   - **Sort key**: `receivedAtEpoch`
   - **Index name**: `preferredDepartment-receivedAtEpoch-index`
7. Click **Create table**

### Option B: AWS CLI

```bash
# Create table from schema file
aws dynamodb create-table \
  --table-name PatientIntake \
  --attribute-definitions \
    AttributeName=patientId,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
    AttributeName=preferredDepartment,AttributeType=S \
    AttributeName=receivedAtEpoch,AttributeType=N \
  --key-schema \
    AttributeName=patientId,KeyType=HASH \
    AttributeName=createdAt,KeyType=RANGE \
  --global-secondary-indexes \
    IndexName=preferredDepartment-receivedAtEpoch-index,Keys=[{AttributeName=preferredDepartment,KeyType=HASH},{AttributeName=receivedAtEpoch,KeyType=RANGE}],Projection={ProjectionType=ALL} \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

### Option C: CloudFormation (Infrastructure as Code)

```bash
# Create CloudFormation stack
aws cloudformation create-stack \
  --stack-name reliefbud-dynamodb \
  --template-body file://backend-template/cloudformation-dynamodb.yml \
  --region us-east-1

# Wait for stack creation
aws cloudformation wait stack-create-complete \
  --stack-name reliefbud-dynamodb \
  --region us-east-1
```

### Verify Table Creation

```bash
aws dynamodb describe-table --table-name PatientIntake --region us-east-1
```

---

## Step 3: Package Lambda Functions

### Create Lambda Directories

```bash
# Create separate directories for each Lambda
mkdir -p lambda/{intake,doctors,doctor-submit,authorizer}

# Copy Lambda code
cp backend-template/lambda-intake.js lambda/intake/index.js
cp backend-template/lambda-doctors.js lambda/doctors/index.js
cp backend-template/lambda-doctorSubmit.js lambda/doctor-submit/index.js
```

### Install Dependencies

```bash
# For lambda-intake (has AWS SDK dependencies)
cd lambda/intake
npm init -y
npm install @aws-sdk/client-dynamodb \
            @aws-sdk/lib-dynamodb \
            @aws-sdk/client-bedrock-runtime
cd ../..

# For lambda-doctors (minimal dependencies)
cd lambda/doctors
npm init -y
cd ../..

# For lambda-doctor-submit
cd lambda/doctor-submit
npm init -y
npm install @aws-sdk/client-dynamodb \
            @aws-sdk/lib-dynamodb \
            @aws-sdk/client-sns
cd ../..
```

### Create Deployment Packages

```bash
# Lambda: Intake
cd lambda/intake
zip -r ../../lambda-intake.zip . -x ".git/*" ".gitignore"
cd ../..

# Lambda: Doctors
cd lambda/doctors
zip -r ../../lambda-doctors.zip . -x ".git/*" ".gitignore"
cd ../..

# Lambda: Doctor Submit
cd lambda/doctor-submit
zip -r ../../lambda-doctor-submit.zip . -x ".git/*" ".gitignore"
cd ../..

# Verify zips created
ls -lh lambda-*.zip
```

---

## Step 4: Deploy Lambda Functions

### Create IAM Role for Lambda

```bash
# Create trust policy document
cat > lambda-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role
aws iam create-role \
  --role-name ReliefBudLambdaRole \
  --assume-role-policy-document file://lambda-trust-policy.json

# Save the role ARN for later
ROLE_ARN=$(aws iam get-role --role-name ReliefBudLambdaRole --query 'Role.Arn' --output text)
echo "Role ARN: $ROLE_ARN"
```

### Attach Policies to Role

```bash
# DynamoDB permissions
aws iam put-role-policy \
  --role-name ReliefBudLambdaRole \
  --policy-name DynamoDBAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ],
        "Resource": "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/PatientIntake"
      }
    ]
  }'

# Bedrock permissions
aws iam put-role-policy \
  --role-name ReliefBudLambdaRole \
  --policy-name BedrockAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "bedrock:InvokeModel"
        ],
        "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet"
      }
    ]
  }'

# CloudWatch Logs (required for Lambda to write logs)
aws iam attach-role-policy \
  --role-name ReliefBudLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# SNS permissions (for doctor-submit)
aws iam put-role-policy \
  --role-name ReliefBudLambdaRole \
  --policy-name SNSAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "sns:Publish"
        ],
        "Resource": "arn:aws:sns:us-east-1:ACCOUNT_ID:*"
      }
    ]
  }'
```

### Deploy Lambda: Intake Handler

```bash
aws lambda create-function \
  --function-name reliefbud-intake \
  --runtime nodejs18.x \
  --role $ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://lambda-intake.zip \
  --timeout 60 \
  --memory-size 256 \
  --environment Variables='{
    DYNAMODB_TABLE=PatientIntake,
    BEDROCK_MODEL_ID=anthropic.claude-3-sonnet,
    AWS_REGION=us-east-1
  }' \
  --region us-east-1

# Get function details
aws lambda get-function --function-name reliefbud-intake --region us-east-1
```

### Deploy Lambda: Doctors Handler

```bash
aws lambda create-function \
  --function-name reliefbud-doctors \
  --runtime nodejs18.x \
  --role $ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://lambda-doctors.zip \
  --timeout 30 \
  --memory-size 128 \
  --region us-east-1
```

### Deploy Lambda: Doctor Submit Handler

```bash
aws lambda create-function \
  --function-name reliefbud-doctor-submit \
  --runtime nodejs18.x \
  --role $ROLE_ARN \
  --handler index.handler \
  --zip-file fileb://lambda-doctor-submit.zip \
  --timeout 30 \
  --memory-size 128 \
  --environment Variables='{
    DYNAMODB_TABLE=PatientIntake,
    PATIENT_NOTIFICATION_TOPIC_ARN=arn:aws:sns:us-east-1:ACCOUNT_ID:patient-notifications,
    AWS_REGION=us-east-1
  }' \
  --region us-east-1
```

### Verify Lambda Deployments

```bash
# List all functions
aws lambda list-functions --region us-east-1 --query 'Functions[*].[FunctionName,Runtime]' --output table
```

---

## Step 5: Create API Gateway

### Option A: HTTP API (Recommended - Simpler)

```bash
# Create HTTP API
API_ID=$(aws apigatewayv2 create-api \
  --name reliefbud-api \
  --protocol-type HTTP \
  --cors-configuration \
    'AllowOrigins=*,AllowMethods=GET,POST,OPTIONS,AllowHeaders=*,MaxAge=300' \
  --target arn:aws:lambda:us-east-1:ACCOUNT_ID:function:reliefbud-intake \
  --query 'ApiId' \
  --output text \
  --region us-east-1)

echo "API ID: $API_ID"

# Grant API Gateway permission to invoke Lambda: Intake
aws lambda add-permission \
  --function-name reliefbud-intake \
  --statement-id AllowAPIGatewayInvoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --region us-east-1

# Grant API Gateway permission to invoke Lambda: Doctors
aws lambda add-permission \
  --function-name reliefbud-doctors \
  --statement-id AllowAPIGatewayInvoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --region us-east-1

# Grant API Gateway permission to invoke Lambda: Doctor Submit
aws lambda add-permission \
  --function-name reliefbud-doctor-submit \
  --statement-id AllowAPIGatewayInvoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --region us-east-1
```

### Create Routes

```bash
# POST /intake
INTAKE_INTEGRATION=$(aws apigatewayv2 create-integration \
  --api-id $API_ID \
  --integration-type AWS_LAMBDA \
  --integration-method POST \
  --payload-format-version '2.0' \
  --target arn:aws:lambda:us-east-1:ACCOUNT_ID:function:reliefbud-intake \
  --query 'IntegrationId' \
  --output text \
  --region us-east-1)

aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key 'POST /intake' \
  --target integrations/$INTAKE_INTEGRATION \
  --region us-east-1

# GET /doctors
DOCTORS_INTEGRATION=$(aws apigatewayv2 create-integration \
  --api-id $API_ID \
  --integration-type AWS_LAMBDA \
  --integration-method POST \
  --payload-format-version '2.0' \
  --target arn:aws:lambda:us-east-1:ACCOUNT_ID:function:reliefbud-doctors \
  --query 'IntegrationId' \
  --output text \
  --region us-east-1)

aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key 'GET /doctors' \
  --target integrations/$DOCTORS_INTEGRATION \
  --region us-east-1

# POST /doctor-submit
SUBMIT_INTEGRATION=$(aws apigatewayv2 create-integration \
  --api-id $API_ID \
  --integration-type AWS_LAMBDA \
  --integration-method POST \
  --payload-format-version '2.0' \
  --target arn:aws:lambda:us-east-1:ACCOUNT_ID:function:reliefbud-doctor-submit \
  --query 'IntegrationId' \
  --output text \
  --region us-east-1)

aws apigatewayv2 create-route \
  --api-id $API_ID \
  --route-key 'POST /doctor-submit' \
  --target integrations/$SUBMIT_INTEGRATION \
  --region us-east-1
```

### Create Deployment

```bash
# Create stage
STAGE=$(aws apigatewayv2 create-stage \
  --api-id $API_ID \
  --stage-name prod \
  --auto-deploy \
  --query 'StageName' \
  --output text \
  --region us-east-1)

# Get API Endpoint
API_ENDPOINT=$(aws apigatewayv2 get-api \
  --api-id $API_ID \
  --query 'ApiEndpoint' \
  --output text \
  --region us-east-1)

echo "API Endpoint: $API_ENDPOINT"
echo "Full endpoint: $API_ENDPOINT/prod"
```

### Option B: REST API (Traditional)

See AWS documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/create-api-using-aws-cli.html

---

## Step 6: Update Frontend API URLs

### Update `frontend/js/api.js`

```bash
# Replace placeholders with actual API URLs
INTAKE_URL="$API_ENDPOINT/prod/intake"
DOCTORS_URL="$API_ENDPOINT/prod/doctors"
DOCTOR_SUBMIT_URL="$API_ENDPOINT/prod/doctor-submit"

# Edit frontend/js/api.js
# Change:
# const API_URL_INTAKE = "===replace_with_API===";
# To:
# const API_URL_INTAKE = "$INTAKE_URL";
# etc.
```

Example edited `api.js`:
```javascript
const API_URL_INTAKE = "https://abc123.execute-api.us-east-1.amazonaws.com/prod/intake";
const API_URL_DOCTORS = "https://abc123.execute-api.us-east-1.amazonaws.com/prod/doctors";
const API_URL_DOCTOR_SUBMIT = "https://abc123.execute-api.us-east-1.amazonaws.com/prod/doctor-submit";
```

---

## Step 7: Deploy Frontend (Optional)

### Option A: AWS S3 + CloudFront

```bash
# Create S3 bucket
BUCKET_NAME="reliefbud-frontend-$(date +%s)"
aws s3 mb s3://$BUCKET_NAME --region us-east-1

# Enable static website hosting
aws s3api put-bucket-website \
  --bucket $BUCKET_NAME \
  --website-configuration '{
    "IndexDocument": {"Suffix": "index.html"},
    "ErrorDocument": {"Key": "index.html"}
  }'

# Upload frontend files
aws s3 sync frontend/ s3://$BUCKET_NAME/ \
  --exclude ".git/*" \
  --exclude "node_modules/*" \
  --delete

# Create CloudFront distribution (optional, for HTTPS)
# See AWS documentation
```

### Option B: Deploy locally

```bash
# Serve frontend locally
python -m http.server --directory frontend 8000

# Visit http://localhost:8000 in browser
```

---

## Step 8: Set Up Cognito (Optional but Recommended)

See `cognito-structure.md` for detailed steps:

```bash
# Create User Pool
aws cognito-idp create-user-pool --pool-name ReliefBudUsers ...

# Create App Client
aws cognito-idp create-user-pool-client --user-pool-id ... ...

# Create Groups
aws cognito-idp create-group --group-name doctor ...

# Update frontend/js/auth.js with Cognito config
```

---

## Step 9: Testing

### Test Intake Endpoint

```bash
curl -X POST https://abc123.execute-api.us-east-1.amazonaws.com/prod/intake \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "John Doe",
    "age": 35,
    "gender": "Male",
    "mainSymptoms": "Headache",
    "symptomDuration": "2 days",
    "painSeverity": 7,
    "medicalHistory": "None",
    "currentMedications": "None",
    "allergies": "Penicillin",
    "preferredDepartment": "General Medicine"
  }'
```

Expected response:
```json
{
  "status": "ok",
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Patient intake received and queued for processing"
}
```

### Test Doctors Endpoint

```bash
curl -X GET 'https://abc123.execute-api.us-east-1.amazonaws.com/prod/doctors?department=Cardiology'
```

### Check DynamoDB

```bash
aws dynamodb scan --table-name PatientIntake --region us-east-1
```

### Check CloudWatch Logs

```bash
# View logs for intake Lambda
aws logs tail /aws/lambda/reliefbud-intake --follow --region us-east-1
```

---

## Step 10: Monitoring & Troubleshooting

### CloudWatch Metrics

```bash
# Check Lambda invocations
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=reliefbud-intake \
  --start-time 2024-11-25T00:00:00Z \
  --end-time 2024-11-26T00:00:00Z \
  --period 3600 \
  --statistics Sum \
  --region us-east-1
```

### CloudWatch Alarms

```bash
# Create alarm for Lambda errors
aws cloudwatch put-metric-alarm \
  --alarm-name reliefbud-intake-errors \
  --alarm-description 'Alert on Lambda errors' \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --region us-east-1
```

### Common Issues

#### Issue: "Unable to assume role"
**Solution:** Check IAM role ARN and permissions

#### Issue: "DynamoDB ConditionalCheckFailedException"
**Solution:** Verify table exists and environment variables are set

#### Issue: "Bedrock API call failed"
**Solution:** 
- Ensure Bedrock access in your region
- Check IAM permissions
- Verify model ID is correct

#### Issue: "CORS error from frontend"
**Solution:**
- Enable CORS in API Gateway
- Verify Lambda returns CORS headers
- Check browser console for exact error

---

## Step 11: Production Checklist

Before going live, ensure:

- [ ] DynamoDB table created and backed up
- [ ] All Lambda functions deployed with correct environment variables
- [ ] API Gateway endpoints tested and working
- [ ] CloudWatch logs enabled and monitored
- [ ] CloudWatch alarms configured
- [ ] Frontend URLs updated with correct API endpoints
- [ ] SSL/TLS certificate configured (HTTPS)
- [ ] CORS configured correctly
- [ ] Cognito User Pool created (if using auth)
- [ ] IAM policies follow least-privilege principle
- [ ] Error handling and logging in place
- [ ] Bedrock region has Claude 3 Sonnet available
- [ ] DynamoDB point-in-time recovery enabled
- [ ] Cost monitoring enabled

---

## Step 12: Cleanup (If Needed)

```bash
# Delete API Gateway
aws apigatewayv2 delete-api --api-id $API_ID --region us-east-1

# Delete Lambda functions
aws lambda delete-function --function-name reliefbud-intake --region us-east-1
aws lambda delete-function --function-name reliefbud-doctors --region us-east-1
aws lambda delete-function --function-name reliefbud-doctor-submit --region us-east-1

# Delete IAM role
aws iam delete-role --role-name ReliefBudLambdaRole

# Delete DynamoDB table
aws dynamodb delete-table --table-name PatientIntake --region us-east-1

# Empty and delete S3 bucket (if used)
aws s3 rm s3://$BUCKET_NAME --recursive
aws s3 rb s3://$BUCKET_NAME
```

---

## Next Steps

1. **Complete TODO items** in Lambda code for Bedrock integration
2. **Implement patient notification** (SNS topic for doctor responses)
3. **Add doctor dashboard backend** (GET /patient/{id} endpoint)
4. **Set up CI/CD pipeline** (GitHub Actions → Lambda deployment)
5. **Add monitoring dashboard** (CloudWatch dashboards)
6. **Load testing** (verify API can handle expected traffic)

---

## Support & References

- AWS Documentation: https://docs.aws.amazon.com/
- Lambda Node.js 18: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html
- Bedrock API: https://docs.aws.amazon.com/bedrock/latest/userguide/
- DynamoDB: https://docs.aws.amazon.com/dynamodb/
- API Gateway: https://docs.aws.amazon.com/apigateway/
- Cognito: https://docs.aws.amazon.com/cognito/

---

## Contact

For questions about the deployment process, refer to the specific documentation files:
- `api-structure.md` - API endpoint details
- `bedrock-prompt.md` - AI integration guide
- `cognito-structure.md` - Authentication setup
- `dynamodb-schema.json` - Database schema

Good luck with your deployment! 🚀
