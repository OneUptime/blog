# Validation Summary: How to Build an Event Store Pattern on AWS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS DynamoDB
- DynamoDB Streams
- Amazon Kinesis Data Streams
- AWS Lambda
- AWS CLI
- Python
- boto3 / botocore
- Event sourcing and event store architecture

## Sources Consulted
- AWS CLI DynamoDB create-table command reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/create-table.html
- DynamoDB condition expressions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html
- boto3 DynamoDB Table.query reference: https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/table/query.html
- DynamoDB transaction APIs: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html
- botocore DynamoDB TransactWriteItems reference: https://docs.aws.amazon.com/botocore/latest/reference/services/dynamodb/client/transact_write_items.html
- DynamoDB Streams with AWS Lambda: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.Lambda.html
- AWS Lambda with DynamoDB streams: https://docs.aws.amazon.com/lambda/latest/dg/with-ddb.html
- Kinesis Data Streams terminology and partition keys: https://docs.aws.amazon.com/streams/latest/dev/key-concepts.html
- AWS Lambda with Kinesis Data Streams: https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis-example.html
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Referenced OneUptime SNS/SQS fan-out post: https://oneuptime.com/blog/post/2026-02-12-implement-parallel-fan-out-with-sns-and-sqs/view

## Issues Found
- The post said DynamoDB provides ordered storage without qualification. DynamoDB ordering is by sort key within a partition, so the wording was changed to "ordered by sort key within each entity."
- The event model used `datetime.utcnow()`, which is deprecated in modern Python. It now uses `datetime.now(timezone.utc).isoformat()` and imports `timezone`.
- The event store's `append_batch` method hardcoded `EventStore` instead of using the configured table name from `__init__`. It now stores `self.table_name` and uses that in transaction writes.
- The batch append example did not guard against DynamoDB's transaction action limit. It now raises `ValueError` when more than 100 events are passed.
- The transaction cancellation check matched against the string representation of the exception. It now checks the structured botocore error code.
- The `get_events` method claimed to retrieve all events but only returned the first DynamoDB Query page. It now follows `LastEvaluatedKey` with `ExclusiveStartKey` until all pages are retrieved.
- The Order aggregate appended new events but did not advance `self.version`, so a subsequent event from the same loaded instance could reuse the same version and fail optimistic locking. The `place` and `cancel` methods now update `self.version` after a successful append.
- The Python snippets were syntax-checked after the edits.

## Review Notes
The examples are accurate as tutorial code, but a production implementation would still need additional operational details such as IAM policies, stream and Lambda event source mappings, Kinesis stream creation, retry/idempotency handling for projections, shard and hot-partition capacity planning, and snapshot table implementation.
