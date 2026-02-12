# How to Use Cognito Lambda Triggers (Post Authentication)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, Lambda, Security, Serverless

Description: Implement the Cognito Post Authentication Lambda trigger to track sign-ins, update user metadata, detect anomalies, and sync user data after successful login.

---

The Post Authentication trigger fires after Cognito successfully validates a user's credentials - the password was correct, MFA passed, and the user is now authenticated. This is where you record successful sign-ins, update user profiles, detect unusual patterns, and synchronize data. Since authentication already succeeded, this trigger can't block sign-in, but it can log, update, and notify.

## When the Trigger Fires

The trigger fires on:

- **PostAuthentication_Authentication** - After a successful sign-in

It does not fire on token refresh - only actual authentication events. This makes it reliable for counting sign-ins.

## Basic Setup

```hcl
resource "aws_lambda_function" "post_auth" {
  filename         = data.archive_file.post_auth.output_path
  source_code_hash = data.archive_file.post_auth.output_base64sha256
  function_name    = "cognito-post-authentication"
  role             = aws_iam_role.post_auth_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10

  environment {
    variables = {
      USERS_TABLE    = aws_dynamodb_table.users.name
      AUTH_LOG_TABLE = aws_dynamodb_table.auth_logs.name
    }
  }
}

resource "aws_lambda_permission" "cognito_post_auth" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.post_auth.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

resource "aws_cognito_user_pool" "main" {
  name = "my-app-user-pool"

  lambda_config {
    post_authentication = aws_lambda_function.post_auth.arn
  }
}
```

## The Event Object

```javascript
{
  "version": "1",
  "triggerSource": "PostAuthentication_Authentication",
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
      "custom:organization": "Acme Inc",
      "custom:login_count": "42"
    },
    "newDeviceUsed": false,
    "clientMetadata": {}
  },
  "response": {}
}
```

## Use Case 1: Track Sign-In Activity

Record every successful sign-in for analytics and security:

```javascript
// track-signin.mjs
import { DynamoDBClient, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { randomUUID } from 'crypto';

const dynamodb = new DynamoDBClient({});
const AUTH_LOG_TABLE = process.env.AUTH_LOG_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;

export const handler = async (event) => {
  const { userAttributes } = event.request;
  const now = new Date();

  // Run both operations in parallel
  await Promise.allSettled([
    logSignIn(event, userAttributes, now),
    updateLastLogin(userAttributes.sub, now)
  ]);

  return event;
};

async function logSignIn(event, attrs, timestamp) {
  const command = new PutItemCommand({
    TableName: AUTH_LOG_TABLE,
    Item: {
      id: { S: randomUUID() },
      userId: { S: attrs.sub },
      email: { S: attrs.email },
      timestamp: { S: timestamp.toISOString() },
      event: { S: 'SIGN_IN_SUCCESS' },
      clientId: { S: event.callerContext.clientId },
      newDevice: { BOOL: event.request.newDeviceUsed || false },
      sourceIp: { S: event.request.clientMetadata?.sourceIp || 'unknown' },
      ttl: { N: String(Math.floor(timestamp.getTime() / 1000) + (90 * 86400)) }
    }
  });

  await dynamodb.send(command);
}

async function updateLastLogin(userId, timestamp) {
  const command = new UpdateItemCommand({
    TableName: USERS_TABLE,
    Key: { userId: { S: userId } },
    UpdateExpression: 'SET lastLoginAt = :ts, loginCount = if_not_exists(loginCount, :zero) + :one',
    ExpressionAttributeValues: {
      ':ts': { S: timestamp.toISOString() },
      ':zero': { N: '0' },
      ':one': { N: '1' }
    }
  });

  await dynamodb.send(command);
}
```

## Use Case 2: New Device Detection

Alert users when they sign in from a new device:

```javascript
// new-device-alert.mjs
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({});

export const handler = async (event) => {
  // Check if this is a new device
  if (event.request.newDeviceUsed) {
    const { userAttributes } = event.request;
    const metadata = event.request.clientMetadata || {};

    await sendNewDeviceAlert(
      userAttributes.email,
      userAttributes.name || 'User',
      metadata
    );
  }

  return event;
};

async function sendNewDeviceAlert(email, name, metadata) {
  const command = new SendEmailCommand({
    Source: process.env.FROM_EMAIL,
    Destination: {
      ToAddresses: [email]
    },
    Message: {
      Subject: {
        Data: 'New sign-in to your MyApp account'
      },
      Body: {
        Html: {
          Data: `
            <h2>New sign-in detected</h2>
            <p>Hi ${name},</p>
            <p>We noticed a new sign-in to your account:</p>
            <ul>
              <li>Time: ${new Date().toUTCString()}</li>
              <li>IP: ${metadata.sourceIp || 'Unknown'}</li>
              <li>Browser: ${metadata.userAgent || 'Unknown'}</li>
            </ul>
            <p>If this wasn't you, please change your password immediately.</p>
          `
        }
      }
    }
  });

  try {
    await ses.send(command);
  } catch (error) {
    console.error('Failed to send device alert:', error);
  }
}
```

## Use Case 3: Reset Failed Attempt Counter

