# Validation Summary: How to Build a Scalable E-Commerce Platform on AWS

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- AWS CloudFront
- Amazon API Gateway HTTP APIs
- AWS Lambda
- Amazon DynamoDB
- Amazon ElastiCache for Redis OSS
- Amazon SQS
- Amazon OpenSearch Service
- AWS Secrets Manager
- Amazon SES
- Amazon SNS
- AWS CLI
- Node.js
- AWS SDK for JavaScript v3
- ioredis
- OpenSearch JavaScript client

## Sources Consulted
- AWS SDK for JavaScript v3 DynamoDB examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/dynamodb-example-dynamodb-utilities.html
- AWS SDK for JavaScript v3 @aws-sdk/lib-dynamodb package reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/
- Amazon DynamoDB on-demand capacity mode: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/on-demand-capacity-mode.html
- Amazon SQS SendMessage API reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SendMessage.html
- AWS Lambda SQS event source error handling: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html
- AWS Lambda SQS event source configuration: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html
- Amazon API Gateway HTTP API JWT authorizers: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html
- AWS::ApiGatewayV2::Route CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigatewayv2-route.html
- AWS::ApiGatewayV2::Authorizer CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigatewayv2-authorizer.html
- AWS CLI lambda put-function-concurrency reference: https://docs.aws.amazon.com/cli/latest/reference/lambda/put-function-concurrency.html
- Amazon ElastiCache Valkey or Redis OSS nodes and shards: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheNodes.NodeGroups.html
- OpenSearch Search API reference: https://docs.opensearch.org/latest/api-reference/search-apis/search/
- OneUptime linked metrics collection post: https://oneuptime.com/blog/post/2026-02-12-build-a-metrics-collection-system-on-aws/view

## Issues Found
- The product service encoded `LastEvaluatedKey` as base64 for `nextPage`, but attempted to parse the incoming token directly as JSON. Updated the code to base64-decode `lastKey` before passing it as DynamoDB `ExclusiveStartKey`.
- The product service imported `GetCommand` but never used it. Removed the unused import to keep the example accurate.
- The cart and order examples used the REST API / older Cognito authorizer claim path `event.requestContext.authorizer.claims.sub` while the configuration snippet uses API Gateway HTTP APIs with JWT authorization. Updated both examples to read `event.requestContext.authorizer.jwt.claims.sub`, matching HTTP API JWT authorizer events.
- The order service used `docClient` without creating it and did not import `DynamoDBClient`. Added the missing AWS SDK v3 DynamoDB client initialization.
- The SQS retry comment stated that messages return to the queue for retry and go to a DLQ after 3 attempts. Updated it to describe Lambda's SQS retry behavior more accurately: failed batches are retried after the queue visibility timeout, and repeated failures require a source queue redrive policy.
- The API Gateway route snippet set `AuthorizationType: JWT` without showing a JWT authorizer or attaching `AuthorizerId` to the protected routes. Added an `AWS::ApiGatewayV2::Authorizer` example and attached it to the cart and order routes.

## Review Notes
The JavaScript snippets were checked with `node --check` after the fixes. The API Gateway YAML remains an excerpt and still assumes surrounding resources such as Lambda integrations, Cognito user pool resources, stages, and permissions are defined elsewhere.
