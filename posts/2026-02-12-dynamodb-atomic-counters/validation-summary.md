# Validation Summary: How to Use DynamoDB Atomic Counters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon DynamoDB
- DynamoDB UpdateItem and update expressions
- DynamoDB atomic counters and conditional writes
- AWS SDK for JavaScript v3
- JavaScript / Node.js

## Sources Consulted
- Amazon DynamoDB Developer Guide: Working with items and attributes, including Atomic counters and Conditional writes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html
- Amazon DynamoDB Developer Guide: Using update expressions in DynamoDB: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html
- Amazon DynamoDB API Reference: UpdateItem: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateItem.html
- Amazon DynamoDB Developer Guide: Read consistency: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html
- AWS SDK for JavaScript v3 Developer Guide: DynamoDB document client: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-dynamodb-doc-client.html
- AWS SDK for JavaScript v3 Developer Guide: DynamoDB examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_dynamodb_code_examples.html
- AWS Developer Tools Blog: AWS SDK for JavaScript v2 end-of-support announcement: https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-javascript-v2/

## Issues Found
- The code examples used the end-of-support AWS SDK for JavaScript v2 (`aws-sdk`, `AWS.DynamoDB.DocumentClient`, `.update(...).promise()`, and `docClient.createSet`). Updated the examples to AWS SDK for JavaScript v3 using `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `DynamoDBDocumentClient`, `UpdateCommand`, `docClient.send(...)`, and native JavaScript `Set`.
- Conditional write error checks used the v2-style `error.code`. Updated them to check `error.name`, matching AWS SDK for JavaScript v3 service exception examples.
- The internal explanation stated that DynamoDB acquires and releases an item lock. AWS documents atomic counters as `UpdateItem` operations where write requests are applied in the order received, but does not expose a lock implementation detail. Reworded the section to describe the documented behavior and the conceptual read/apply/write flow.
- The limitations section said atomic counters are eventually consistent by default. Clarified that reads after atomic counter updates are eventually consistent by default, while the counter update itself remains atomic.

## Review Notes
The JavaScript snippets were checked for parse validity after the SDK v3 migration. The two OneUptime links in the post returned HTTP 200. The like/unlike toggle remains a simplified example; production systems may want stricter idempotency semantics depending on how repeated toggle requests should behave.
