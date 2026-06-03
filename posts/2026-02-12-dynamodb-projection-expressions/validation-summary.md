# Validation Summary: How to Use DynamoDB ProjectionExpressions to Limit Returned Attributes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon DynamoDB
- DynamoDB ProjectionExpression
- DynamoDB Query, Scan, GetItem, and BatchGetItem
- DynamoDB Global Secondary Indexes
- AWS SDK for JavaScript v3
- AWS CLI

## Sources Consulted
- AWS DynamoDB Developer Guide: Using projection expressions in DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ProjectionExpressions.html
- AWS DynamoDB API Reference: Query - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
- AWS DynamoDB Developer Guide: Using Global Secondary Indexes in DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
- AWS CLI Command Reference: dynamodb update-table - https://docs.aws.amazon.com/cli/latest/reference/dynamodb/update-table.html
- AWS SDK for JavaScript v2 README / end-of-support notice - https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/
- AWS SDK for JavaScript v3 lib-dynamodb documentation - https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/
- AWS DynamoDB Developer Guide: Reserved words in DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ReservedWords.html

## Issues Found
- The JavaScript examples used AWS SDK for JavaScript v2 (`aws-sdk` and `.promise()`), which reached end-of-support on September 8, 2025. Updated the examples to AWS SDK for JavaScript v3 using `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `DynamoDBDocumentClient`, and command objects.
- The GSI creation command defined a sort key named `price` but only included `categoryId` in `--attribute-definitions`. Added `AttributeName=price,AttributeType=N` because DynamoDB requires attribute definitions for key elements of the new index.
- The performance section said RCU savings are negligible for base table items under 4KB, which could imply larger base table items benefit from projection. Updated it to state that projection does not reduce base table RCU consumption even for items over 4KB.
- The phrase "all read operations" was narrowed to "core read operations" to avoid overclaiming while keeping the examples focused on GetItem, Query, Scan, and BatchGetItem.

## Review Notes
- The technical explanation that ProjectionExpression reduces returned attributes but does not reduce provisioned throughput consumption for base table reads matches AWS documentation.
- The GSI discussion is accurate: projected index entries can be smaller than base table items, and GSI reads consume capacity from the index based on index entry size.
- The post does not discuss local secondary index table-fetch behavior; that omission is acceptable for a GSI-focused article.
