# Validation Summary: How to Build a Multi-Player Game Backend on AWS

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- AWS API Gateway WebSocket APIs
- AWS Lambda
- Amazon Cognito user pools
- Amazon DynamoDB and DynamoDB TTL
- Amazon SQS
- Amazon GameLift Servers
- AWS SDK for JavaScript v3
- Node.js / JavaScript

## Sources Consulted
- Amazon API Gateway WebSocket quotas: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-execution-service-websocket-limits-table.html
- AWS SDK for JavaScript v3 response and error handling: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/the-response-object.html
- API Gateway Management API PostToConnection errors: https://docs.aws.amazon.com/sdkfornet/v3/apidocs/items/ApiGatewayManagementApi/MApiGatewayManagementApiPostToConnectionAsyncPostToConnectionRequestCancellationToken.html
- DynamoDB update expressions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html
- DynamoDB Query API and ScanIndexForward behavior: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
- DynamoDB global secondary indexes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
- DynamoDB TTL behavior: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
- Amazon Cognito user pool attributes: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html
- AWS Lambda with Amazon SQS: https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
- AWS Lambda SQS scaling behavior: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-scaling.html
- Amazon GameLift Servers documentation: https://docs.aws.amazon.com/gameliftservers/

## Issues Found
- The Cognito snippet imported `InitiateAuthCommand` without using it and wrote to `custom:display_name`, which requires a preconfigured custom user-pool attribute. Changed the example to use the standard `nickname` attribute and removed the unused import.
- The WebSocket connection snippet imported DynamoDB document client helpers but did not create `docClient`. Added the v3 `DynamoDBClient` and `DynamoDBDocumentClient.from(...)` initialization.
- The WebSocket connection snippet accepted a possibly missing `playerId`, which can produce an invalid DynamoDB document item and conflicts with the authentication flow. Added an authorizer-claims lookup with a fallback to the query string and a 401 response when no player ID is available.
- The DynamoDB TTL comment implied exact cleanup after one hour. Updated the TTL to align with API Gateway WebSocket's two-hour maximum connection duration and clarified that the item becomes eligible for TTL cleanup.
- The API Gateway Management API cleanup path checked `error.statusCode === 410`. AWS SDK for JavaScript v3 guidance is to handle service exceptions by name, so this was changed to `error.name === 'GoneException'`.
- The SQS matchmaking snippet imported unused receive/delete commands and used `sqs` without initializing it. Added `new SQSClient({})` and removed unused imports.
- The matchmaking loop could ignore a player when the skill range check failed. Updated the loop to start a new candidate match with that player.
- The leaderboard query used a GSI partition key but the update path never populated `GSI1PK`, so the player would not appear in the queried index. Updated the score write to set `GSI1PK`.
- The leaderboard prose referred generally to a sort key, while the code queries a global secondary index sorted by score. Updated the wording to match the DynamoDB access pattern.

## Review Notes
The remaining snippets are still illustrative and depend on application-specific helpers such as `createPlayerProfile`, `generateGuestToken`, `collectWaitingPlayers`, `getGameState`, and `isValidMove`. For production use, the WebSocket connection should rely on a real Cognito/JWT authorizer instead of query-string identity, and the leaderboard GSI must be defined with `GSI1PK` as the partition key and `score` as the sort key.
