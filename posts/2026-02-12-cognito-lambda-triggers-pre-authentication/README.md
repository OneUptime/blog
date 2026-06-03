# How to Use Cognito Lambda Triggers (Pre Authentication)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, Lambda, Security, Authentication

Description: Implement the Cognito Pre Authentication Lambda trigger to add custom validation before sign-in, including IP blocking, account lockout, and audit logging.

---

The Pre Authentication trigger fires when a user attempts to sign in, right before Cognito validates their credentials. It gives you a chance to block the authentication attempt, log it, check custom conditions, or run security validations. Unlike Pre Sign-Up which fires once per user, Pre Authentication fires on sign-in attempts, except for cases like existing-session renewal.

## When the Trigger Fires

The Pre Authentication trigger fires on:

- **PreAuthentication_Authentication** - Standard sign-in attempts

It fires before Cognito checks the password. If you throw an error, the user never gets authenticated, and Cognito doesn't even tell them whether the password was right.

## Basic Setup

```hcl
resource "aws_lambda_function" "pre_auth" {
  filename         = data.archive_file.pre_auth.output_path
  source_code_hash = data.archive_file.pre_auth.output_base64sha256
  function_name    = "cognito-pre-authentication"
  role             = aws_iam_role.pre_auth_role.arn
  handler          = "index.handler"
  runtime          = "nodejs24.x"
  timeout          = 5

  environment {
    variables = {
      AUTH_LOG_TABLE = aws_dynamodb_table.auth_logs.name
    }
  }
}

resource "aws_lambda_permission" "cognito_pre_auth" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.pre_auth.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

resource "aws_cognito_user_pool" "main" {
  name = "my-app-user-pool"

  lambda_config {
    pre_authentication = aws_lambda_function.pre_auth.arn
  }
}
```

## The Event Object

```javascript
{
  "version": "1",
  "triggerSource": "PreAuthentication_Authentication",
  "region": "us-east-1",
  "userPoolId": "us-east-1_XXXXXXXXX",
  "userName": "abc123-def456",
  "callerContext": {
    "awsSdkVersion": "aws-sdk-nodejs-3.x",
    "clientId": "your-app-client-id"
  },
  "request": {
    "userAttributes": {
      "sub": "abc123-def456",
      "email": "user@example.com",
      "email_verified": "true",
      "name": "Jane Doe",
      "custom:organization": "Acme Inc"
    },
    "validationData": {},
    "userNotFound": false
  },
  "response": {}
}
```

## Use Case 1: Account Lockout After Failed Attempts

Cognito has built-in temporary lockouts for repeated failed passwords, but you can add your own longer or policy-specific lockout:

```javascript
// account-lockout.mjs
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

const dynamodb = new DynamoDBClient({});
const TABLE_NAME = process.env.AUTH_LOG_TABLE;
const MAX_FAILED_ATTEMPTS = 5;

export const handler = async (event) => {
  const userId = event.request.userAttributes.sub;

  // Check if the account is locked
  const getCommand = new GetItemCommand({
    TableName: TABLE_NAME,
    Key: { userId: { S: userId } }
  });

  const result = await dynamodb.send(getCommand);
  const item = result.Item;

  if (item) {
    const failedAttempts = parseInt(item.failedAttempts?.N || '0');
    const lockoutUntil = parseInt(item.lockoutUntil?.N || '0');
    const now = Math.floor(Date.now() / 1000);

    // Check if currently locked out
    if (lockoutUntil > now) {
      const minutesLeft = Math.ceil((lockoutUntil - now) / 60);
      throw new Error(
        `Account is temporarily locked. Try again in ${minutesLeft} minutes.`
      );
    }

    // Check if approaching lockout (for logging)
    if (failedAttempts >= MAX_FAILED_ATTEMPTS - 1) {
      console.warn('Account approaching lockout:', userId);
    }
  }

  return event;
};
```

You'll also need to track failed attempts outside this trigger, such as in the backend that calls Cognito and records failed `InitiateAuth` or `AdminInitiateAuth` responses. Post Authentication only runs after successful authentication, so it can reset counters after a successful sign-in but can't count failed password attempts.

## Use Case 2: IP-Based Access Control

Block sign-ins from specific IPs or restrict to known networks:

```javascript
// ip-control.mjs
const BLOCKED_IPS = new Set([
  '192.168.1.100',
  '10.0.0.50'
]);

const ALLOWED_CIDRS = [
  '203.0.113.0/24',  // Office network
  '198.51.100.0/24'  // VPN range
];

export const handler = async (event) => {
  // ClientMetadata from InitiateAuth/AdminInitiateAuth is passed as validationData
  const sourceIp = event.request.validationData?.sourceIp;

  if (!sourceIp) {
    // If no IP provided, allow (or block, depending on your policy)
    console.warn('No source IP provided in authentication request');
    return event;
  }

  // Check blocklist
  if (BLOCKED_IPS.has(sourceIp)) {
    console.warn('Blocked IP attempted sign-in:', sourceIp);
    throw new Error('Sign-in is not available. Please contact support.');
  }

  // Optional: Check allowlist for admin users
  const isAdmin = event.request.userAttributes['custom:role'] === 'admin';
  if (isAdmin && ALLOWED_CIDRS.length > 0) {
    const isAllowed = ALLOWED_CIDRS.some(cidr => isInCidr(sourceIp, cidr));
    if (!isAllowed) {
      console.warn('Admin sign-in from unauthorized IP:', sourceIp, 'User:', event.userName);
      throw new Error('Admin access is restricted to authorized networks.');
    }
  }

  return event;
};

function isInCidr(ip, cidr) {
  const [range, bits] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits)) - 1);
  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(range);
  return (ipNum & mask) === (rangeNum & mask);
}

function ipToNumber(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0);
}
```

