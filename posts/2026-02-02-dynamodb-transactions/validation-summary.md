# Validation Summary: How to Implement Transactions in DynamoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon DynamoDB (TransactWriteItems, TransactGetItems, ConditionCheck)
- AWS SDK for JavaScript v3 (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`)
- Node.js (JavaScript, `crypto` module)
- Saga pattern / compensating transactions

## Sources Consulted
- AWS DynamoDB Developer Guide — Managing complex workflows with DynamoDB transactions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transactions.html
- AWS API Reference — TransactWriteItems: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html
- AWS API Reference — TransactGetItems: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactGetItems.html
- AWS Service Quotas — DynamoDB: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html
- AWS SDK for JavaScript v3 docs — `@aws-sdk/lib-dynamodb` (TransactWriteCommand, TransactGetCommand): https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/
- AWS announcement (September 2022): DynamoDB transactions increased from 25 to 100 actions per transaction

## Issues Found
- **Transaction Flow mermaid diagram**: The diagram showed `TransactionConflictException` as a top-level error returned by `TransactWriteItems` for a lock conflict. Per AWS documentation, `TransactWriteItems` does not throw `TransactionConflictException` directly — concurrent transaction conflicts are reported as `TransactionCanceledException` with a `TransactionConflict` code in `CancellationReasons` (which is exactly how the post's own `executeWithRetry` code handles it). I updated the diagram to label the failure branches as `TransactionCanceledException (ConditionalCheckFailed)` and `TransactionCanceledException (TransactionConflict)` to match the actual API behavior.

## Review Notes
- Limits cited are current: 100 actions per transaction (raised from 25 in September 2022), 4 MB transaction request size, 400 KB item size, 10-minute idempotency window — all match AWS Service Quotas and the TransactWriteItems API reference.
- The `ClientRequestToken` constraints (1–36 characters) are respected by the `substring(0, 36)` of the SHA-256 hex digest.
- `ReturnValuesOnConditionCheckFailure: 'ALL_OLD'` on Update within `TransactWriteItems` is a valid recent addition to the API and is used correctly.
- The `TransactGetCommand` is referenced in the Consistent Reads section but not explicitly imported in that snippet. It must be added alongside `TransactWriteCommand` from `@aws-sdk/lib-dynamodb` for the example to run. This is a minor convenience note for readers; not a technical error in itself.
- `attribute_not_exists(orderId)` in the order-placement Put works correctly (since the condition is evaluated against any existing item at the composite key), though `attribute_not_exists(PK)` is a more conventional idiom for "don't overwrite".
- The "Counter updates" row in the introductory table is a simplification — DynamoDB's atomic `ADD`/`SET` already prevents single-item counter race conditions without transactions; the row implicitly refers to multi-item counter consistency. Acceptable for an intro framing.
- The saga example uses `reservedQty` in one section and `reserved` in another. These are independent examples, so it does not break either example, but a reader copy-pasting both into the same codebase would notice the inconsistency.
