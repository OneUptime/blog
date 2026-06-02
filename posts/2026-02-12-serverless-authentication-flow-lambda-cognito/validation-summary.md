# Validation Summary: Build a Serverless Authentication Flow with Lambda and Cognito

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Cognito User Pools
- AWS Lambda
- Lambda triggers for Cognito
- AWS SDK for JavaScript v3
- AWS CLI
- AWS SAM
- API Gateway Cognito authorizers
- DynamoDB
- CloudWatch metrics

## Sources Consulted
- AWS CLI Command Reference: create-user-pool - https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/create-user-pool.html
- AWS CLI Command Reference: create-user-pool-client - https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/create-user-pool-client.html
- Amazon Cognito Developer Guide: Authentication flows - https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow-methods.html
- Amazon Cognito API Reference: InitiateAuth - https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_InitiateAuth.html
- AWS SDK for JavaScript v3 Cognito Identity Provider examples - https://docs.aws.amazon.com/code-library/latest/ug/javascript_3_cognito-identity-provider_code_examples.html
- Amazon Cognito Developer Guide: Pre sign-up Lambda trigger - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-sign-up.html
- AWS SAM Developer Guide: CognitoAuthorizer - https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-api-cognitoauthorizer.html
- Amazon Cognito Developer Guide: User pool metrics in CloudWatch - https://docs.aws.amazon.com/cognito/latest/developerguide/metrics-for-cognito-user-pools.html
- OneUptime blog link referenced in post - https://oneuptime.com/blog/post/2026-01-24-apm-monitoring/view

## Issues Found
- The introduction said the tutorial handles token refresh, but the post only configures the app client for refresh-token authentication and returns a refresh token at sign-in. Changed this to "refresh-token support" to match the implemented content.
- The monitoring section referred to a `SignInFailures` CloudWatch metric. Amazon Cognito documents `SignInSuccesses`; failed sign-ins are derived by subtracting the `Sum` statistic from the `Sample Count` statistic. Updated the metric guidance accordingly.

## Review Notes
The code examples use current AWS SDK for JavaScript v3 command classes and valid Cognito flows for a public app client. The sign-in example uses `USER_PASSWORD_AUTH`, which is valid when `ALLOW_USER_PASSWORD_AUTH` is enabled, but applications with higher security requirements may prefer SRP-based auth so the plaintext password is not sent directly to Cognito.
