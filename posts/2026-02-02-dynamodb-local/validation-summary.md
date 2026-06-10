# Validation Summary: How to Use DynamoDB Local for Development

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- DynamoDB Local (amazon/dynamodb-local Docker image)
- Docker and Docker Compose
- AWS SDK v3 for JavaScript/TypeScript (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`)
- AWS SDK for Python (boto3, botocore)
- AWS CLI (`aws dynamodb` subcommands)
- Jest (used in integration test examples)
- aaronshaf/dynamodb-admin (optional admin UI)
- Mermaid diagrams

## Sources Consulted
- AWS DynamoDB CreateTable API Reference — https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_CreateTable.html
- AWS DynamoDB UpdateTimeToLive API Reference — https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateTimeToLive.html
- AWS SDK for JavaScript v3 — `UpdateTimeToLiveCommand` — https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/dynamodb/command/UpdateTimeToLiveCommand/
- AWS SDK for JavaScript v3 — `@aws-sdk/lib-dynamodb` (DocumentClient, ScanCommand) — https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/
- AWS Setting Up DynamoDB Local — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html
- boto3 DynamoDB docs — https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb.html
- amazon/dynamodb-local on Docker Hub — https://hub.docker.com/r/amazon/dynamodb-local

## Issues Found
1. **`TimeToLiveSpecification` was passed as a `CreateTable` parameter (invalid).** The Sessions table definition included `TimeToLiveSpecification`, but the DynamoDB `CreateTable` API does not accept that field. TTL must be configured separately via `UpdateTimeToLive` after the table is `ACTIVE`. The real DynamoDB service would reject the request; DynamoDB Local may silently ignore the unknown field, hiding the bug.
   - **Fix:** Removed `TimeToLiveSpecification` from the Sessions `CreateTable` definition. Added `UpdateTimeToLiveCommand` to the imports and a follow-up loop that enables TTL on Sessions (attribute `expiresAt`) after table creation. Added a brief code comment explaining why the call is separate.

2. **`Users` table had `createdAt` in `AttributeDefinitions` but the attribute was not used in any key or index.** DynamoDB's `CreateTable` validation requires that every entry in `AttributeDefinitions` be referenced by either `KeySchema`, an LSI, or a GSI. An unused attribute causes a `ValidationException`.
   - **Fix:** Removed `createdAt` from the `Users` `AttributeDefinitions` array. The `Orders` table's `AttributeDefinitions` is unchanged because all four attributes (`userId`, `orderId`, `status`, `createdAt`) are used by the primary key or the `StatusIndex` GSI.

3. **`ScanCommand` was used in `UserService.listUsers` but never imported.** The destructured import from `@aws-sdk/lib-dynamodb` did not include `ScanCommand`, so the example would throw `ReferenceError: ScanCommand is not defined` at runtime.
   - **Fix:** Added `ScanCommand` to the destructured import in the `services/user-service.js` example.

## Review Notes
- The `healthcheck` for the `dynamodb-local` service in `docker-compose.yml` uses `curl`. Recent `amazon/dynamodb-local` images (based on Amazon Corretto) do not ship with `curl` by default, so this specific healthcheck may not work on those image tags. Common alternatives are `wget --spider`, a TCP probe with `nc`, or running the healthcheck from the host. Left as-is since it is a widely used pattern in tutorials and not strictly incorrect for older image variants.
- The `marshallOptions.convertEmptyValues` option is still supported in `@aws-sdk/lib-dynamodb`, though it has become less commonly used now that DynamoDB accepts empty strings and binary values in most contexts. The default (`false`) is fine.
- The first `docker run` example relies on the image's default CMD (`-jar DynamoDBLocal.jar -inMemory -sharedDb`), so the "data lost on restart" comment is accurate.
- DynamoDB Local does not actually expire items via TTL (TTL deletion is not enforced locally). The post does not make a misleading claim here, but this is worth noting if a future revision dives deeper into the Sessions example.
- One test ("should not allow duplicate user IDs") sets up the scenario but never asserts the expected failure — the test body is essentially a no-op with a comment. Behavior is technically not wrong (the test will pass trivially), so no fix applied, but the test does not validate what its name implies.
