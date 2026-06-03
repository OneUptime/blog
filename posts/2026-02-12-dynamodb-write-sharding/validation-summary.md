# Validation Summary: How to Use DynamoDB Write Sharding for Even Distribution

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon DynamoDB
- DynamoDB write sharding
- AWS SDK for JavaScript v3
- JavaScript

## Sources Consulted
- Amazon DynamoDB Developer Guide: Using write sharding to distribute workloads evenly in your DynamoDB table: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html
- Amazon DynamoDB Developer Guide: Best practices for designing and using partition keys effectively: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html
- Amazon DynamoDB Developer Guide: Key condition expressions for the Query operation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.KeyConditionExpressions.html
- Amazon DynamoDB Developer Guide: Paginating table query results: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.Pagination.html
- Amazon DynamoDB Developer Guide: Using update expressions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html
- AWS SDK for JavaScript v3 Developer Guide: DynamoDB document client: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-dynamodb-doc-client.html
- AWS SDK for JavaScript v3 Developer Guide: DynamoDB examples using SDK for JavaScript v3: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/dynamodb-example-dynamodb-utilities.html
- AWS SDK for JavaScript v2 README: end-of-support notice: https://docs.aws.amazon.com/goto/AWSJavaScriptSDK/AWS.html

## Issues Found
- The JavaScript examples used AWS SDK for JavaScript v2 (`aws-sdk` and `AWS.DynamoDB.DocumentClient`), which reached end of support on September 8, 2025. Updated the examples to use AWS SDK for JavaScript v3 with `DynamoDBClient`, `DynamoDBDocumentClient`, and command classes from `@aws-sdk/lib-dynamodb`.
- Several throughput statements treated writes per second as equivalent to write capacity units. Updated the wording and shard formula to refer to WCUs, with the 1 KB item-size caveat from DynamoDB capacity documentation.
- The scatter-gather example claimed pagination support but only returned a boolean. Updated the wording to pagination awareness and returned per-shard `LastEvaluatedKey` values so callers have the information needed to continue paginating.
- The time-series read example generated bucket keys directly from `startTime`, which could miss data if `startTime` was not aligned to the write bucket boundary. Updated the read path to floor `startTime` to the same interval boundary used by writes.

## Review Notes
The examples are illustrative and assume the table schemas match the shown key names (`pk`, `sk`, and `counterId`) and that the table has enough provisioned or on-demand capacity for the requested throughput. Query examples still show first-page reads unless explicitly paginated with the returned `LastEvaluatedKey` values.
