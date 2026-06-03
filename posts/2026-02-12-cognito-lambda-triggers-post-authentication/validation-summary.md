# Validation Summary: How to Use Cognito Lambda Triggers (Post Authentication)

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Amazon Cognito user pool Lambda triggers
- AWS Lambda
- Terraform AWS provider
- Node.js 22
- AWS SDK for JavaScript v3
- Amazon DynamoDB
- Amazon SES
- Amazon Data Firehose
- Amazon SQS

## Sources Consulted
- Amazon Cognito: Post authentication Lambda trigger: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-post-authentication.html
- Amazon Cognito: Customizing user pool workflows with Lambda triggers: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-working-with-lambda-triggers.html
- AWS Lambda: Building Lambda functions with Node.js: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- AWS Lambda: Define Lambda function handler in Node.js: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html
- Terraform AWS provider: aws_cognito_user_pool: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool
- Terraform AWS provider: aws_lambda_permission: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission

## Issues Found
- The post said the trigger cannot block sign-in. AWS documents that post-authentication runs after authentication is complete but before tokens are returned, and trigger errors or missing request/response data can cause the authentication event not to complete. Updated the introduction and summary to describe this accurately.
- The Terraform example used `nodejs20.x`. As of June 3, 2026, Node.js 20 has passed its AWS Lambda deprecation date, while Node.js 22 remains supported. Updated the runtime to `nodejs22.x`.
- The post advised keeping the trigger under 10 seconds and set the Lambda timeout to 10 seconds. Amazon Cognito requires synchronous Lambda triggers to respond within 5 seconds and this value cannot be changed. Updated the Lambda timeout and performance guidance to 5 seconds.
- The new-device section did not mention that `newDeviceUsed` is only set when remembered devices are configured as `Always` or `User Opt-In`. Added that caveat before the example.

## Review Notes
The JavaScript examples use AWS SDK for JavaScript v3 clients and valid command shapes for DynamoDB, SES, Firehose, and SQS. The `clientMetadata` examples are technically valid, but callers must explicitly provide this metadata through the supported Cognito challenge-response APIs; Cognito does not automatically populate fields such as source IP or user agent in `clientMetadata`.
