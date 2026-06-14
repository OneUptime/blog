# Validation Summary: How to Implement DynamoDB Single-Table Design

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Amazon DynamoDB
- DynamoDB single-table design
- DynamoDB global secondary indexes
- DynamoDB transactions
- AWS SDK for JavaScript v3
- TypeScript

## Sources Consulted
- Amazon DynamoDB Developer Guide: Querying tables in DynamoDB: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html
- Amazon DynamoDB Developer Guide: Key condition expressions for Query: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.KeyConditionExpressions.html
- Amazon DynamoDB Developer Guide: Using global secondary indexes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
- Amazon DynamoDB Developer Guide: Sparse indexes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-indexes-general-sparse-indexes.html
- Amazon DynamoDB Developer Guide: Transactions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html
- Amazon DynamoDB API Reference: BatchWriteItem: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html
- Amazon DynamoDB Developer Guide: Constraints and item collection size limits: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html
- Amazon DynamoDB Developer Guide: Sort key best practices: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-sort-keys.html
- AWS SDK for JavaScript v3: @aws-sdk/lib-dynamodb: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/

## Issues Found
- The post stated that DynamoDB charges per table for on-demand capacity. Updated this to say DynamoDB charges for reading, writing, storage, and optional features, which matches AWS pricing documentation.
- The benefits table said single-table design reduces read capacity units. Updated this to avoid implying that combining reads always reduces RCUs, because DynamoDB read charges are based on data read and consistency, not simply request count.
- The benefits table implied TransactWriteItems works only within one table. Updated this because DynamoDB transactions can target multiple tables in the same account and Region.
- The Query explanation said DynamoDB can only query one partition. Updated this to "one partition-key value" to avoid confusing logical key access with physical partitions.
- The example access pattern listed "Get recent orders" but the shown model only supports recent orders within a status-oriented GSI. Updated the access pattern wording to "Get recent orders by status."
- The table design had GSI1PK and GSI1SK reversed for order status queries. Updated the table so the order lookup item uses `GSI1PK = STATUS#<status>` and `GSI1SK = ORDER#<date>#<orderId>`, matching the later query code.
- The hierarchical data example showed a sort-key prefix condition without the required partition-key equality condition. Updated the query example to include `PK = "FILESYSTEM#user123"`.
- The time-series example used a partition key that could put all metrics for a day into one hot key. Updated it to bucket by server and day.
- The DynamoDB client setup imported commands that were not used in that snippet. Removed the unused imports.
- The `updateOrderStatus` example updated only the order metadata item, leaving the denormalized user order summary stale. Reworked it to read the order metadata and then use `TransactWriteCommand` to update both copies atomically.
- The migration example used `BatchWriteCommand` without handling `UnprocessedItems`. Added a retry helper with exponential backoff for unprocessed writes.
- The migration example batched 25 legacy orders even though each order creates two DynamoDB writes, which can exceed BatchWriteItem's 25-operation limit. Reduced the order batch size to 12.
- The unbounded item collection section said DynamoDB limits partition size to 10GB. Updated this to the more precise local secondary index item-collection limit and retained the practical warning about unbounded keys.

## Review Notes
The post is technically sound after the corrections. Future improvements could add explicit pagination examples for Query results over 1 MB and stronger discussion of GSI hot-key risks for low-cardinality status values.
