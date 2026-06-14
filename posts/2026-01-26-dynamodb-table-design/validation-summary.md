# Validation Summary: How to Design DynamoDB Table Schemas

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon DynamoDB
- AWS SDK for JavaScript v3
- DynamoDB primary keys, partition keys, and sort keys
- DynamoDB Query, PutItem, GetItem, UpdateItem, BatchWriteItem, and TransactWriteItems operations
- Global Secondary Indexes (GSIs)
- DynamoDB Time to Live (TTL)
- DynamoDB transactions

## Sources Consulted
- AWS DynamoDB Developer Guide: Core components - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html
- AWS DynamoDB Developer Guide: Partitions and data distribution - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.Partitions.html
- AWS DynamoDB Developer Guide: Querying tables - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html
- AWS DynamoDB Developer Guide: Key condition expressions for Query - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.KeyConditionExpressions.html
- AWS DynamoDB Developer Guide: Best practices for sort keys - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-sort-keys.html
- AWS DynamoDB Developer Guide: Using global secondary indexes - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
- AWS DynamoDB Developer Guide: Secondary index quotas - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html
- AWS DynamoDB Developer Guide: Update expressions - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html
- AWS DynamoDB Developer Guide: Time to Live (TTL) - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
- AWS DynamoDB API Reference: BatchWriteItem - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html
- AWS DynamoDB API Reference: TransactWriteItems - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html
- AWS SDK for JavaScript v3 DynamoDB package documentation - https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/

## Issues Found
- The e-commerce access pattern table said "Get order by ID" used `PK = ORDER#orderId`, but the implementation stores orders under `PK = USER#userId`. Changed the pattern to use the order lookup GSI key.
- The `createOrder` example populated status lookup attributes as `GSI1PK` and `GSI1SK`, while the table creation and query examples used `GSI2` for status queries. Changed the order example to use `GSI2PK` and `GSI2SK`.
- The `createOrder` example used `order.createdAt` for the GSI sort key even though the item created `createdAt` separately. Changed it to assign `createdAt` once and reuse that value.
- The `GSI2` projection listed `orderId` and `userId`, but the order item did not store those attributes. Added `orderId` and `userId` to the order item.
- The write-sharding example used `UpdateItemCommand` and `GetItemCommand` without importing them. Added the missing AWS SDK v3 imports.
- The `getDepartments` example had duplicate `ExpressionAttributeValues` properties in the same JavaScript object. Removed the redundant property so the example is unambiguous.
- The TTL comment implied immediate automatic deletion after the TTL timestamp. Updated the wording to reflect DynamoDB's documented best-effort TTL behavior.

## Review Notes
- The JavaScript snippets were syntax-checked after edits.
- The examples are still illustrative excerpts. Production code should also handle pagination for queries that can exceed 1 MB and retry `BatchWriteItem` `UnprocessedItems` with backoff.
