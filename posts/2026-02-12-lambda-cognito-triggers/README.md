# How to Use Lambda with Cognito Triggers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Cognito, Authentication, Serverless

Description: Complete guide to using AWS Lambda functions as Cognito User Pool triggers for custom authentication flows, user validation, and post-signup automation.

---

Amazon Cognito User Pools handle the heavy lifting of user authentication - sign-up, sign-in, password reset, MFA. But what happens when you need custom logic during these flows? Maybe you want to validate email domains during sign-up, auto-confirm users from your corporate directory, enrich tokens with custom claims, or sync new users to your database. That's where Cognito Lambda triggers come in.

Cognito triggers let you hook Lambda functions into specific points in the authentication lifecycle. Your function runs, modifies the event, and returns it to Cognito - all seamlessly integrated into the user flow.

## Available Trigger Types

Cognito supports triggers at various lifecycle points:

**Authentication triggers:**
- `Pre authentication` - runs before Cognito authenticates the user. Use it to add custom validation.
- `Post authentication` - runs after successful authentication. Use it for logging, analytics, or sync.
- `Pre token generation` - runs before Cognito generates tokens. Use it to add custom claims.

**Sign-up triggers:**
- `Pre sign-up` - runs before Cognito creates the user. Use it to validate or auto-confirm.
- `Post confirmation` - runs after a user is confirmed. Use it for welcome emails or database sync.

**Custom message triggers:**
- `Custom message` - customize the verification/MFA email or SMS messages.

**Migration triggers:**
- `User migration` - migrate users from an existing auth system on first sign-in.

**Custom challenge triggers:**
- `Define auth challenge` - define a custom authentication flow.
- `Create auth challenge` - create the challenge.
- `Verify auth challenge` - verify the user's response.

## Setting Up with AWS CDK

Let's create a Cognito User Pool with several Lambda triggers.

This CDK stack creates a User Pool with pre-sign-up validation and post-confirmation automation:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class CognitoTriggersStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Pre sign-up trigger - validate and auto-confirm
    const preSignUpFn = new lambda.Function(this, 'PreSignUp', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/pre-signup'),
      timeout: cdk.Duration.seconds(5),
    });

    // Post confirmation trigger - create user profile
    const postConfirmFn = new lambda.Function(this, 'PostConfirmation', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/post-confirmation'),
      timeout: cdk.Duration.seconds(10),
      environment: {
        USERS_TABLE: 'user-profiles',
      },
    });

    // Pre token generation - add custom claims
    const preTokenFn = new lambda.Function(this, 'PreTokenGeneration', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/pre-token'),
      timeout: cdk.Duration.seconds(5),
    });

    // Custom message trigger - personalize emails
    const customMessageFn = new lambda.Function(this, 'CustomMessage', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/custom-message'),
      timeout: cdk.Duration.seconds(5),
    });

    // Create the User Pool with triggers
    const userPool = new cognito.UserPool(this, 'AppUserPool', {
      userPoolName: 'my-app-users',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true },
        fullname: { required: true },
      },
      lambdaTriggers: {
        preSignUp: preSignUpFn,
        postConfirmation: postConfirmFn,
        preTokenGeneration: preTokenFn,
        customMessage: customMessageFn,
      },
    });

    // Create an app client
    userPool.addClient('WebAppClient', {
      authFlows: {
        userSrp: true,
        userPassword: true,
      },
    });
  }
}
```

## Pre Sign-Up Trigger

This trigger runs before Cognito creates the user account. You can validate the input, auto-confirm users, or reject sign-ups.

This handler validates email domains and auto-confirms users from approved domains:

```javascript
// lambda/pre-signup/index.js
const ALLOWED_DOMAINS = ['company.com', 'partner.com'];

exports.handler = async (event) => {
  console.log('Pre sign-up trigger:', JSON.stringify(event, null, 2));

  const email = event.request.userAttributes.email;
  const domain = email.split('@')[1].toLowerCase();

  // Block disposable email domains
  const blockedDomains = ['tempmail.com', 'throwaway.email', 'mailinator.com'];
  if (blockedDomains.includes(domain)) {
    throw new Error('Sign-up from disposable email addresses is not allowed');
  }

  // Auto-confirm and auto-verify users from approved domains
  if (ALLOWED_DOMAINS.includes(domain)) {
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
    console.log(`Auto-confirmed user from approved domain: ${domain}`);
  }

  // You can also auto-verify phone
  // event.response.autoVerifyPhone = true;

  return event;
};
```

The key pattern: modify `event.response` and return the event. To reject the sign-up, throw an error. The error message will be sent back to the client.

## Post Confirmation Trigger

This runs after the user is confirmed. It's the right place to create user profiles in your database.

This handler creates a user profile in DynamoDB after account confirmation:

```javascript
// lambda/post-confirmation/index.js
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');

const dynamodb = new DynamoDBClient({});

exports.handler = async (event) => {
  console.log('Post confirmation trigger:', JSON.stringify(event, null, 2));

  // Only process confirm sign-up events (not forgot password confirmations)
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
    return event;
  }

  const userId = event.request.userAttributes.sub;
  const email = event.request.userAttributes.email;
  const name = event.request.userAttributes.name;

  // Create user profile in DynamoDB
  await dynamodb.send(new PutItemCommand({
    TableName: process.env.USERS_TABLE,
    Item: {
      userId: { S: userId },
      email: { S: email },
      name: { S: name || 'Unknown' },
      createdAt: { S: new Date().toISOString() },
      tier: { S: 'free' },
      settings: { M: {
        notifications: { BOOL: true },
        theme: { S: 'light' },
      }},
    },
    ConditionExpression: 'attribute_not_exists(userId)',
  }));

  console.log(`Created profile for user ${userId}`);
  return event;
};
```

## Pre Token Generation Trigger

This trigger lets you add custom claims to the ID and access tokens. It runs every time tokens are generated, including refreshes.

This handler adds custom claims based on user data from DynamoDB:

```javascript
// lambda/pre-token/index.js
const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');

