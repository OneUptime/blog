# Validation Summary: How to Fix DynamoDB 'ValidationException' Errors

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon DynamoDB
- AWS CLI
- boto3 for Python
- botocore error handling
- Amazon CloudWatch metrics

## Sources Consulted
- Amazon DynamoDB Developer Guide: Constraints in Amazon DynamoDB, https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html
- Amazon DynamoDB API Reference: BatchGetItem, https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchGetItem.html
- Amazon DynamoDB Developer Guide: Reserved words in DynamoDB, https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ReservedWords.html
- Amazon DynamoDB Developer Guide: Key condition expressions for Query, https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.KeyConditionExpressions.html
- AWS CLI Command Reference: dynamodb describe-table, https://awscli.amazonaws.com/v2/documentation/api/latest/reference/dynamodb/describe-table.html
- Boto3 documentation: Error handling, https://docs.aws.amazon.com/boto3/latest/guide/error-handling.html
- Amazon DynamoDB Developer Guide: Monitoring metrics with Amazon CloudWatch, https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Monitoring-metrics-with-Amazon-CloudWatch.html
- Amazon DynamoDB Developer Guide: DynamoDB metrics and dimensions, https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html

## Issues Found
- The batch write example used a generic `items` variable, which could imply plain DynamoDB items. Updated it to `write_requests` and clarified that the low-level `batch_write_item` call expects `PutRequest` or `DeleteRequest` objects.
- The item-size check used `sys.getsizeof(json.dumps(item))` and a `400000` byte threshold. Updated it to estimate UTF-8 byte length with `len(json.dumps(item).encode('utf-8'))` and compare against `400 * 1024`, matching DynamoDB's documented 400 KB item limit more closely.
- The exception-handling example caught `client.exceptions.ClientError`, but boto3 documents AWS service errors as `botocore.exceptions.ClientError`. Added the correct import and catch clause.

## Review Notes
The item-size example remains a rough preflight estimate, not an exact DynamoDB item-size calculator. Exact item sizing depends on DynamoDB's attribute encoding rules, including attribute names and value lengths.
