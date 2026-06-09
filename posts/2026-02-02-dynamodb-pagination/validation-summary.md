# Validation Summary: How to Handle Pagination in DynamoDB

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Amazon DynamoDB (Query, Scan, Parallel Scan, GSI)
- AWS SDK for JavaScript v3 (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`)
- Python `boto3` (DynamoDB resource API, `Key` conditions)
- Node.js / Express (REST cursor-based pagination)
- Base64url encoding for cursor tokens

## Sources Consulted
- AWS DynamoDB Developer Guide — Working with queries and scans (pagination, `LastEvaluatedKey`, `ExclusiveStartKey`, `Limit`): https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.Pagination.html
- AWS DynamoDB Developer Guide — Parallel Scan (`Segment`, `TotalSegments`): https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html#Scan.ParallelScan
- AWS SDK for JavaScript v3 — `QueryCommand`, `ScanCommand`, `DynamoDBDocumentClient`: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/dynamodb/
- boto3 documentation — DynamoDB Table.query / Table.scan, `boto3.dynamodb.conditions.Key`: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb/table/query.html
- AWS DynamoDB API Reference — Query/Scan request and response parameters (`Select`, `ReturnConsumedCapacity`, `ScanIndexForward`, `IndexName`): https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
- Node.js Buffer docs — `base64url` encoding (supported in Node.js 16+): https://nodejs.org/api/buffer.html

## Issues Found
No technical issues found.

All code examples are syntactically correct and use current, non-deprecated APIs:
- AWS SDK v3 imports and client construction are correct.
- `KeyConditionExpression`, `ExpressionAttributeValues`, `FilterExpression`, `Limit`, `ExclusiveStartKey`, `LastEvaluatedKey`, `IndexName`, `ScanIndexForward`, `Select`, `Segment`/`TotalSegments`, and `ReturnConsumedCapacity` are all used per the official API spec.
- boto3 `Key('attr').eq(value)` condition expression usage is correct.
- The 1 MB response size limit and the post-read application of `FilterExpression` are stated accurately.
- The `Select='COUNT'` behavior (returns count, may still paginate across 1 MB pages) is correct.
- The `BidirectionalPaginator` class logic traces correctly: page keys are cached on the way forward and reused when stepping backward.
- The base64url encoding via `Buffer.from(...).toString('base64url')` is valid (Node.js 16+).
- The parallel scan example correctly uses `Promise.all` + `Array.prototype.flat()` (Node.js 11+).

## Review Notes
- The statement "DynamoDB only supports forward pagination natively. To implement backward pagination, you need to use ScanIndexForward" is a slight simplification — `ScanIndexForward` controls sort order, not pagination direction. True backward pagination is achieved via the cached-page-keys approach shown in `BidirectionalPaginator`. The code itself is correct, and the simplification is common in tutorials, so no change was made.
- `parseInt(req.query.limit)` in the Express example omits the radix argument. This is a lint-style nit (most linters default to flagging it), not a correctness bug — modern JS engines default to base 10 for non-`0x`-prefixed strings. Left as-is.
- The post uses AWS SDK v3, which is the current recommended SDK; v2 is in maintenance mode as of 2024 and end-of-support as of September 8, 2025. No deprecation concerns.
- The article correctly distinguishes `Count` (returned) vs `ScannedCount` (evaluated before filter), which is a common source of confusion.
