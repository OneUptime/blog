# Validation Summary: How to Use DynamoDB FilterExpressions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon DynamoDB
- DynamoDB Query and Scan operations
- DynamoDB FilterExpression, KeyConditionExpression, and expression operators
- AWS SDK for JavaScript v3
- DynamoDBDocumentClient

## Sources Consulted
- AWS DynamoDB Developer Guide: Filter expressions for Query - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.FilterExpression.html
- AWS DynamoDB Developer Guide: Key condition expressions for Query - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.KeyConditionExpressions.html
- AWS DynamoDB Developer Guide: Condition and filter expressions, operators, and functions - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.OperatorsAndFunctions.html
- AWS DynamoDB API Reference: Scan - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html
- AWS DynamoDB Developer Guide: Reserved words - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ReservedWords.html
- AWS SDK for JavaScript v3: @aws-sdk/lib-dynamodb - https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/
- AWS Developer Tools Blog: AWS SDK for JavaScript v2 end-of-support announcement - https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-javascript-v2/
- OneUptime linked blog post - https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view

## Issues Found
- The JavaScript examples used the AWS SDK for JavaScript v2 `aws-sdk` package and `AWS.DynamoDB.DocumentClient`, which reached end-of-support on September 8, 2025. Updated the examples to use AWS SDK for JavaScript v3 with `DynamoDBClient`, `DynamoDBDocumentClient`, `QueryCommand`, and `ScanCommand`.
- The post described a single Scan example as scanning the entire Users table and reading 10 million items. DynamoDB Scan reads up to the request `Limit` or 1 MB per call before filtering; a full table scan requires pagination. Updated the wording to distinguish one Scan call from a complete paginated scan.
- The diagram and billing wording implied cost was strictly per item. DynamoDB read capacity is based on the data read, with item size and consistency affecting capacity. Updated the wording to say users pay for the data read.
- The `IN` operator comment said it checks if a value is in a list. In DynamoDB expressions, `IN` compares an operand against an enumerated list of expression values, not membership inside an attribute list. Updated the comment to clarify that it checks whether the attribute equals one of several values.

## Review Notes
The DynamoDB behavior described in the post is accurate after the edits: FilterExpressions are evaluated after Query or Scan reads candidate data and before returning results, do not reduce read capacity consumed by the read, and interact with `Limit` before filtering. The examples remain illustrative and assume the named table keys and indexes exist.