To pass the IP from your application:

```javascript
// In your frontend - pass metadata with sign-in
import { signIn } from 'aws-amplify/auth';

async function loginWithMetadata(email, password) {
  const result = await signIn({
    username: email,
    password: password,
    options: {
      clientMetadata: {
        sourceIp: await getClientIp()  // Fetch from a service
      }
    }
  });
  return result;
}
```

For security-sensitive IP checks, set this metadata from a trusted backend or edge layer. Client-supplied metadata is useful context, but users can tamper with it.

## Use Case 3: Business Hours Restriction

Limit sign-ins to business hours for certain user types:

```javascript
// business-hours.mjs
export const handler = async (event) => {
  const userRole = event.request.userAttributes['custom:role'] || 'user';

  // Only restrict contractor accounts
  if (userRole !== 'contractor') {
    return event;
  }

  const now = new Date();
  const hour = now.getUTCHours();
  const day = now.getUTCDay();

  // Allow Monday-Friday, 8am-8pm UTC
  const isWeekday = day >= 1 && day <= 5;
  const isBusinessHours = hour >= 8 && hour < 20;

  if (!isWeekday || !isBusinessHours) {
    throw new Error('Contractor access is limited to business hours (Mon-Fri, 8am-8pm UTC).');
  }

  return event;
};
```

## Use Case 4: Audit Logging

Log every authentication attempt for security auditing:

```javascript
// audit-log.mjs
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { randomUUID } from 'crypto';

const dynamodb = new DynamoDBClient({});
const TABLE_NAME = process.env.AUTH_LOG_TABLE;

export const handler = async (event) => {
  const { userAttributes } = event.request;
  const now = new Date();

  // Log the authentication attempt
  const logEntry = {
    id: { S: randomUUID() },
    userId: { S: userAttributes.sub },
    email: { S: userAttributes.email },
    timestamp: { S: now.toISOString() },
    triggerSource: { S: event.triggerSource },
    clientId: { S: event.callerContext.clientId },
    region: { S: event.region },
    sourceIp: { S: event.request.validationData?.sourceIp || 'unknown' },
    userAgent: { S: event.request.validationData?.userAgent || 'unknown' },
    // TTL for auto-cleanup (90 days)
    ttl: { N: String(Math.floor(now.getTime() / 1000) + (90 * 86400)) }
  };

  const command = new PutItemCommand({
    TableName: TABLE_NAME,
    Item: logEntry
  });

  try {
    await dynamodb.send(command);
  } catch (error) {
    // Log to CloudWatch as fallback
    console.error('Failed to write audit log:', error);
    console.log('Audit entry:', JSON.stringify(logEntry));
  }

  // Always return the event - audit logging shouldn't block sign-in
  return event;
};
```

## Use Case 5: Feature Flag Check

Block sign-in when your system is in maintenance mode:

```javascript
// maintenance-check.mjs
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

const ssm = new SSMClient({});
let cachedMaintenanceMode = null;
let cacheExpiry = 0;

export const handler = async (event) => {
  const now = Date.now();

  // Cache the parameter for 60 seconds
  if (cachedMaintenanceMode === null || now > cacheExpiry) {
    const command = new GetParameterCommand({
      Name: '/myapp/maintenance-mode'
    });

    try {
      const result = await ssm.send(command);
      cachedMaintenanceMode = result.Parameter.Value === 'true';
      cacheExpiry = now + 60000;
    } catch (error) {
      // If we can't check, allow sign-in
      cachedMaintenanceMode = false;
    }
  }

  if (cachedMaintenanceMode) {
    // Allow admin users even during maintenance
    const isAdmin = event.request.userAttributes['custom:role'] === 'admin';
    if (!isAdmin) {
      throw new Error(
        'The service is currently under maintenance. Please try again later.'
      );
    }
  }

  return event;
};
```

## Performance Considerations

Since Pre Authentication fires on every sign-in, performance matters:

- Keep the Lambda timeout short (3-5 seconds)
- Use in-memory caching for frequently checked values
- Keep the Lambda warm for consistent response times
- Avoid unnecessary external API calls
- Use `Promise.allSettled()` if you need multiple async operations

```hcl
# Provisioned concurrency for consistent performance

resource "aws_lambda_provisioned_concurrency_config" "pre_auth" {
  function_name                     = aws_lambda_function.pre_auth.function_name
  provisioned_concurrent_executions = 5
  qualifier                         = aws_lambda_alias.pre_auth.name
}

resource "aws_lambda_alias" "pre_auth" {
  name             = "live"
  description      = "Live pre-authentication trigger"
  function_name    = aws_lambda_function.pre_auth.function_name
  function_version = aws_lambda_function.pre_auth.version
}
```

Set `publish = true` on the Lambda function and point the Cognito trigger at the alias ARN. Provisioned concurrency applies to a published version or alias, not `$LATEST`.

For the trigger that fires after successful authentication, see [Cognito Lambda triggers for post authentication](https://oneuptime.com/blog/post/2026-02-12-cognito-lambda-triggers-post-authentication/view).

## Summary

Pre Authentication is your security checkpoint. Every sign-in attempt passes through it, making it the right place for access control, lockout policies, audit logging, and maintenance mode checks. Keep it fast since users are actively waiting, handle errors gracefully with user-friendly messages, and cache any external lookups to minimize latency. Combined with Post Authentication for success tracking, you get full visibility and control over the authentication lifecycle.
