# Cognito Authentication Setup Guide

## Overview
This guide provides step-by-step instructions for setting up AWS Cognito for patient and doctor authentication in the ReliefBud platform.

---

## 1. Create Cognito User Pool

### AWS Console Steps

1. **Go to Cognito** → User Pools → Create user pool
2. **Configure sign-up experience:**
   - Sign-up attributes: Email, Phone, Name
   - MFA: Optional (enable for doctors)
   - User account recovery: Email
3. **Configure required attributes:**
   - Email (required, must be unique)
   - Name (required)
   - Custom attributes (optional):
     - `medicalLicense` (for doctors)
     - `department` (for doctors)
4. **Configure message delivery:**
   - Email: Use Cognito default (or configure SES)
5. **Review and create**

### CLI Alternative
```bash
aws cognito-idp create-user-pool \
  --pool-name ReliefBudUsers \
  --policies '{
    "PasswordPolicy": {
      "MinimumLength": 12,
      "RequireUppercase": true,
      "RequireLowercase": true,
      "RequireNumbers": true,
      "RequireSymbols": true
    }
  }' \
  --mfa-configuration OPTIONAL \
  --schema '[
    {
      "Name": "email",
      "AttributeDataType": "String",
      "Required": true,
      "Mutable": true
    },
    {
      "Name": "name",
      "AttributeDataType": "String",
      "Required": true,
      "Mutable": true
    }
  ]'
```

### Output
Save these values:
- **User Pool ID**: `us-east-1_xxxxxxxxx`
- **User Pool ARN**: `arn:aws:cognito-idp:us-east-1:ACCOUNT_ID:userpool/us-east-1_xxxxxxxxx`

---

## 2. Create Cognito App Client

### AWS Console Steps

1. **In User Pool** → App integration → App clients → Create app client
2. **Configure app client:**
   - App client name: `ReliefBudWeb`
   - Allowed callback URLs: `https://yourdomain.com/callback`
   - Allowed sign-out URLs: `https://yourdomain.com/logout`
   - OAuth 2.0 scopes: `openid`, `email`, `profile`
   - Allowed OAuth flows: Authorization code flow, Implicit flow
3. **Create app client**

### CLI Alternative
```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id us-east-1_xxxxxxxxx \
  --client-name ReliefBudWeb \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --callback-urls https://yourdomain.com/callback \
  --logout-urls https://yourdomain.com/logout \
  --allowed-o-auth-flows code implicit \
  --allowed-o-auth-scopes openid email profile
```

### Output
Save:
- **Client ID**: `abc123def456ghi`
- **Client Secret**: (if generated; keep secure)

---

## 3. Create User Groups

### Create "doctor" Group

```bash
aws cognito-idp create-group \
  --group-name doctor \
  --user-pool-id us-east-1_xxxxxxxxx \
  --description 'Healthcare professionals' \
  --precedence 1
```

### Create "patient" Group (Optional)

```bash
aws cognito-idp create-group \
  --group-name patient \
  --user-pool-id us-east-1_xxxxxxxxx \
  --description 'Patient users' \
  --precedence 2
```

---

## 4. Configure App Client Settings (Amplify)

### Install Amplify Libraries

```bash
npm install aws-amplify @aws-amplify/auth @aws-amplify/ui-react
```

### Initialize Amplify (in frontend app)

**File: `frontend/js/auth.js` (update placeholder)**

