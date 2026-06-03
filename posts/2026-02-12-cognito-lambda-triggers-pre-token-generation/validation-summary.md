# Validation Summary: How to Use Cognito Lambda Triggers (Pre Token Generation)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Cognito user pools
- Cognito Pre Token Generation Lambda triggers
- AWS Lambda
- AWS CLI
- Node.js
- DynamoDB with AWS SDK for JavaScript v3
- JWT claims and scopes

## Sources Consulted
- Amazon Cognito Developer Guide: Pre token generation Lambda trigger: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html
- AWS CLI Command Reference: cognito-idp update-user-pool: https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/update-user-pool.html
- AWS CLI Command Reference: lambda add-permission: https://docs.aws.amazon.com/cli/latest/reference/lambda/add-permission.html
- Amazon Cognito Developer Guide: Quotas in Amazon Cognito: https://docs.aws.amazon.com/cognito/latest/developerguide/quotas.html

## Issues Found
- The post described the trigger as generally modifying both ID and access tokens. Updated the explanation to distinguish the default `V1_0` event, which customizes ID-token claims and group-related claims, from `V2_0` and `V3_0`, which support access-token claim and scope customization.
- The post said the Lambda receives the token payload and can modify the token structure. Updated this to say Cognito sends an event with user attributes and token-generation context, and the function returns supported claim, group, role, and scope overrides.
- The custom-claim warning incorrectly implied all standard OIDC claims can't be overridden. Updated it to clarify that some standard claims can be overridden, while protected claims like `sub`, `iss`, and the ID-token `aud` claim can't be changed.
- The suppression section said claim suppression only affects the ID token. Updated it to clarify that this is true for the default `V1_0` event, while `V2_0` and `V3_0` can suppress supported access-token claims with `claimsAndScopeOverrideDetails`.
- The group override example dropped existing IAM role and preferred-role values. Updated the example to preserve `iamRolesToOverride` and `preferredRole` when filtering groups.
- The `update-user-pool` example used the legacy `PreTokenGeneration` field for a new trigger setup. Updated it to use `PreTokenGenerationConfig` with `LambdaVersion` and `LambdaArn`, quoted for shell safety, and added the AWS CLI caveat that omitted user-pool settings can reset to defaults.
- The token-size section cited a 10,000-character claim limit. Updated it to refer to Cognito's current quota for total combined Pre Token Generation trigger changes and kept the practical warning about large JWTs.
- The local testing section used an `aws lambda invoke` command, which invokes a deployed function rather than testing locally. Replaced it with a local Node.js handler invocation and changed the sample event block to valid JSON.

## Review Notes
The examples intentionally use the version-one `claimsOverrideDetails` response shape. For applications that need access-token claims or scopes, a future expansion should include a separate `V2_0` or `V3_0` example using `claimsAndScopeOverrideDetails`.
