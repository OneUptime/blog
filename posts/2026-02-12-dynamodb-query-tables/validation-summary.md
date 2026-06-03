# Validation Summary: How to Query DynamoDB Tables Effectively

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon DynamoDB
- AWS SDK for JavaScript v3
- DynamoDB Query API
- DynamoDB key condition expressions
- DynamoDB filter expressions
- DynamoDB projection expressions
- DynamoDB pagination
- DynamoDB global secondary indexes

## Sources Consulted
- AWS SDK for JavaScript v2 end-of-support announcement: https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-javascript-v2/
- AWS SDK for JavaScript v2 documentation end-of-support notice: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/
- AWS SDK for JavaScript v3 DynamoDB examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_dynamodb_code_examples.html
- DynamoDB Query API reference: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
- DynamoDB key condition expressions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.KeyConditionExpressions.html
- DynamoDB projection expressions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ProjectionExpressions.html
- DynamoDB global secondary indexes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
- DynamoDB read consistency: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html
- DynamoDB reserved words: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ReservedWords.html

## Issues Found
- The JavaScript examples used AWS SDK for JavaScript v2 (`aws-sdk`, `AWS.DynamoDB.DocumentClient`, and `.promise()`), which reached end-of-support on September 8, 2025. Updated the examples to use AWS SDK for JavaScript v3 with `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `DynamoDBDocumentClient`, and `QueryCommand`.
- The projection section said `ProjectionExpression` can lower costs for large items. AWS documentation states projection expressions reduce returned attributes but do not reduce DynamoDB read capacity consumption. Updated the wording to say projection reduces network transfer but not read capacity consumption.

## Review Notes
The remaining Query behavior described in the post matches AWS documentation, including required partition-key equality, supported sort-key operators, default ascending sort order, `ScanIndexForward`, post-read filtering, 1 MB Query pages, `LastEvaluatedKey`/`ExclusiveStartKey` pagination, GSI querying with `IndexName`, lack of strongly consistent reads on GSIs, and `ReturnConsumedCapacity`.
