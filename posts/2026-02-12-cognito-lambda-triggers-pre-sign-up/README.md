# How to Use Cognito Lambda Triggers (Pre Sign-Up)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, Lambda, Authentication, Serverless

Description: Implement the Cognito Pre Sign-Up Lambda trigger to validate registrations, auto-confirm users, block specific domains, and link federated accounts.

---

The Pre Sign-Up trigger fires right after a user submits their registration but before Cognito creates the account. This gives you a chance to validate the sign-up, block unwanted registrations, auto-confirm users, or modify the sign-up behavior. It's one of the most useful Cognito Lambda triggers because it sits at the gateway of your user pool.

## When the Trigger Fires

The Pre Sign-Up trigger fires on three occasions:

1. **PreSignUp_SignUp** - When a user self-registers
2. **PreSignUp_AdminCreateUser** - When an admin creates a user
3. **PreSignUp_ExternalProvider** - When a user signs in via a federated provider (Google, Facebook, SAML, etc.) for the first time

## Basic Setup

Create the Lambda function and connect it to your User Pool:

```hcl
# Lambda function for Pre Sign-Up trigger
resource "aws_lambda_function" "pre_signup" {
  filename         = data.archive_file.pre_signup.output_path
  source_code_hash = data.archive_file.pre_signup.output_base64sha256
  function_name    = "cognito-pre-signup"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 5  # Keep it short - sign-up UX suffers with long waits
}

# Allow Cognito to invoke the Lambda
resource "aws_lambda_permission" "cognito_pre_signup" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.pre_signup.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.main.arn
}

# Attach the trigger to the User Pool
resource "aws_cognito_user_pool" "main" {
  name = "my-app-user-pool"

  lambda_config {
    pre_sign_up = aws_lambda_function.pre_signup.arn
  }
}

# IAM role for the Lambda
resource "aws_iam_role" "lambda_role" {
  name = "cognito-pre-signup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "archive_file" "pre_signup" {
  type        = "zip"
  source_file = "${path.module}/lambda/pre-signup/index.mjs"
  output_path = "${path.module}/lambda/pre-signup.zip"
}
```

## The Event Object

Here's what the trigger event looks like:

```javascript
{
  "version": "1",
  "triggerSource": "PreSignUp_SignUp",
  "region": "us-east-1",
  "userPoolId": "us-east-1_XXXXXXXXX",
  "userName": "user@example.com",
  "callerContext": {
    "awsSdkVersion": "aws-sdk-nodejs-3.x",
    "clientId": "your-app-client-id"
  },
  "request": {
    "userAttributes": {
      "email": "user@example.com",
      "name": "Jane Doe"
    },
    "validationData": {},
    "clientMetadata": {}
  },
  "response": {
    "autoConfirmUser": false,
    "autoVerifyPhone": false,
    "autoVerifyEmail": false
  }
}
```

## Use Case 1: Block Specific Email Domains

Restrict sign-ups to specific email domains - useful for B2B apps or internal tools:

```javascript
// block-domains.mjs
const ALLOWED_DOMAINS = ['mycompany.com', 'partner.com'];
const BLOCKED_DOMAINS = ['tempmail.com', 'throwaway.email', 'guerrillamail.com'];

export const handler = async (event) => {
  const email = event.request.userAttributes.email;

  if (!email) {
    throw new Error('Email is required');
  }

  const domain = email.split('@')[1].toLowerCase();

  // Option A: Allowlist approach
  if (ALLOWED_DOMAINS.length > 0 && !ALLOWED_DOMAINS.includes(domain)) {
    throw new Error(`Registration is not allowed for ${domain} email addresses.`);
  }

  // Option B: Blocklist approach
  if (BLOCKED_DOMAINS.includes(domain)) {
    throw new Error('Disposable email addresses are not allowed.');
  }

  return event;
};
```

## Use Case 2: Auto-Confirm Users

Skip the verification step for trusted sources:

```javascript
// auto-confirm.mjs
export const handler = async (event) => {
  const { triggerSource, request } = event;
  const email = request.userAttributes.email || '';

  // Auto-confirm admin-created users
  if (triggerSource === 'PreSignUp_AdminCreateUser') {
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
    return event;
  }

  // Auto-confirm users from federated providers
  if (triggerSource === 'PreSignUp_ExternalProvider') {
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
    return event;
  }

  // Auto-confirm corporate email domains (already verified by SSO)
  if (email.endsWith('@mycompany.com')) {
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
    return event;
  }

  // All other users go through normal verification
  return event;
};
```

## Use Case 3: Link Federated Accounts

When a user signs in with Google but already has a password-based account with the same email, you want to link them rather than creating a duplicate:

```javascript
// link-accounts.mjs
import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminLinkProviderForUserCommand
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({});

export const handler = async (event) => {
  if (event.triggerSource !== 'PreSignUp_ExternalProvider') {
    return event;
  }

  const email = event.request.userAttributes.email;
  if (!email) return event;

  // Check if a user with this email already exists
  const listCommand = new ListUsersCommand({
    UserPoolId: event.userPoolId,
    Filter: `email = "${email}"`,
    Limit: 1
  });

  const existingUsers = await client.send(listCommand);

  if (existingUsers.Users && existingUsers.Users.length > 0) {
    const existingUser = existingUsers.Users[0];

    // Extract provider info from the username (e.g., "Google_123456")
    const [providerName, providerUserId] = event.userName.split('_');

    // Link the federated identity to the existing user
    const linkCommand = new AdminLinkProviderForUserCommand({
      UserPoolId: event.userPoolId,
      DestinationUser: {
        ProviderName: 'Cognito',
        ProviderAttributeValue: existingUser.Username
      },
      SourceUser: {
        ProviderName: providerName,
        ProviderAttributeName: 'Cognito_Subject',
        ProviderAttributeValue: providerUserId
      }
    });

    await client.send(linkCommand);
  }

  // Auto-confirm federated users
  event.response.autoConfirmUser = true;
  event.response.autoVerifyEmail = true;

  return event;
};
```

This Lambda needs additional IAM permissions:

```hcl
resource "aws_iam_role_policy" "cognito_access" {
  name = "cognito-access"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "cognito-idp:ListUsers",
        "cognito-idp:AdminLinkProviderForUser"
      ]
      Resource = aws_cognito_user_pool.main.arn
    }]
  })
}
```

## Use Case 4: Custom Validation

Validate sign-up data beyond what Cognito's built-in rules allow:

```javascript
// custom-validation.mjs
export const handler = async (event) => {
  const { userAttributes } = event.request;

  // Validate name
  const name = userAttributes.name || '';
  if (name.length < 2) {
    throw new Error('Name must be at least 2 characters.');
  }

  // Check for profanity (simplified example)
  const blockedWords = ['badword1', 'badword2'];
  const nameLower = name.toLowerCase();
  for (const word of blockedWords) {
    if (nameLower.includes(word)) {
      throw new Error('Name contains inappropriate content.');
    }
  }

  // Validate custom attributes
  const org = userAttributes['custom:organization'] || '';
  if (org && org.length > 100) {
    throw new Error('Organization name is too long.');
  }

  return event;
};
```

## Use Case 5: Rate Limiting by IP

Prevent abuse by limiting sign-ups from the same IP:

```javascript
// rate-limit.mjs
import { DynamoDBClient, UpdateItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';

const dynamodb = new DynamoDBClient({});
const TABLE_NAME = process.env.RATE_LIMIT_TABLE;
const MAX_SIGNUPS_PER_HOUR = 5;

export const handler = async (event) => {
  // Note: IP is available in clientMetadata if passed from your app
  const ip = event.request.clientMetadata?.sourceIp || 'unknown';
  const hourKey = new Date().toISOString().slice(0, 13); // "2026-02-12T15"

  const getCommand = new GetItemCommand({
    TableName: TABLE_NAME,
    Key: {
      pk: { S: `IP#${ip}` },
      sk: { S: `HOUR#${hourKey}` }
    }
  });

  const result = await dynamodb.send(getCommand);
  const count = result.Item?.count?.N ? parseInt(result.Item.count.N) : 0;

  if (count >= MAX_SIGNUPS_PER_HOUR) {
    throw new Error('Too many sign-up attempts. Please try again later.');
  }

  // Increment the counter
  const updateCommand = new UpdateItemCommand({
    TableName: TABLE_NAME,
    Key: {
      pk: { S: `IP#${ip}` },
      sk: { S: `HOUR#${hourKey}` }
    },
    UpdateExpression: 'ADD #count :inc SET #ttl = :ttl',
    ExpressionAttributeNames: {
      '#count': 'count',
      '#ttl': 'ttl'
    },
    ExpressionAttributeValues: {
      ':inc': { N: '1' },
      ':ttl': { N: String(Math.floor(Date.now() / 1000) + 7200) }
    }
  });

  await dynamodb.send(updateCommand);
  return event;
};
```

## Error Handling

When the Pre Sign-Up trigger throws an error, Cognito returns it to the client. Keep error messages user-friendly:

```javascript
// Good error messages
throw new Error('Registration is currently limited to company email addresses.');
throw new Error('Please use a valid email address to sign up.');

// Bad error messages (leaks internal details)
throw new Error('DynamoDB query failed: ValidationException');
throw new Error('Lambda execution error at line 45');
```

For the trigger that fires after sign-up confirmation, see [Cognito Lambda triggers for post confirmation](https://oneuptime.com/blog/post/2026-02-12-cognito-lambda-triggers-post-confirmation/view).

## Summary

The Pre Sign-Up trigger is your gatekeeper. It can block unwanted registrations, auto-confirm trusted users, link federated identities, and validate data - all before a user account is created. Keep the Lambda fast (under 5 seconds) to avoid degrading the sign-up experience, and make sure error messages are clear so users know what went wrong. This trigger, combined with Post Confirmation, gives you full control over the user registration lifecycle.
