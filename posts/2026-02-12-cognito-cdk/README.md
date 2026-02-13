# How to Set Up Cognito with CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Cognito, CDK, Infrastructure as Code, TypeScript

Description: Learn how to set up AWS Cognito User Pools, app clients, groups, Lambda triggers, and Identity Pools using the AWS CDK with TypeScript, including production-ready patterns and best practices.

---

AWS CDK lets you define Cognito infrastructure using real programming languages instead of YAML or JSON. That means you get type checking, IDE autocomplete, loops, conditionals, and the ability to share configurations as libraries. If you're already working in TypeScript (which many Cognito-backed apps are), CDK feels like a natural extension of your codebase.

Let's build a complete Cognito setup with CDK that covers everything you need for production.

## Project Setup

Initialize a CDK project if you don't have one already.

Create the CDK project:

```bash
mkdir cognito-cdk && cd cognito-cdk
npx cdk init app --language typescript

# Install Cognito constructs
npm install aws-cdk-lib constructs
```

## The Cognito Stack

Let's create a dedicated stack for authentication resources.

Here's the complete Cognito stack:

```typescript
// lib/cognito-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface CognitoStackProps extends cdk.StackProps {
    environment: string;
    appName: string;
}

export class CognitoStack extends cdk.Stack {
    public readonly userPool: cognito.UserPool;
    public readonly userPoolClient: cognito.UserPoolClient;
    public readonly identityPool: cognito.CfnIdentityPool;

    constructor(scope: Construct, id: string, props: CognitoStackProps) {
        super(scope, id, props);

        const { environment, appName } = props;

        // Create the User Pool
        this.userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName: `${appName}-${environment}`,

            // Sign-in options
            signInAliases: {
                email: true,
                username: false,
            },

            // Self-registration
            selfSignUpEnabled: true,

            // Verification
            autoVerify: {
                email: true,
            },

            // Password policy
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: false,
                tempPasswordValidity: cdk.Duration.days(7),
            },

            // MFA
            mfa: cognito.Mfa.OPTIONAL,
            mfaSecondFactor: {
                sms: false,
                otp: true,
            },

            // Account recovery
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,

            // Standard attributes
            standardAttributes: {
                email: {
                    required: true,
                    mutable: true,
                },
                fullname: {
                    required: true,
                    mutable: true,
                },
            },

            // Custom attributes
            customAttributes: {
                tenantId: new cognito.StringAttribute({
                    mutable: true,
                    maxLen: 128,
                }),
                role: new cognito.StringAttribute({
                    mutable: true,
                    maxLen: 64,
                }),
                legacyId: new cognito.StringAttribute({
                    mutable: false,
                    maxLen: 64,
                }),
            },

            // Email settings
            userVerification: {
                emailSubject: `Your ${appName} verification code`,
                emailBody: 'Your verification code is {####}',
                emailStyle: cognito.VerificationEmailStyle.CODE,
            },

            // Keep users when stack is deleted (important for prod!)
            removalPolicy: environment === 'prod'
                ? cdk.RemovalPolicy.RETAIN
                : cdk.RemovalPolicy.DESTROY,
        });

        // Add domain for hosted UI
        this.userPool.addDomain('CognitoDomain', {
            cognitoDomain: {
                domainPrefix: `${appName}-${environment}`,
            },
        });

        // Create app client
        this.userPoolClient = this.userPool.addClient('WebClient', {
            userPoolClientName: `${appName}-web`,
            authFlows: {
                userPassword: true,
                userSrp: true,
                custom: true,
            },
            generateSecret: false,

            // Token validity
            accessTokenValidity: cdk.Duration.hours(1),
            idTokenValidity: cdk.Duration.hours(1),
            refreshTokenValidity: cdk.Duration.days(30),

            // OAuth
            oAuth: {
                flows: {
                    authorizationCodeGrant: true,
                },
                scopes: [
                    cognito.OAuthScope.EMAIL,
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.PROFILE,
                ],
                callbackUrls: [
                    'http://localhost:3000/callback',
                    `https://${appName}.example.com/callback`,
                ],
                logoutUrls: [
                    'http://localhost:3000/logout',
                    `https://${appName}.example.com/logout`,
                ],
            },

            preventUserExistenceErrors: true,
            enableTokenRevocation: true,
        });

        // Backend client (with secret)
        this.userPool.addClient('BackendClient', {
            userPoolClientName: `${appName}-backend`,
            authFlows: {
                adminUserPassword: true,
            },
            generateSecret: true,
            accessTokenValidity: cdk.Duration.hours(1),
            idTokenValidity: cdk.Duration.hours(1),
            refreshTokenValidity: cdk.Duration.days(30),
        });

        // Groups
        this.createGroups(environment, appName);

        // Outputs
        new cdk.CfnOutput(this, 'UserPoolId', {
            value: this.userPool.userPoolId,
            description: 'Cognito User Pool ID',
        });

        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: this.userPoolClient.userPoolClientId,
            description: 'Web app client ID',
        });
    }

    private createGroups(environment: string, appName: string) {
        new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
            userPoolId: this.userPool.userPoolId,
            groupName: 'Admins',
            description: 'Administrators',
            precedence: 1,
        });

        new cognito.CfnUserPoolGroup(this, 'ManagerGroup', {
            userPoolId: this.userPool.userPoolId,
            groupName: 'Managers',
            description: 'Team managers',
            precedence: 5,
        });

        new cognito.CfnUserPoolGroup(this, 'UserGroup', {
            userPoolId: this.userPool.userPoolId,
            groupName: 'Users',
            description: 'Standard users',
            precedence: 10,
        });
    }
}
```

## Adding Lambda Triggers

Extend the stack with Lambda triggers for auth customization.

Here's how to add a Pre Token Generation trigger:

```typescript
// In your CognitoStack constructor, add:

// Pre Token Generation Lambda
const preTokenGenerationFn = new lambda.Function(this, 'PreTokenGeneration', {
    functionName: `${appName}-pre-token-${environment}`,
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset('lambda/pre-token-generation'),
    timeout: cdk.Duration.seconds(5),
    memorySize: 128,
    environment: {
        ENVIRONMENT: environment,
    },
});

// Attach the trigger to the user pool
this.userPool.addTrigger(
    cognito.UserPoolOperation.PRE_TOKEN_GENERATION,
    preTokenGenerationFn
);

// Post Confirmation trigger (e.g., add user to default group)
const postConfirmationFn = new lambda.Function(this, 'PostConfirmation', {
    functionName: `${appName}-post-confirm-${environment}`,
    runtime: lambda.Runtime.NODEJS_20_X,
    handler: 'index.handler',
    code: lambda.Code.fromAsset('lambda/post-confirmation'),
    timeout: cdk.Duration.seconds(5),
    environment: {
        USER_POOL_ID: this.userPool.userPoolId,
        DEFAULT_GROUP: 'Users',
    },
});

// Grant the post-confirmation Lambda permission to add users to groups
postConfirmationFn.addToRolePolicy(new iam.PolicyStatement({
    actions: ['cognito-idp:AdminAddUserToGroup'],
    resources: [this.userPool.userPoolArn],
}));

this.userPool.addTrigger(
    cognito.UserPoolOperation.POST_CONFIRMATION,
    postConfirmationFn
);
```

## Identity Pool

Add an Identity Pool for direct AWS resource access:

```typescript
// Add to the CognitoStack

// Authenticated role
const authenticatedRole = new iam.Role(this, 'CognitoAuthRole', {
    assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
            'StringEquals': {
                'cognito-identity.amazonaws.com:aud': '', // Set after identity pool creation
            },
            'ForAnyValue:StringLike': {
                'cognito-identity.amazonaws.com:amr': 'authenticated',
            },
        },
        'sts:AssumeRoleWithWebIdentity'
    ),
});

authenticatedRole.addToPolicy(new iam.PolicyStatement({
    actions: ['s3:GetObject', 's3:PutObject'],
    resources: ['arn:aws:s3:::my-app-bucket/private/${cognito-identity.amazonaws.com:sub}/*'],
}));

// Identity Pool
this.identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
    identityPoolName: `${appName}_${environment}`,
    allowUnauthenticatedIdentities: false,
    cognitoIdentityProviders: [{
        clientId: this.userPoolClient.userPoolClientId,
        providerName: this.userPool.userPoolProviderName,
        serverSideTokenCheck: true,
    }],
});

// Fix the trust policy with the actual identity pool ID
(authenticatedRole.assumeRolePolicy as iam.PolicyDocument).addStatements(
    new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.FederatedPrincipal('cognito-identity.amazonaws.com')],
        actions: ['sts:AssumeRoleWithWebIdentity'],
        conditions: {
            'StringEquals': {
                'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
            },
        },
    })
);

// Attach roles
new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoles', {
    identityPoolId: this.identityPool.ref,
    roles: {
        authenticated: authenticatedRole.roleArn,
    },
});

new cdk.CfnOutput(this, 'IdentityPoolId', {
    value: this.identityPool.ref,
});
```

## Resource Server for Custom Scopes

If you need custom OAuth scopes for API authorization:

```typescript
const resourceServer = this.userPool.addResourceServer('ApiResourceServer', {
    identifier: 'myapi',
    userPoolResourceServerName: 'My API',
    scopes: [
        new cognito.ResourceServerScope({
            scopeName: 'read',
            scopeDescription: 'Read access',
        }),
        new cognito.ResourceServerScope({
            scopeName: 'write',
            scopeDescription: 'Write access',
        }),
        new cognito.ResourceServerScope({
            scopeName: 'admin',
            scopeDescription: 'Admin access',
        }),
    ],
});
```

## Deploying

Wire up the stack in your CDK app entry point:

```typescript
// bin/app.ts
import * as cdk from 'aws-cdk-lib';
import { CognitoStack } from '../lib/cognito-stack';

const app = new cdk.App();

const environment = app.node.tryGetContext('environment') || 'dev';

new CognitoStack(app, `CognitoStack-${environment}`, {
    environment,
    appName: 'myapp',
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: 'us-east-1',
    },
});
```

Deploy with environment context:

```bash
# Deploy dev
npx cdk deploy -c environment=dev

# Deploy production
npx cdk deploy -c environment=prod

# Diff before deploying
npx cdk diff -c environment=prod
```

For the Terraform alternative, see [setting up Cognito with Terraform](https://oneuptime.com/blog/post/2026-02-12-cognito-terraform/view).

## Wrapping Up

CDK makes Cognito infrastructure feel like application code. You get TypeScript's type safety, IDE support, and the ability to compose constructs into reusable libraries. The setup we've built here covers user pools, clients, groups, Lambda triggers, and Identity Pools - everything you need for a production auth system. Remember to set `removalPolicy` to `RETAIN` for production user pools, and always check `cdk diff` before deploying changes that could affect existing users.