```javascript
import { Amplify, Auth } from 'aws-amplify';

Amplify.configure({
  Auth: {
    region: 'us-east-1',
    userPoolId: 'us-east-1_xxxxxxxxx',           // From step 1
    userPoolWebClientId: 'abc123def456ghi',      // From step 2
    identityPoolId: 'us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
  }
});

// TODO: Replace placeholder functions with actual Amplify calls
export async function patientSignUp(email, password, fullName) {
  try {
    const { user } = await Auth.signUp({
      username: email,
      password,
      attributes: {
        email,
        name: fullName
      }
    });
    return { success: true, userId: user.username };
  } catch (err) {
    console.error('SignUp error:', err);
    return { success: false, error: err.message };
  }
}

export async function patientSignIn(email, password) {
  try {
    const user = await Auth.signIn(email, password);
    const token = (await Auth.currentSession()).getIdToken().getJwtToken();
    return { success: true, userId: user.username, token };
  } catch (err) {
    console.error('SignIn error:', err);
    return { success: false, error: err.message };
  }
}

export async function doctorSignIn(email, password) {
  try {
    const user = await Auth.signIn(email, password);
    const session = await Auth.currentSession();
    const groups = session.getAccessToken().payload['cognito:groups'] || [];
    
    // Verify user is in 'doctor' group
    if (!groups.includes('doctor')) {
      await Auth.signOut();
      throw new Error('User is not authorized as a doctor');
    }
    
    const token = session.getIdToken().getJwtToken();
    return { success: true, userId: user.username, token, userGroup: 'doctor' };
  } catch (err) {
    console.error('Doctor SignIn error:', err);
    return { success: false, error: err.message };
  }
}

export async function getCurrentUser() {
  try {
    const user = await Auth.currentAuthenticatedUser();
    const session = await Auth.currentSession();
    const groups = session.getAccessToken().payload['cognito:groups'] || [];
    return { userId: user.username, email: user.attributes.email, groups };
  } catch {
    return null;
  }
}

export async function userInGroup(groupName) {
  const user = await getCurrentUser();
  if (!user) return false;
  return user.groups.includes(groupName);
}
```

---

## 5. Add Users to Groups

### Add Doctor User to "doctor" Group

```bash
# First, create the user
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_xxxxxxxxx \
  --username dr.smith@hospital.com \
  --user-attributes Name="Dr. Smith",email="dr.smith@hospital.com" \
  --message-action SUPPRESS

# Set permanent password
aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-1_xxxxxxxxx \
  --username dr.smith@hospital.com \
  --password 'SecurePassword123!' \
  --permanent

# Add user to "doctor" group
aws cognito-idp admin-add-user-to-group \
  --user-pool-id us-east-1_xxxxxxxxx \
  --username dr.smith@hospital.com \
  --group-name doctor
```

### Verify Group Membership

```bash
aws cognito-idp admin-list-groups-for-user \
  --user-pool-id us-east-1_xxxxxxxxx \
  --username dr.smith@hospital.com
```

---

## 6. Create Identity Pool (for AWS Resource Access)

### AWS Console Steps

1. **Go to Cognito** → Identity Pools → Create identity pool
2. **Configure:**
   - Identity pool name: `ReliefBudIdentity`
   - Enable access to unauthenticated identities: No (for security)
   - Cognito tab:
     - User Pool ID: `us-east-1_xxxxxxxxx`
     - App Client ID: `abc123def456ghi`
3. **Create pool**

### Attach IAM Roles

#### Authenticated Role (for doctors)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/PatientIntake"
    }
  ]
}
```

#### Unauthenticated Role (for patients - limited)
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:ACCOUNT_ID:table/PatientIntake"
    }
  ]
}
```

---

## 7. Cognito Authorizer for API Gateway

### Create Lambda Authorizer (Token-based)

**File: `backend-template/lambda-authorizer.js`**

```javascript
/**
 * Cognito Token Authorizer for API Gateway
 * 
 * Validates JWT tokens and checks user groups
 */

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const COGNITO_DOMAIN = 'https://us-east-1.auth.amazonaws.com'; // Or your custom domain
const USER_POOL_ID = 'us-east-1_xxxxxxxxx';
const CLIENT_ID = 'abc123def456ghi';

const client = jwksClient({
  jwksUri: `${COGNITO_DOMAIN}/.well-known/jwks.json`
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function(err, key) {
    if (err) {
      callback(err);
    } else {
      const signingKey = key.publicKey || key.rsaPublicKey;
      callback(null, signingKey);
    }
  });
}

exports.handler = function(event, context, callback) {
  const token = event.authorizationToken.split(' ')[1]; // "Bearer TOKEN"

  jwt.verify(token, getKey, {}, function(err, decoded) {
    if (err) {
      console.error('Token verification failed:', err);
      return callback('Unauthorized');
    }

    // Token is valid
    const principalId = decoded.sub;
    const groups = decoded['cognito:groups'] || [];

    const authResponse = {
      principalId,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn
          }
        ]
      },
      context: {
        groups: JSON.stringify(groups),
        userId: principalId,
        email: decoded.email
      }
    };

    callback(null, authResponse);
  });
};
```

