# Validation Summary: How to Implement Conditional Writes in DynamoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon DynamoDB (condition expressions, UpdateItem, PutItem, TransactWriteItems)
- AWS SDK for JavaScript v3 (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`)
- DynamoDB Document Client (`DynamoDBDocumentClient`)
- DynamoDB transactions and optimistic locking patterns
- Mermaid diagrams for flowcharts, sequence diagrams, and state diagrams

## Sources Consulted
- AWS DynamoDB Developer Guide — Condition Expressions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html
- AWS DynamoDB Developer Guide — Comparison Operator and Function Reference: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.OperatorsAndFunctions.html
- AWS DynamoDB Developer Guide — Reserved Words: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ReservedWords.html
- AWS DynamoDB Developer Guide — Update Expressions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html
- AWS DynamoDB Developer Guide — TransactWriteItems and TransactionCanceledException: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html
- AWS SDK for JavaScript v3 documentation for `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb`
- AWS DynamoDB Developer Guide — Optimistic Locking with Version Numbers: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBMapper.OptimisticLocking.html

## Issues Found

1. **`status` used as a bare attribute name in multiple condition expressions.** `STATUS` is a DynamoDB reserved word, so expressions like `'SET status = :newStatus'` and `'status = :pending AND ...'` would fail at runtime with a reserved keyword error. Updated the `updateExisting` example (Condition Functions section) and the four logical operator examples (`andCondition`, `orCondition`, `notCondition`, `complexCondition`) to use the `#status` placeholder with an `ExpressionAttributeNames` mapping. Added inline notes calling out the reserved word.

2. **OptimisticLock condition fails on items that lack a `version` attribute.** The code read `currentItem.version || 0` (defaulting missing versions to 0), but the condition `version = :currentVersion` evaluates to false when the `version` attribute is absent, so the first update on any item without a pre-existing `version` would loop until retries are exhausted. Updated the `ConditionExpression` to `'attribute_not_exists(version) OR version = :currentVersion'` so the first write on an un-versioned item succeeds and seeds the attribute.

3. **Misleading `from: 'CURRENT_STATE'` "placeholder" in `transitionOrderState`.** The comment claimed DynamoDB would substitute the prior status value into the transition record, but DynamoDB has no mechanism to copy an existing attribute value into a different attribute path within an `UpdateExpression`. The literal string `'CURRENT_STATE'` would have been persisted. Removed the `from` field from the inline transition object, switched `ReturnValues` from `ALL_NEW` to `ALL_OLD` so the caller can read the previous status from the response, updated the log message and return value accordingly, and added a comment explaining the limitation.

## Review Notes

- The comparison operators table uses example attribute names such as `timestamp` and `status` that are themselves reserved words in DynamoDB. These cells are illustrative and meant to show operator syntax (not runnable snippets), so they were left as-is rather than rewriting the whole table.
- The "Handling Conditional Check Failures" section imports `ConditionalCheckFailedException`, `TransactionCanceledException`, and `ProvisionedThroughputExceededException` from `@aws-sdk/client-dynamodb` but never uses them directly (the code branches on `error.name` instead). The imports are valid exports of the v3 client and harmless, just unused. Not a technical error.
- The `OptimisticLock.update` method passes `ExpressionAttributeNames: expressionAttributeNames` even when the caller's `updateFn` does not return one. The AWS SDK accepts `undefined` for this field, so this is fine in practice.
- The fragmented snippets (e.g. the atomic counter section imports only `UpdateCommand`) assume the reader has the surrounding setup from earlier examples. This is a stylistic choice rather than a technical issue.
- `TransactionCanceledException.CancellationReasons` access pattern is correct for AWS SDK v3 (the field is present on the exception when item-level conditions fail).
- All DynamoDB condition functions referenced (`attribute_exists`, `attribute_not_exists`, `attribute_type`, `begins_with`, `contains`, `size`) and operators (`=`, `<>`, `<`, `<=`, `>`, `>=`, `BETWEEN`, `IN`, `AND`, `OR`, `NOT`) are documented and current as of the AWS DynamoDB Developer Guide.
- The single-character `attribute_type` codes used (`'N'`) match the documented set (`S`, `SS`, `N`, `NS`, `B`, `BS`, `BOOL`, `NULL`, `L`, `M`).
- The `if_not_exists` function usage in the transactional `Customers` update is syntactically correct.