const dynamodb = new DynamoDBClient({});

exports.handler = async (event) => {
  console.log('Pre token generation:', JSON.stringify(event, null, 2));

  const userId = event.request.userAttributes.sub;

  // Look up user profile for additional claims
  const result = await dynamodb.send(new GetItemCommand({
    TableName: 'user-profiles',
    Key: { userId: { S: userId } },
  }));

  const profile = result.Item;

  if (profile) {
    // Add custom claims to the ID token
    event.response.claimsOverrideDetails = {
      claimsToAddOrOverride: {
        'custom:tier': profile.tier?.S || 'free',
        'custom:orgId': profile.orgId?.S || '',
      },
      // You can also suppress claims
      claimsToSuppress: ['email_verified'],
      // Add groups
      groupOverrideDetails: {
        groupsToOverride: profile.tier?.S === 'enterprise' ? ['admin', 'enterprise'] : ['users'],
      },
    };
  }

  return event;
};
```

Custom claims appear in the JWT token, so your API can read them without making additional database calls. Very handy for authorization decisions. If you're using [custom authorizers with API Gateway](https://oneuptime.com/blog/post/2026-02-12-custom-authorizers-api-gateway-lambda/view), these custom claims streamline the authorization logic.

## User Migration Trigger

This trigger is perfect for gradually migrating users from a legacy auth system. When a user tries to sign in and doesn't exist in Cognito, the migration trigger fires.

This handler migrates users from a legacy database on their first sign-in:

```javascript
// lambda/user-migration/index.js
exports.handler = async (event) => {
  console.log('User migration trigger:', event.triggerSource);

  if (event.triggerSource === 'UserMigration_Authentication') {
    // User is trying to sign in
    const username = event.userName;
    const password = event.request.password;

    // Verify against legacy system
    const legacyUser = await authenticateWithLegacySystem(username, password);

    if (legacyUser) {
      // Migrate the user to Cognito
      event.response.userAttributes = {
        email: legacyUser.email,
        email_verified: 'true',
        name: legacyUser.fullName,
        'custom:legacy_id': legacyUser.id,
      };
      event.response.finalUserStatus = 'CONFIRMED';
      event.response.messageAction = 'SUPPRESS'; // don't send welcome email
      console.log(`Migrated user: ${username}`);
    } else {
      throw new Error('Bad credentials');
    }
  }

  if (event.triggerSource === 'UserMigration_ForgotPassword') {
    // User is trying to reset password
    const legacyUser = await lookupLegacyUser(event.userName);

    if (legacyUser) {
      event.response.userAttributes = {
        email: legacyUser.email,
        email_verified: 'true',
        name: legacyUser.fullName,
      };
      event.response.messageAction = 'SUPPRESS';
    } else {
      throw new Error('User not found');
    }
  }

  return event;
};
```

## Custom Authentication Challenge

For advanced auth flows like passwordless login with magic links or OTP.

This set of handlers implements a custom OTP challenge flow:

```javascript
// Define auth challenge - decides what challenge to issue
exports.defineChallenge = async (event) => {
  const sessions = event.request.session;

  if (sessions.length === 0) {
    // First attempt - issue custom challenge
    event.response.challengeName = 'CUSTOM_CHALLENGE';
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
  } else if (sessions.length === 1 && sessions[0].challengeResult === true) {
    // Challenge answered correctly
    event.response.issueTokens = true;
    event.response.failAuthentication = false;
  } else {
    // Wrong answer or too many attempts
    event.response.issueTokens = false;
    event.response.failAuthentication = true;
  }

  return event;
};

// Create auth challenge - generate the OTP
exports.createChallenge = async (event) => {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP (in production, use a secure store with TTL)
  event.response.privateChallengeParameters = { otp };
  event.response.publicChallengeParameters = {
    hint: 'Enter the 6-digit code sent to your email',
  };

  // Send the OTP via email/SMS
  await sendOtp(event.request.userAttributes.email, otp);

  return event;
};

// Verify auth challenge - check the user's answer
exports.verifyChallenge = async (event) => {
  const expectedOtp = event.request.privateChallengeParameters.otp;
  const providedOtp = event.request.challengeAnswer;

  event.response.answerCorrect = expectedOtp === providedOtp;
  return event;
};
```

## Trigger Timeouts and Limits

Cognito triggers have strict timeout requirements. Your Lambda function must respond within 5 seconds for most triggers. If it times out, Cognito treats it as a failure and the user operation fails.

Keep your triggers fast:
- Avoid cold starts by using provisioned concurrency for auth-critical triggers
- Keep dependencies minimal
- Cache database lookups when possible
- Don't do heavy processing in synchronous triggers - queue the work for later

## Wrapping Up

Cognito Lambda triggers give you complete control over the authentication lifecycle without building a custom auth system. Start with pre-sign-up validation and post-confirmation profile creation. Add pre-token generation when you need custom claims in your JWTs. The migration trigger is invaluable when you're moving from a legacy system. Just remember the 5-second timeout - these triggers are on the critical path of user authentication, so keep them lean and fast.
