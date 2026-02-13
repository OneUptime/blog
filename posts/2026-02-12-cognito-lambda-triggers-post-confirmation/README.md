# How to Use Cognito Lambda Triggers (Post Confirmation)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, Lambda, Serverless, Authentication

Description: Implement the Cognito Post Confirmation Lambda trigger to send welcome emails, create user records, set up defaults, and sync data after user verification.

---

The Post Confirmation trigger fires after a user successfully confirms their account - either by entering a verification code or when an admin confirms them. This is the right place for actions that should happen once per user lifecycle: creating database records, sending welcome emails, setting up default resources, or notifying your team about new sign-ups.

## When the Trigger Fires

The Post Confirmation trigger fires in two scenarios:

1. **PostConfirmation_ConfirmSignUp** - After a user confirms their email/phone during self-registration
2. **PostConfirmation_ConfirmForgotPassword** - After a user confirms a password reset

Importantly, this trigger does NOT fire for admin-confirmed users (AdminConfirmSignUp API) unless you're using auto-confirmation in the Pre Sign-Up trigger.

## Basic Setup

```hcl
# Lambda function for Post Confirmation
resource "aws_lambda_function" "post_confirmation" {
  filename         = data.archive_file.post_confirmation.output_path
  source_code_hash = data.archive_file.post_confirmation.output_base64sha256
  function_name    = "cognito-post-confirmation"
  role             = aws_iam_role.post_confirmation_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 10

  environment {
    variables = {
      USERS_TABLE   = aws_dynamodb_table.users.name
      SES_FROM_EMAIL = "noreply@myapp.com"
    }
  }
}

# Allow Cognito to invoke the Lambda
resource "aws_lambda_permission" "cognito_post_confirmation" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.post_confirmation.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

# Attach to the User Pool
resource "aws_cognito_user_pool" "main" {
  name = "my-app-user-pool"

  lambda_config {
    post_confirmation = aws_lambda_function.post_confirmation.arn
  }
}
```

## The Event Object

```javascript
{
  "version": "1",
  "triggerSource": "PostConfirmation_ConfirmSignUp",
  "region": "us-east-1",
  "userPoolId": "us-east-1_XXXXXXXXX",
  "userName": "abc123-def456",
  "callerContext": {
    "awsSdkVersion": "aws-sdk-nodejs-3.x",
    "clientId": "your-app-client-id"
  },
  "request": {
    "userAttributes": {
      "sub": "abc123-def456-ghi789",
      "email": "user@example.com",
      "email_verified": "true",
      "name": "Jane Doe",
      "custom:organization": "Acme Inc"
    }
  },
  "response": {}
}
```

## Use Case 1: Create a User Record in DynamoDB

The most common use case - create an application-level user record:

```javascript
// create-user-record.mjs
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

const dynamodb = new DynamoDBClient({});
const TABLE_NAME = process.env.USERS_TABLE;

export const handler = async (event) => {
  // Only run for new sign-ups, not password resets
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
    return event;
  }

  const { userAttributes } = event.request;
  const now = new Date().toISOString();

  const command = new PutItemCommand({
    TableName: TABLE_NAME,
    Item: {
      userId: { S: userAttributes.sub },
      email: { S: userAttributes.email },
      name: { S: userAttributes.name || '' },
      organization: { S: userAttributes['custom:organization'] || '' },
      plan: { S: 'free' },
      createdAt: { S: now },
      updatedAt: { S: now },
      signUpSource: { S: event.callerContext.clientId },
      status: { S: 'active' }
    },
    // Don't overwrite if somehow already exists
    ConditionExpression: 'attribute_not_exists(userId)'
  });

  try {
    await dynamodb.send(command);
    console.log('User record created:', userAttributes.sub);
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      console.log('User record already exists:', userAttributes.sub);
    } else {
      console.error('Failed to create user record:', error);
      // Don't throw - we don't want to block the confirmation
    }
  }

  return event;
};
```

The IAM role needs DynamoDB permissions:

```hcl
resource "aws_iam_role_policy" "dynamodb_access" {
  name = "dynamodb-access"
  role = aws_iam_role.post_confirmation_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:PutItem",
        "dynamodb:GetItem"
      ]
      Resource = aws_dynamodb_table.users.arn
    }]
  })
}
```

## Use Case 2: Send a Welcome Email

Send a personalized welcome email after confirmation:

```javascript
// welcome-email.mjs
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const ses = new SESClient({});
const FROM_EMAIL = process.env.SES_FROM_EMAIL;

export const handler = async (event) => {
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
    return event;
  }

  const { userAttributes } = event.request;
  const name = userAttributes.name || 'there';

  const command = new SendEmailCommand({
    Source: FROM_EMAIL,
    Destination: {
      ToAddresses: [userAttributes.email]
    },
    Message: {
      Subject: {
        Data: 'Welcome to MyApp!'
      },
      Body: {
        Html: {
          Data: `
            <h1>Welcome, ${name}!</h1>
            <p>Your account is all set up and ready to go.</p>
            <p>Here are a few things to get you started:</p>
            <ul>
              <li>Set up your profile</li>
              <li>Create your first project</li>
              <li>Invite your team</li>
            </ul>
            <p>
              <a href="https://myapp.com/getting-started"
                 style="background: #4361ee; color: white; padding: 12px 24px;
                        text-decoration: none; border-radius: 6px;">
                Get Started
              </a>
            </p>
          `
        }
      }
    }
  });

  try {
    await ses.send(command);
    console.log('Welcome email sent to:', userAttributes.email);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    // Don't throw - email failure shouldn't block confirmation
  }

  return event;
};
```

