# Validation Summary: How to Use DynamoDB Scan vs Query (and When to Use Each)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon DynamoDB
- DynamoDB Query and Scan operations
- DynamoDB read capacity and on-demand read request units
- AWS SDK for JavaScript v3
- Node.js

## Sources Consulted
- Amazon DynamoDB Developer Guide: Scanning tables in DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html
- Amazon DynamoDB Developer Guide: Key condition expressions for Query - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.KeyConditionExpressions.html
- Amazon DynamoDB API Reference: Query - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
- Amazon DynamoDB API Reference: Scan - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html
- Amazon DynamoDB Developer Guide: Read consistency - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html
- Amazon DynamoDB pricing - https://aws.amazon.com/dynamodb/pricing/
- AWS SDK for JavaScript v3 Developer Guide: DynamoDB examples - https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_dynamodb_code_examples.html
- AWS SDK for JavaScript v3 Developer Guide: DynamoDB document client - https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-dynamodb-doc-client.html
- AWS SDK for JavaScript v2 documentation: end-of-support notice - https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/index.html

## Issues Found
- The JavaScript examples used AWS SDK for JavaScript v2 (`aws-sdk` and `.promise()`), which AWS marks as end-of-support as of September 8, 2025. Updated the examples to AWS SDK for JavaScript v3 using `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `DynamoDBDocumentClient`, `QueryCommand`, and `ScanCommand`.
- Several scan examples returned only a single scan page, even though DynamoDB Scan returns at most 1 MB per call. Updated those examples to paginate with `LastEvaluatedKey` and `ExclusiveStartKey` where the function claims to return all matching or all table items.
- The capacity and cost example undercounted reads for 1 KB items. Updated the query estimate to about 13 eventually consistent read units and the full-table scan estimate to about 500,000 eventually consistent read units, with current US East (N. Virginia) on-demand pricing of about $0.0625.
- The sort key condition list omitted `<=` and `>=`, even though they are valid DynamoDB key condition operators. Added them to the list.
- The parallel scan example used top-level `await` in a CommonJS-style snippet. Wrapped the call in an async IIFE.
- The monitoring example could divide by zero when `ScannedCount` is 0. Added a guard for that case.

## Review Notes
The overall guidance is accurate: Query should be the default for key-based access patterns, Scan reads table or index data before applying filters, filters do not reduce read capacity consumed, Scan and Query are capped at 1 MB per call, and parallel scan can improve elapsed time while increasing throughput consumption. Future improvements could add a short note that GSIs support eventually consistent reads only.
