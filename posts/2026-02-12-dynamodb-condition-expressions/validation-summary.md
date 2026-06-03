# Validation Summary: How to Write DynamoDB Condition Expressions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon DynamoDB
- DynamoDB condition expressions
- DynamoDB update expressions
- AWS SDK for JavaScript v3
- Node.js

## Sources Consulted
- Amazon DynamoDB Developer Guide: Condition and filter expressions, operators, and functions in DynamoDB: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.OperatorsAndFunctions.html
- Amazon DynamoDB Developer Guide: DynamoDB condition expression examples: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html
- Amazon DynamoDB API Reference: PutItem: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html
- Amazon DynamoDB API Reference: UpdateItem: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateItem.html
- Amazon DynamoDB API Reference: TransactWriteItems: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html
- Amazon DynamoDB Developer Guide: Amazon DynamoDB Transactions: How it works: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html
- Amazon DynamoDB Developer Guide: Optimistic locking with version number: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/BestPractices_OptimisticLocking.html
- AWS SDK for JavaScript v3 Developer Guide: DynamoDB document client: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-dynamodb-doc-client.html
- AWS SDK for JavaScript v3 Developer Guide: DynamoDB examples using SDK for JavaScript v3: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_dynamodb_code_examples.html
- AWS SDK for JavaScript API Reference: AWS.DynamoDB.DocumentClient: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html

## Issues Found
- The opening sentence described condition expressions as DynamoDB's answer to transactions in traditional databases. DynamoDB has separate transactional APIs, including `TransactWriteItems` and `TransactGetItems`, so this was changed to describe condition expressions as one of DynamoDB's tools for safe writes.
- The JavaScript examples used the AWS SDK for JavaScript v2 `AWS.DynamoDB.DocumentClient` and `.promise()` calls. AWS marks SDK v2 as end-of-support, so the examples were updated to use the AWS SDK for JavaScript v3 `DynamoDBDocumentClient` with `PutCommand`, `GetCommand`, `UpdateCommand`, and `DeleteCommand`.
- The exception handling examples checked `error.code`, which is the old v2 style. The v3 examples now check `error.name === 'ConditionalCheckFailedException'`.

## Review Notes
- `ReturnValuesOnConditionCheckFailure: 'ALL_OLD'` is valid for failed conditional write operations and is supported by DynamoDB and the JavaScript document client.
- The condition-expression operators, functions, and logical examples match DynamoDB's documented condition/filter expression grammar.
- The post's examples assume tables whose keys match the simple `Key` objects shown, such as `Users` keyed by `userId` and `Products` keyed by `productId`.