If you implement account lockout in Pre Authentication, reset the counter on successful login:

```javascript
// reset-lockout.mjs
import { DynamoDBClient, DeleteItemCommand } from '@aws-sdk/client-dynamodb';

const dynamodb = new DynamoDBClient({});
const TABLE_NAME = process.env.AUTH_LOG_TABLE;

export const handler = async (event) => {
  const userId = event.request.userAttributes.sub;

  // Clear the failed attempts record
  const command = new DeleteItemCommand({
    TableName: TABLE_NAME,
    Key: { userId: { S: userId } }
  });

  try {
    await dynamodb.send(command);
  } catch (error) {
    console.error('Failed to reset lockout counter:', error);
  }

  return event;
};
```

## Use Case 4: Sync User Data

Keep your application database in sync with Cognito attributes:

```javascript
// sync-user-data.mjs
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';

const dynamodb = new DynamoDBClient({});
const TABLE_NAME = process.env.USERS_TABLE;

export const handler = async (event) => {
  const { userAttributes } = event.request;

  // Sync Cognito attributes to your app's user table
  const command = new UpdateItemCommand({
    TableName: TABLE_NAME,
    Key: { userId: { S: userAttributes.sub } },
    UpdateExpression: `
      SET email = :email,
          #name = :name,
          emailVerified = :verified,
          lastSyncAt = :now,
          updatedAt = :now
    `,
    ExpressionAttributeNames: {
      '#name': 'name'
    },
    ExpressionAttributeValues: {
      ':email': { S: userAttributes.email },
      ':name': { S: userAttributes.name || '' },
      ':verified': { BOOL: userAttributes.email_verified === 'true' },
      ':now': { S: new Date().toISOString() }
    }
  });

  try {
    await dynamodb.send(command);
  } catch (error) {
    console.error('Failed to sync user data:', error);
  }

  return event;
};
```

## Use Case 5: Analytics Event

Track sign-ins in your analytics pipeline:

```javascript
// analytics-event.mjs
import { FirehoseClient, PutRecordCommand } from '@aws-sdk/client-firehose';

const firehose = new FirehoseClient({});
const STREAM_NAME = process.env.ANALYTICS_STREAM;

export const handler = async (event) => {
  const { userAttributes } = event.request;

  const analyticsEvent = {
    eventType: 'user_sign_in',
    userId: userAttributes.sub,
    email: userAttributes.email,
    timestamp: new Date().toISOString(),
    properties: {
      organization: userAttributes['custom:organization'] || null,
      clientId: event.callerContext.clientId,
      newDevice: event.request.newDeviceUsed || false,
      region: event.region
    }
  };

  const command = new PutRecordCommand({
    DeliveryStreamName: STREAM_NAME,
    Record: {
      Data: Buffer.from(JSON.stringify(analyticsEvent) + '\n')
    }
  });

  try {
    await firehose.send(command);
  } catch (error) {
    console.error('Failed to send analytics event:', error);
  }

  return event;
};
```

## Combined Handler

Putting it all together:

```javascript
// post-authentication.mjs - Full handler
import { DynamoDBClient, UpdateItemCommand, PutItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { randomUUID } from 'crypto';

const dynamodb = new DynamoDBClient({});

export const handler = async (event) => {
  const { userAttributes } = event.request;
  const now = new Date();

  const actions = [
    // Update last login
    updateLastLogin(userAttributes.sub, now),

    // Log the sign-in
    logSignIn(event, now),

    // Reset failed attempts
    resetFailedAttempts(userAttributes.sub),

    // Sync user data
    syncUserData(userAttributes, now)
  ];

  // Add new device alert if applicable
  if (event.request.newDeviceUsed) {
    actions.push(handleNewDevice(event));
  }

  const results = await Promise.allSettled(actions);

  // Log failures but don't block
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`Post-auth action ${i} failed:`, result.reason);
    }
  });

  return event;
};

// ... individual functions
```

## Performance Notes

Post Authentication runs after the user is already authenticated, so it doesn't affect the perceived sign-in speed as much as Pre Authentication. However, the Cognito API waits for the Lambda to complete before returning tokens to the client. Keep it under 10 seconds.

For actions that can tolerate some delay (like analytics), consider writing to an SQS queue and processing asynchronously:

```javascript
// Queue-based approach for non-critical actions
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({});

async function queueAnalytics(event) {
  const command = new SendMessageCommand({
    QueueUrl: process.env.ANALYTICS_QUEUE_URL,
    MessageBody: JSON.stringify({
      type: 'sign_in',
      userId: event.request.userAttributes.sub,
      timestamp: new Date().toISOString()
    })
  });

  await sqs.send(command);
}
```

For the trigger that fires before authentication, see [Cognito Lambda triggers for pre authentication](https://oneuptime.com/blog/post/cognito-lambda-triggers-pre-authentication/view).

## Summary

Post Authentication is your observability point for successful sign-ins. Track login activity, detect new devices, sync user data, feed analytics pipelines, and reset security counters. Since it can't block authentication (the user is already signed in), focus on making it fast and resilient - use parallel execution, don't throw errors, and offload heavy processing to queues. Combined with Pre Authentication for security gates, you get a complete picture of who's signing in, when, and from where.