### Attach to API Gateway

1. **API Gateway Console** → Authorizers → Create authorizer
2. **Type:** Token
3. **Lambda function:** `lambda-authorizer`
4. **Token source:** `Authorization`
5. **Attach to routes:**
   - `GET /patient/{id}` → Require "doctor" group
   - `POST /doctor-submit` → Require "doctor" group

---

## 8. Testing Authentication Flow

### Patient Sign-Up

```javascript
// In frontend/patientlogin.html
import { Auth } from 'aws-amplify';

async function handlePatientSignUp() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const fullName = document.getElementById('fullName').value;

  try {
    const { user } = await Auth.signUp({
      username: email,
      password,
      attributes: {
        email,
        name: fullName
      }
    });

    alert('Sign-up successful! Check your email for confirmation.');
    // Redirect to email confirmation page
  } catch (err) {
    alert('Sign-up failed: ' + err.message);
  }
}
```

### Patient Sign-In

```javascript
async function handlePatientSignIn() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const user = await Auth.signIn(email, password);
    const session = await Auth.currentSession();
    const token = session.getIdToken().getJwtToken();

    // Store token in sessionStorage
    sessionStorage.setItem('authToken', token);

    // Redirect to intake form
    window.location.href = 'patientform.html';
  } catch (err) {
    alert('Sign-in failed: ' + err.message);
  }
}
```

### Doctor Sign-In

```javascript
async function handleDoctorSignIn() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const user = await Auth.signIn(email, password);
    const session = await Auth.currentSession();
    const groups = session.getAccessToken().payload['cognito:groups'] || [];

    // Verify doctor group
    if (!groups.includes('doctor')) {
      throw new Error('User is not authorized as a doctor');
    }

    const token = session.getIdToken().getJwtToken();
    sessionStorage.setItem('authToken', token);

    // Redirect to doctor dashboard
    window.location.href = 'doc-dashboard.html';
  } catch (err) {
    alert('Login failed: ' + err.message);
  }
}
```

---

## 9. Using Auth Token in API Calls

### Update `frontend/js/api.js`

```javascript
async function apiRequest(url, options = {}) {
  const defaultHeaders = {
    'Content-Type': 'application/json'
  };

  // Add auth token if available
  const token = sessionStorage.getItem('authToken');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: { ...defaultHeaders, ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  // Handle auth errors
  if (response.status === 401) {
    sessionStorage.clear();
    window.location.href = 'index.html'; // Redirect to login
  }

  return await response.json();
}
```

---

## 10. Troubleshooting

### Issue: "Invalid token" errors

**Solution:**
- Verify User Pool ID and Client ID in config
- Check token expiration (tokens expire in 1 hour by default)
- Implement refresh token flow:

```javascript
async function refreshToken() {
  const session = await Auth.currentSession();
  return session.getRefreshToken().getToken();
}
```

### Issue: Doctor group not showing in token

**Solution:**
- Ensure user is added to "doctor" group (see step 5)
- Clear browser cache and re-authenticate
- Check Cognito User Pool → Groups → doctor for membership

### Issue: CORS errors with API calls

**Solution:**
- Ensure API Gateway has CORS enabled
- All Lambda endpoints must return CORS headers
- Test with Postman first to isolate CORS vs. auth issues

---

## References

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [Amplify Auth Guide](https://docs.aws.amazon.com/amplify/latest/userguide/auth.html)
- [JWT Token Verification](https://tools.ietf.org/html/rfc7519)
- [API Gateway Authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-use-lambda-authorizer.html)