## Use Case 3: Add User to a Default Group

Cognito groups control access. Automatically add new users to a default group:

```javascript
// add-to-group.mjs
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand
} from '@aws-sdk/client-cognito-identity-provider';

const cognito = new CognitoIdentityProviderClient({});

export const handler = async (event) => {
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
    return event;
  }

  // Add all new users to the 'users' group
  const command = new AdminAddUserToGroupCommand({
    UserPoolId: event.userPoolId,
    Username: event.userName,
    GroupName: 'users'
  });

  try {
    await cognito.send(command);
    console.log('User added to group:', event.userName);
  } catch (error) {
    console.error('Failed to add user to group:', error);
  }

  // Add to plan-specific group
  const org = event.request.userAttributes['custom:organization'];
  if (org) {
    const orgGroupCommand = new AdminAddUserToGroupCommand({
      UserPoolId: event.userPoolId,
      Username: event.userName,
      GroupName: 'enterprise'
    });

    try {
      await cognito.send(orgGroupCommand);
    } catch (error) {
      console.error('Failed to add user to enterprise group:', error);
    }
  }

  return event;
};
```

## Use Case 4: Notify Your Team

Alert your team about new sign-ups via Slack or SNS:

```javascript
// notify-team.mjs
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const sns = new SNSClient({});
const TOPIC_ARN = process.env.NEW_USER_TOPIC_ARN;

export const handler = async (event) => {
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
    return event;
  }

  const { userAttributes } = event.request;

  const message = {
    email: userAttributes.email,
    name: userAttributes.name || 'Not provided',
    organization: userAttributes['custom:organization'] || 'Not provided',
    timestamp: new Date().toISOString()
  };

  const command = new PublishCommand({
    TopicArn: TOPIC_ARN,
    Subject: `New sign-up: ${userAttributes.email}`,
    Message: JSON.stringify(message, null, 2)
  });

  try {
    await sns.send(command);
  } catch (error) {
    console.error('Failed to notify team:', error);
  }

  return event;
};
```

## Combining Multiple Actions

In practice, you'll want to do several things in the Post Confirmation trigger. Here's a combined handler:

```javascript
// post-confirmation.mjs - Combined handler
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand
} from '@aws-sdk/client-cognito-identity-provider';

const dynamodb = new DynamoDBClient({});
const ses = new SESClient({});
const cognito = new CognitoIdentityProviderClient({});

export const handler = async (event) => {
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
    return event;
  }

  const { userAttributes } = event.request;

  // Run all actions in parallel for speed
  const results = await Promise.allSettled([
    createUserRecord(userAttributes),
    sendWelcomeEmail(userAttributes),
    addToDefaultGroup(event.userPoolId, event.userName)
  ]);

  // Log any failures but don't block confirmation
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`Action ${index} failed:`, result.reason);
    }
  });

  return event;
};

async function createUserRecord(attrs) {
  // ... DynamoDB PutItem
}

async function sendWelcomeEmail(attrs) {
  // ... SES SendEmail
}

async function addToDefaultGroup(poolId, username) {
  // ... AdminAddUserToGroup
}
```

## Important Considerations

**Don't throw errors**: Unlike the Pre Sign-Up trigger, throwing an error in Post Confirmation doesn't prevent the sign-up - the user is already confirmed. But it does return an error to the client, which creates a confusing experience where the user is confirmed but sees an error.

**Idempotency**: The trigger might fire more than once in rare cases. Make your actions idempotent - use conditional writes in DynamoDB, check for existing records before creating.

**Timeout**: Keep the Lambda fast. Users are waiting for the confirmation to complete. Use `Promise.allSettled()` to run multiple actions in parallel.

For the trigger that runs before this one, see [Cognito Lambda triggers for pre sign-up](https://oneuptime.com/blog/post/2026-02-12-cognito-lambda-triggers-pre-sign-up/view). For actions during sign-in, check out [Cognito Lambda triggers for post authentication](https://oneuptime.com/blog/post/2026-02-12-cognito-lambda-triggers-post-authentication/view).

## Summary

Post Confirmation is where you bootstrap a user's existence in your system. Create their database record, send the welcome email, assign default groups, and notify your team - all in one trigger. Run these actions in parallel to keep the response time low, handle errors gracefully without throwing, and make everything idempotent. This trigger, combined with Pre Sign-Up for validation, gives you complete control over the user registration pipeline.
