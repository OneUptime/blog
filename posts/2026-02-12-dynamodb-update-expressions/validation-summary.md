# Validation Summary: How to Write DynamoDB Update Expressions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon DynamoDB
- DynamoDB update expressions
- AWS SDK for JavaScript v3
- JavaScript

## Sources Consulted
- AWS DynamoDB Developer Guide: Using update expressions in DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html
- AWS DynamoDB API Reference: UpdateItem - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateItem.html
- AWS DynamoDB Developer Guide: DynamoDB read and write operations - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html
- AWS DynamoDB Developer Guide: Reserved words in DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ReservedWords.html
- AWS DynamoDB Developer Guide: Expression attribute names in DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ExpressionAttributeNames.html
- AWS SDK for JavaScript v3 Developer Guide: DynamoDB document client - https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-dynamodb-doc-client.html
- AWS SDK for JavaScript v3 API Reference: UpdateCommand - https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/Class/UpdateCommand/
- AWS Developer Tools Blog: AWS SDK for JavaScript v2 end-of-support announcement - https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-javascript-v2/

## Issues Found
- The code examples used the AWS SDK for JavaScript v2 `AWS.DynamoDB.DocumentClient`, `docClient.update(params).promise()`, and `docClient.createSet(...)`. AWS SDK for JavaScript v2 reached end-of-support on September 8, 2025, so the examples were outdated for a 2026 post. Updated the examples to use AWS SDK for JavaScript v3 with `DynamoDBClient`, `DynamoDBDocumentClient`, `UpdateCommand`, `docClient.send(...)`, and native JavaScript `Set` values.
- The `safeMapUpdate` example checked `error.code`, which is the v2 error style. Updated it to check `error.name`, matching AWS SDK for JavaScript v3 service exceptions.
- The introduction claimed that update expressions use less write capacity. AWS documents that `UpdateItem` consumes write throughput based on the larger of the item size before and after the update, even when only a subset of attributes changes. Revised the claim to say update expressions avoid an extra read request.

## Review Notes
The DynamoDB update expression syntax, action semantics (`SET`, `REMOVE`, `ADD`, `DELETE`), list behavior, parent-map error behavior, reserved-word aliasing, and `ReturnValues` options were verified against AWS documentation. Future improvements could mention that `ReturnValues` does not consume read capacity units, aside from response-size overhead, but the current explanation is technically correct.
