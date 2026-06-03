# Validation Summary: How to Build a Serverless REST API on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Amazon API Gateway HTTP APIs
- Amazon DynamoDB
- AWS SDK for JavaScript v3
- Serverless Framework
- serverless-offline
- Node.js
- JWT authorizers

## Sources Consulted
- AWS Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda Node.js runtime guide: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- Serverless Framework HTTP API events and authorizers: https://www.serverless.com/framework/docs/providers/aws/events/http-api
- Serverless Framework IAM role statements: https://www.serverless.com/framework/docs/providers/aws/guide/iam
- Serverless Framework deploy function command: https://www.serverless.com/framework/docs/providers/aws/cli-reference/deploy-function
- serverless-offline plugin documentation: https://www.serverless.com/plugins/serverless-offline
- DynamoDB with AWS SDK for JavaScript v3: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/programming-with-javascript.html
- AWS SDK for JavaScript v3 DynamoDB examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_dynamodb_code_examples.html
- AWS CloudFormation DynamoDB table reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-dynamodb-table.html
- API Gateway JWT authorizer documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html
- Node.js crypto.randomUUID documentation: https://nodejs.org/api/crypto.html
- uuid package documentation: https://github.com/uuidjs/uuid
- Linked OneUptime blog URLs in the post, checked with HTTP HEAD requests.

## Issues Found
- The post used the `nodejs20.x` Lambda runtime. AWS lists Node.js 20 as deprecated as of April 30, 2026, so the Serverless Framework example was updated to `nodejs22.x`.
- The setup commands installed `uuid`, but the handler used `require('uuid')`. Current `uuid` versions no longer support CommonJS, so the code was changed to use Node.js built-in `crypto.randomUUID()` and the `uuid` install command was removed.
- The setup commands omitted `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb`, even though the handlers import those packages and `serverless-offline` needs them installed locally. The install command now includes both AWS SDK v3 packages.
- The HTTP API configuration returned CORS headers from Lambda but did not configure API Gateway HTTP API CORS handling for preflight requests. Added `provider.httpApi.cors: true`.
- The architecture diagram showed Secrets Manager even though no Secrets Manager integration appears in the tutorial. Removed that node.
- The architecture diagram labeled authentication as a Lambda authorizer, but the tutorial configures a JWT authorizer. Updated the diagram to say JWT Authorizer.
- The authentication snippet defined a JWT authorizer but did not attach it to any route. Added a route-level `authorizer` example and clarified that it must be attached to each protected route.
- The description claimed CI/CD deployment, but the post only covers manual Serverless Framework deployment commands. Removed the CI/CD claim from the description.

## Review Notes
- The DynamoDB table and GSI CloudFormation syntax is valid, but the `createdAt-index` uses `id` as the partition key, so it will not support a global list sorted by creation time. The post does not use the index in code, so this was left unchanged.
- The update handler uses `body.description || existing.Item.description`, so clients cannot set `description` to an empty string. This is a behavior caveat rather than an AWS/API correctness issue.
- The three OneUptime links referenced in the post returned HTTP 200 during validation.
