# Validation Summary: How to Use DynamoDB with Node.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon DynamoDB
- Node.js
- AWS SDK for JavaScript v3 (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `@aws-sdk/util-dynamodb`)
- DynamoDB Local (for development/testing)
- Docker / Docker Compose
- Jest (test example)

## Sources Consulted
- AWS SDK for JavaScript v3 — DynamoDB client docs (https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/dynamodb/)
- AWS SDK for JavaScript v3 — lib-dynamodb (DocumentClient) docs (https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/)
- Amazon DynamoDB Developer Guide — CreateTable, PutItem, GetItem, UpdateItem, DeleteItem, Query, Scan (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/)
- DynamoDB transactions — TransactWriteItems / TransactGetItems limits (up to 100 items per transaction since Sept 2022)
- DynamoDB BatchWriteItem (25-item limit) and BatchGetItem (100-item limit) documentation
- DynamoDB Time to Live (TTL) — uses Unix epoch seconds, expired items deleted within ~48 hours
- AWS announcement: "Amazon DynamoDB now supports empty values for non-key String and Binary attributes" (May 2020)
- aaronshaf/dynamodb-admin Docker image (defaults to port 8001)
- amazon/dynamodb-local Docker image documentation

## Issues Found
1. **Outdated claim about empty strings.** The marshall-options comment said *"DynamoDB does not support empty strings"*. This has not been true since May 2020 — DynamoDB supports empty strings (and binary) for non-key attributes. Updated the comment to clarify what `convertEmptyValues: true` actually does (converts empty strings, blobs, and sets to null) and notes that this option is now optional because DynamoDB supports empty string values.

No other technical issues found. AWS SDK v3 package names, command classes (`PutCommand`, `GetCommand`, `UpdateCommand`, `DeleteCommand`, `QueryCommand`, `ScanCommand`, `BatchWriteCommand`, `BatchGetCommand`, `TransactWriteCommand`, `CreateTableCommand`, `DeleteTableCommand`), error class names (`ConditionalCheckFailedException`, `TransactionCanceledException`, `ProvisionedThroughputExceededException`, `ResourceInUseException`, `ResourceNotFoundException`, `ValidationException`), batch-size limits, transaction limits, TTL semantics, and ConditionExpression / UpdateExpression syntax all match current AWS documentation.

## Review Notes
- The `getCustomerOrders` function uses option names `startDate`/`endDate` but applies them to `orderId BETWEEN` in the `KeyConditionExpression`. The code is syntactically valid (orderId values will work in a BETWEEN expression on the sort key) but the naming is slightly misleading; a true date-range query would target the `OrderDateIndex` LSI. Left as-is because the code is functionally correct and the post separately demonstrates LSI/GSI queries.
- `Math.random().toString(36).substr(2, 9)` uses the deprecated `String.prototype.substr`. It still works in all current Node.js versions, but `substring` or `slice` would be preferred long-term. Not changed — the example would still work for any reader copying it.
- The TTL comment "DynamoDB will automatically delete when this timestamp passes" is slightly idealized — in practice TTL deletions can take up to ~48 hours after expiry. Acceptable as a short inline comment.
- `wrapNumbers: false` is the SDK default; the comment is accurate but the option is technically redundant. Harmless.
- `docker-compose.yml` declares `version: '3.8'`, which the modern Compose Specification ignores (no longer required). Not changed — it still works and is widely used in tutorials.
- The post writes `dynamodb-admin` to port 8001, which matches the `aaronshaf/dynamodb-admin` default.
