# Validation Summary: How to Use Lambda with Cognito Triggers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Cognito User Pools
- AWS Lambda
- AWS CDK
- Amazon DynamoDB
- Node.js
- JavaScript
- TypeScript

## Sources Consulted
- Amazon Cognito: Customizing user pool workflows with Lambda triggers: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-working-with-lambda-triggers.html
- Amazon Cognito: Pre sign-up Lambda trigger: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-sign-up.html
- Amazon Cognito: Post confirmation Lambda trigger: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-post-confirmation.html
- Amazon Cognito: Pre token generation Lambda trigger: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html
- Amazon Cognito: Custom authentication challenge Lambda triggers: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-challenge.html
- AWS CDK: StandardAttributes: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.StandardAttributes.html
- AWS CDK: UserPoolTriggers: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.UserPoolTriggers.html
- AWS CDK: UserPoolOperation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.UserPoolOperation.html
- AWS CDK: LambdaVersion: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.LambdaVersion.html
- AWS CDK: FeaturePlan: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.FeaturePlan.html
- Node.js crypto.randomInt documentation: https://nodejs.org/api/crypto.html#cryptorandomintmin-max-callback

## Issues Found
- The CDK example configured the post-confirmation Lambda timeout as 10 seconds. Amazon Cognito requires Lambda triggers to respond within 5 seconds and the timeout can't be changed, so the example now uses a 5-second Lambda timeout.
- The CDK example referenced a DynamoDB table name but didn't create the table or grant Lambda permissions. Added a DynamoDB table, passed its name through environment variables, and granted write/read permissions to the post-confirmation and pre-token-generation functions.
- The pre-token-generation section claimed ID and access token customization, but the code and CDK setup used the v1 trigger shape, which only customizes ID tokens. Updated CDK to use `PRE_TOKEN_GENERATION_CONFIG` with `LambdaVersion.V2_0`, made the Essentials feature plan explicit, and changed the handler to return `claimsAndScopeOverrideDetails` with ID and access token claim overrides.
- The pre-token handler hard-coded the DynamoDB table name instead of using the CDK-provided environment variable. Updated it to use `process.env.USERS_TABLE`.
- The custom challenge OTP example used `Math.random()`, which is not appropriate for authentication codes. Updated it to use Node.js `crypto.randomInt()`.

## Review Notes
The custom challenge snippets remain illustrative and assume helper functions such as `sendOtp`, `authenticateWithLegacySystem`, and `lookupLegacyUser` exist. The post correctly notes that production OTP storage should use a secure store with TTL.
