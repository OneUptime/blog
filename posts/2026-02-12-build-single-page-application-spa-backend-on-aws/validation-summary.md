# Validation Summary: How to Build a Single-Page Application (SPA) Backend on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS
- Amazon Cognito
- Amazon API Gateway HTTP APIs
- Amazon API Gateway WebSocket APIs
- AWS Lambda
- Amazon DynamoDB
- Amazon S3 pre-signed URLs
- AWS SDK for JavaScript v3
- JavaScript SPA API clients

## Sources Consulted
- AWS CLI Command Reference: `cognito-idp create-user-pool` - https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/create-user-pool.html
- AWS CLI Command Reference: `cognito-idp create-user-pool-client` - https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/create-user-pool-client.html
- Amazon Cognito app client settings - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-client-apps.html
- AWS CLI Command Reference: `apigatewayv2 create-api` - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/apigatewayv2/create-api.html
- AWS CLI Command Reference: `apigatewayv2 create-authorizer` - https://docs.aws.amazon.com/cli/latest/reference/apigatewayv2/create-authorizer.html
- API Gateway HTTP API CORS documentation - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html
- API Gateway HTTP API JWT authorizer documentation - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html
- AWS SDK for JavaScript v3 DynamoDB document client documentation - https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-dynamodb-doc-client.html
- AWS SDK for JavaScript v3 S3 pre-signed URL documentation - https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html
- API Gateway Management API `PostToConnection` documentation - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-how-to-call-websocket-api-connections.html

## Issues Found
- The architecture diagram labeled the API as "API Gateway REST" while the commands use API Gateway v2 HTTP APIs and JWT authorizers. Changed the diagram label to "API Gateway HTTP".
- The Cognito app client command configured OAuth flows, scopes, callback URLs, and logout URLs but omitted `--allowed-o-auth-flows-user-pool-client`, which AWS requires before OAuth authorization server features are enabled for the app client. Added the flag.
- The DynamoDB list example described `ScanIndexForward: false` as "newest first", but the shown table key uses `itemId` as the sort key, not `createdAt`. Changed the comment to "reverse sort-key order".
- The update handler could pass an undefined `title` into a DynamoDB `UpdateCommand`, which is invalid with AWS SDK for JavaScript v3 document client defaults. Added the same title validation used by the create handler.
- The WebSocket handler initialized `DynamoDBDocumentClient.from(/* ... */)`, which would not run as shown. Added the `DynamoDBClient` import and initialized the document client with `new DynamoDBClient({})`.
- The WebSocket broadcast helper assumed `ScanCommand` always returns `Items`. Updated it to handle an empty result safely.
- The stale WebSocket connection handler checked only `err.statusCode === 410`. AWS SDK for JavaScript v3 service exceptions expose the exception name and HTTP status metadata, so the check now handles `GoneException` and `$metadata.httpStatusCode === 410`.
- The summary claimed the stack "costs nothing when idle", which is inaccurate because stored data/assets can still incur storage charges. Changed it to say compute and request costs stay low when idle, while storage is still billed.

## Review Notes
- The post remains a high-level backend guide rather than a complete deployable infrastructure walkthrough. It does not include table, route, integration, Lambda permission, S3 bucket CORS, WebSocket authorizer, or IAM policy setup, but the included examples are technically coherent after the fixes above.
