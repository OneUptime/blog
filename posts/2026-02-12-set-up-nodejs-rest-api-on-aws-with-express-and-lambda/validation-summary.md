# Validation Summary: How to Set Up a Node.js REST API on AWS with Express and Lambda

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node.js
- Express.js
- AWS Lambda
- Amazon API Gateway HTTP API
- Serverless Framework
- serverless-http
- serverless-offline
- Amazon DynamoDB
- AWS SDK for JavaScript v3
- AWS Lambda provisioned concurrency

## Sources Consulted
- AWS Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda Node.js runtime guide: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- AWS Lambda provisioned concurrency: https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html
- Serverless Framework HTTP API event documentation: https://www.serverless.com/framework/docs/providers/aws/events/http-api
- Serverless Framework serverless.yml reference: https://www.serverless.com/framework/docs/providers/aws/guide/serverless.yml
- Serverless Framework functions guide: https://www.serverless.com/framework/docs/providers/aws/guide/functions
- serverless-http README: https://github.com/dougmoscrop/serverless-http
- AWS SDK for JavaScript v3 DynamoDB examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_dynamodb_code_examples.html
- AWS SDK for JavaScript v3 DynamoDB UpdateCommand API reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/Class/UpdateCommand/
- Referenced OneUptime monitoring post: https://oneuptime.com/blog/post/2026-02-13-aws-monitoring-tools-comparison/view

## Issues Found
- The dependency installation command did not install `@aws-sdk/client-dynamodb` or `@aws-sdk/lib-dynamodb`, but the DynamoDB example required both packages. Added both packages to the `npm install` command.
- The Serverless Framework example used `nodejs20.x`, which AWS lists as deprecated on June 2, 2026. Updated the runtime to `nodejs22.x`.
- The HTTP API Lambda timeout was set to 30 seconds. Serverless Framework documents that the function timeout should stay below the API Gateway timeout to avoid 503 responses, so it was changed to 29 seconds.
- The DynamoDB helper used a hard-coded fallback table name and the Serverless configuration did not set `USERS_TABLE`. Added `USERS_TABLE: !Ref UsersTable` and made the helper read the table from that environment variable.
- The DynamoDB helper imported `UpdateCommand` but did not implement or export an update operation. Added `updateUser()` using `UpdateCommand` with `ReturnValues: 'ALL_NEW'`.
- The DynamoDB client hard-coded `us-east-1`, which would be incorrect if the Serverless region changed. Changed it to `new DynamoDBClient({})` so the SDK uses its normal region resolution.
- The JWT authorizer snippet referenced an undefined `HttpApiAuthorizerJwt` resource and mixed external-authorizer syntax with named authorizer syntax. Replaced it with the documented `provider.httpApi.authorizers` configuration and referenced the authorizer by name on the protected route.
- The provisioned concurrency example used an AWS CLI command with a `production` qualifier, but the shown Serverless setup did not create that alias or version qualifier. Replaced it with Serverless Framework's `provisionedConcurrency` function configuration, including an alias.
- The cold-start section gave a fixed typical latency range for Node.js Express cold starts. Reworded it to describe the documented factors that affect cold-start duration.

## Review Notes
The in-memory CRUD route remains intentionally simple for demo purposes and does not provide production-grade validation or persistence. The DynamoDB replacement helper is still a compact example and would need route integration, conditional error handling, pagination tokens, and stronger input validation for a real production API.
