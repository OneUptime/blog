# Validation Summary: How to Use Cognito Lambda Triggers (Pre Authentication)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Cognito user pool Lambda triggers
- AWS Lambda
- Terraform AWS provider
- Node.js
- AWS SDK for JavaScript v3
- Amazon DynamoDB
- AWS Systems Manager Parameter Store
- AWS Amplify Auth

## Sources Consulted
- Amazon Cognito pre authentication Lambda trigger documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-authentication.html
- Amazon Cognito Lambda trigger workflow, common parameters, trigger source mappings, client metadata, and timeout documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-working-with-lambda-triggers.html
- AWS Amplify Auth advanced workflows documentation for `signIn` `clientMetadata`: https://docs.amplify.aws/react/frontend/auth/advanced-workflows/
- AWS Lambda supported and deprecated runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda provisioned concurrency documentation: https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html
- Terraform AWS provider `aws_lambda_function` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS provider `aws_lambda_provisioned_concurrency_config` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_provisioned_concurrency_config
- Referenced OneUptime post-authentication link, verified reachable: https://oneuptime.com/blog/post/2026-02-12-cognito-lambda-triggers-post-authentication/view

## Issues Found
- The Terraform Lambda example used `nodejs20.x`, which AWS now lists as a deprecated Lambda runtime as of April 30, 2026. Changed it to `nodejs24.x`, a supported runtime.
- The introduction implied the pre-authentication trigger fires on every sign-in without caveats. AWS documents that existing-session renewal doesn't activate the trigger, and non-existent users only activate it when `PreventUserExistenceErrors` is enabled. Tightened the wording to avoid overclaiming.
- The account-lockout section said Cognito doesn't have built-in account lockout beyond throttling and suggested tracking failed attempts in Post Authentication. AWS Cognito has temporary lockouts for repeated failed passwords, and Post Authentication only runs after successful authentication. Updated the guidance to use external failed-auth tracking and use Post Authentication only for success-side handling such as counter resets.
- The account-lockout sample imported `UpdateItemCommand` and declared `LOCKOUT_MINUTES` without using them. Removed both to keep the sample accurate.
- The IP and audit logging examples read metadata from `event.request.clientMetadata`. For pre-authentication triggers, Cognito passes `ClientMetadata` from `InitiateAuth` and `AdminInitiateAuth` as `event.request.validationData`. Updated the examples accordingly.
- The IP-control section used client-supplied IP metadata for a security decision without warning that it can be tampered with. Added a short note recommending trusted backend or edge-layer metadata for security-sensitive checks.
- The maintenance-mode example used `if (!cachedMaintenanceMode || now > cacheExpiry)`, which refetched Parameter Store on every invocation when the cached value was `false`. Changed it to `cachedMaintenanceMode === null || now > cacheExpiry`.
- The provisioned-concurrency Terraform example configured concurrency against a version but didn't show an alias or explain that Cognito must invoke the alias/version that has provisioned concurrency. Updated the example to use a Lambda alias and added a note to set `publish = true` and point Cognito at the alias ARN.

## Review Notes
The examples are now technically aligned with the cited documentation. The CIDR helper remains a simple IPv4-only example; production code should use a tested IP/CIDR library if IPv6, malformed input, or broad CIDR coverage matters.
