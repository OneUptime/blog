# Validation Summary: How to Build a WebSocket Application on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS API Gateway WebSocket APIs
- AWS CDK v2
- AWS Lambda
- Node.js
- AWS SDK for JavaScript v3
- DynamoDB
- API Gateway Management API
- wscat

## Sources Consulted
- AWS CDK v2 guide, "Work with the AWS CDK library": https://docs.aws.amazon.com/cdk/v2/guide/work-with.html
- AWS CDK API reference for WebSocket API integrations: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigatewayv2.WebSocketRouteIntegration.html
- AWS CDK API reference for Lambda Runtime: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Runtime.html
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda Node.js documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- Amazon API Gateway WebSocket route documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/websocket-api-develop-routes.html
- Amazon API Gateway WebSocket selection expressions: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-selection-expressions.html
- Amazon API Gateway WebSocket quotas: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-execution-service-websocket-limits-table.html
- API Gateway Management API PostToConnection reference: https://docs.aws.amazon.com/en_us/cli/latest/reference/apigatewaymanagementapi/post-to-connection.html
- AWS SDK for JavaScript v3 DynamoDB PutItemCommand reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-dynamodb/Class/PutItemCommand/

## Issues Found
- The CDK install command used CDK v1 service packages while the TypeScript imports used CDK v2 modules from `aws-cdk-lib`. Changed the install command to `npm install aws-cdk-lib constructs`.
- The CDK stack constructor used `cdk.App` and omitted optional `StackProps`, which is less compatible with the generated CDK app pattern. Updated it to accept `Construct`, `id`, and optional `cdk.StackProps`.
- The Lambda examples used `lambda.Runtime.NODEJS_18_X`, which is deprecated according to current AWS Lambda runtime documentation. Updated the examples to `lambda.Runtime.NODEJS_22_X`.
- The architecture and test payload refer to a `sendMessage` route, but the CDK stack only configured `$connect`, `$disconnect`, and `$default`. Added `routeSelectionExpression: '$request.body.action'` and an explicit `sendMessage` route.
- The stale connection cleanup checked `err.statusCode`, which is not the reliable AWS SDK for JavaScript v3 metadata shape. Updated the handler to check `err.name === 'GoneException'` or `err.$metadata?.httpStatusCode === 410`.
- The broadcast handler assumed DynamoDB `ScanCommand` always returns an `Items` array. Added a default empty array to avoid runtime failure if no items are returned.

## Review Notes
The corrected broadcast example remains a basic tutorial pattern. For production, the post correctly notes that full-table DynamoDB scans do not scale well for large fan-out workloads. AWS Lambda Node.js runtimes include AWS SDK for JavaScript v3, but production deployments should still consider bundling pinned SDK dependencies for repeatable builds.
