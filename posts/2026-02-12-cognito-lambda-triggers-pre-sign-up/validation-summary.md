# Validation Summary: How to Use Cognito Lambda Triggers (Pre Sign-Up)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Cognito User Pools
- Cognito Lambda triggers
- AWS Lambda
- AWS SDK for JavaScript v3
- Amazon DynamoDB
- Terraform AWS provider
- IAM permissions
- Node.js

## Sources Consulted
- Amazon Cognito pre sign-up Lambda trigger documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-sign-up.html
- Amazon Cognito Lambda trigger workflow documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-working-with-lambda-triggers.html
- Amazon Cognito AdminLinkProviderForUser API reference: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminLinkProviderForUser.html
- Amazon Cognito user account search and ListUsers filtering documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/how-to-manage-user-accounts.html
- AWS Lambda Node.js runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- AWS SDK for JavaScript v3 CognitoIdentityProviderClient documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/cognito-identity-provider/
- AWS SDK for JavaScript v3 DynamoDB UpdateItemCommand documentation: https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/dynamodb-2012-08-10/UpdateItem
- Amazon DynamoDB update expression documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html
- Terraform AWS provider aws_cognito_user_pool documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool
- Terraform AWS provider aws_lambda_function documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS provider aws_lambda_permission documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission

## Issues Found
- The Terraform example used the `nodejs20.x` Lambda runtime, which is deprecated as of April 30, 2026. Updated it to `nodejs22.x`, a current managed Node.js runtime.
- The auto-confirm example claimed admin-created users could be auto-confirmed through `PreSignUp_AdminCreateUser`. Amazon Cognito ignores `autoConfirmUser`, `autoVerifyEmail`, and `autoVerifyPhone` for `AdminCreateUser`, so the example now returns the event unchanged for that trigger source.
- The auto-confirm example set `autoVerifyEmail` for federated users without checking whether the email attribute was present. Cognito requires a valid non-null email when `autoVerifyEmail` is true, so the example now sets it only when an email exists.
- The email-domain example assumed every email contained an `@` domain. Added a guard that returns a user-friendly validation error for malformed email values.
- The rate-limiting example used a separate `GetItem` and `UpdateItem`, which is racy under concurrent sign-up attempts. Replaced it with a single conditional `UpdateItem` so the hourly limit is enforced atomically.
- The summary described the five-second Lambda limit mainly as a UX concern. Updated it to reflect that Cognito triggers must respond within 5 seconds.

## Review Notes
- The account-linking example is technically consistent with Cognito's documented `AdminLinkProviderForUser` flow for trusted external IdPs, but production implementations should verify that the provider and linked attribute are trusted before linking accounts.
- The rate-limit example depends on the application passing `sourceIp` through `clientMetadata`; Cognito does not automatically add the caller IP to this field.
