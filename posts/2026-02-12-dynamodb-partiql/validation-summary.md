# Validation Summary: How to Use DynamoDB PartiQL for SQL-Like Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon DynamoDB
- PartiQL for DynamoDB
- AWS SDK for JavaScript v3
- AWS CLI
- DynamoDB transactions and batch operations

## Sources Consulted
- AWS DynamoDB Developer Guide: PartiQL for DynamoDB: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.html
- AWS DynamoDB Developer Guide: PartiQL SELECT statements: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.select.html
- AWS DynamoDB Developer Guide: PartiQL INSERT statements: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.insert.html
- AWS DynamoDB Developer Guide: PartiQL UPDATE statements: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.update.html
- AWS DynamoDB Developer Guide: PartiQL DELETE statements: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.delete.html
- AWS DynamoDB Developer Guide: Running batch operations with PartiQL: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.multiplestatements.batching.html
- AWS DynamoDB Developer Guide: Performing transactions with PartiQL: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.multiplestatements.transactions.html
- AWS DynamoDB Developer Guide: PartiQL functions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-functions.html
- AWS DynamoDB API Reference: ExecuteStatement: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_ExecuteStatement.html
- AWS SDK for JavaScript v2 end-of-support announcement: https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-javascript-v2/
- AWS SDK for JavaScript v3 DynamoDB examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/dynamodb-example-dynamodb-utilities.html

## Issues Found
- The SDK examples used AWS SDK for JavaScript v2 (`aws-sdk`) and `.promise()`, but AWS SDK for JavaScript v2 reached end of support on September 8, 2025. Updated the examples to AWS SDK for JavaScript v3 commands.
- The `executeStatement` helper assumed every statement returns `Items`; DynamoDB write statements return an empty `Items` value. Updated the helper to handle missing `Items`.
- The post said PartiQL `INSERT` is equivalent to `PutItem` and replaces an existing item. AWS documents that PartiQL `INSERT` returns `DuplicateItemException` when the primary key already exists. Updated the explanation.
- The post described batch statements as atomic. AWS documents `BatchExecuteStatement` as non-transactional and each statement is processed independently. Updated the wording and added the read/write batch restriction.
- The native API comparison used a v2 `DocumentClient` query example. Updated it to AWS SDK for JavaScript v3 `DynamoDBDocumentClient` and `QueryCommand`.
- The native API comparison implied PartiQL lacks `ReturnConsumedCapacity`, but the DynamoDB PartiQL APIs support it. Reworded the comparison to avoid that inaccurate claim.
- The post said to use `begins_with` via the native API instead of PartiQL. AWS documents `begins_with` and `contains` as supported PartiQL functions. Updated the gotcha.
- The parameter-type gotcha implied all PartiQL SDK usage requires DynamoDB type descriptors. Narrowed it to the low-level DynamoDB client, since the v3 document client can marshal native JavaScript values.
- The DynamoDB console instructions described opening PartiQL through "Explore table items." AWS currently documents the PartiQL editor as an item in the DynamoDB console navigation pane. Updated the instruction.

## Review Notes
The article is now technically accurate for the low-level DynamoDB client examples. Future improvements could add a pagination note for `ExecuteStatement`, since SELECT responses can include `LastEvaluatedKey` or `NextToken`.
