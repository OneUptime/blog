# Validation Summary: How to Configure WebSocket with AWS API Gateway

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS API Gateway WebSocket APIs
- AWS Lambda
- Amazon DynamoDB and TTL
- AWS SDK for JavaScript v3
- CloudFormation
- EventBridge scheduled rules
- CloudWatch metrics, metric filters, alarms, and dashboards
- JavaScript WebSocket clients
- wscat

## Sources Consulted
- AWS API Gateway WebSocket API overview: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-overview.html
- AWS API Gateway WebSocket routes and integrations: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-routes-integrations.html
- AWS API Gateway @connections management API: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-how-to-call-websocket-api-connections.html
- AWS API Gateway WebSocket quotas: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-execution-service-websocket-limits-table.html
- AWS API Gateway WebSocket CloudWatch metrics: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-logging.html
- AWS CloudFormation AWS::ApiGatewayV2 resources: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigatewayv2-api.html
- AWS CloudFormation AWS::Lambda::Function Code: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-lambda-function-code.html
- AWS Lambda Node.js runtimes and SDK guidance: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- DynamoDB TTL documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
- AWS SDK for JavaScript v3 API Gateway Management API client: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/apigatewaymanagementapi/

## Issues Found
- The Lambda IAM policy did not grant DynamoDB actions used by the examples. Added `dynamodb:UpdateItem`, `dynamodb:BatchGetItem`, `dynamodb:BatchWriteItem`, and `dynamodb:TransactWriteItems`.
- The message handler used `DeleteCommand` without importing it and imported an unused API Gateway command. Added the missing import and removed the unused import.
- The examples checked only `err.statusCode === 410` for stale WebSocket connections. Updated checks to also recognize `GoneException` and SDK v3 `$metadata.httpStatusCode`.
- The message Lambda timeout was set to 30 seconds, while API Gateway WebSocket integrations have a 29-second maximum integration timeout. Changed it to 29 seconds.
- The stale connection cleanup scan only processed the first DynamoDB scan page. Added pagination using `LastEvaluatedKey`.
- The scheduled cleanup Lambda snippet used inline CloudFormation `ZipFile` code while requiring a separate `connection-manager.js` file. Changed it to an S3 deployment package that includes both files.
- The high-traffic broadcast helper used `PostToConnectionCommand` without importing it. Added the missing AWS SDK import.
- The scaling diagram listed API Gateway response caching, which is not a WebSocket API optimization. Replaced it with detailed metrics.
- The monitoring dashboard used a non-supported `DisconnectCount` WebSocket metric. Replaced it with the supported `MessageCount` metric.
- The monitoring CloudFormation snippet referenced a Lambda log group and SNS topic without defining them. Added an explicit log group and parameters for required external values.

## Review Notes
The post is technically sound after the fixes. Future improvements could include adding route-specific detailed metrics, explicit Lambda deployment package instructions for each handler, and notes on WebSocket payload and frame size limits.
