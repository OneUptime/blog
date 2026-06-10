# Validation Summary: How to Use DynamoDB with Python (boto3)

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Amazon DynamoDB (NoSQL database)
- Python (3.x)
- boto3 (AWS SDK for Python)
- botocore (config, exceptions, retry modes)
- DynamoDB Local (for development/testing)
- Concurrent futures (ThreadPoolExecutor) for parallel scans
- Python `decimal.Decimal` for numeric precision

## Sources Consulted
- boto3 DynamoDB documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb.html
- boto3 DynamoDB resource reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb/service-resource/index.html
- AWS DynamoDB Developer Guide: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html
- DynamoDB TTL docs: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html (confirms typical deletion within 48 hours of expiration)
- DynamoDB Reserved Words: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ReservedWords.html (confirms `status` is reserved)
- BatchGetItem limits: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchGetItem.html (100 items max per request)
- BatchWriteItem limits: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html (25 items max per request)
- TransactWriteItems / TransactionCanceledException: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html
- botocore retry modes (adaptive): https://botocore.amazonaws.com/v1/documentation/api/latest/reference/config.html
- boto3 batch_writer (overwrite_by_pkeys): https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb/table/batch_writer.html

## Issues Found
- **Misleading docstring on `add_or_update_attribute`** (posts/2026-02-02-dynamodb-python-boto3/README.md, line ~642): The docstring stated "Uses if_not_exists to set default for new attributes," but the actual `UpdateExpression` is a plain `SET` (no `if_not_exists` function call). A reader following the docstring would expect the existing value to be preserved when present, which is the opposite of what the code does. Updated the docstring to accurately describe the SET semantics ("creates the attribute if missing or overwrites it if present").

## Review Notes
- `datetime.utcnow()` is used throughout the examples. This method is deprecated since Python 3.12 in favor of `datetime.now(timezone.utc)`. It still functions correctly, so it is not incorrect, but readers running on Python 3.12+ will see a `DeprecationWarning`. Considered minor and stylistic; not changed to avoid scope creep.
- In `OrderService.update_status`, the local `valid_transitions` dict is defined but never used. It is dead code in the example but not a technical error.
- `hashlib.md5` is used in `get_sharded_partition_key` purely for partition distribution, not for security, so its use here is appropriate.
- The TTL claim "within 48 hours" still matches the current AWS DynamoDB Developer Guide wording.
- All API surface area used (KeySchema, AttributeDefinitions, GlobalSecondaryIndexes, ProvisionedThroughput, PAY_PER_REQUEST billing mode, ConditionExpression, ExpressionAttributeNames/Values, ScanIndexForward, ExclusiveStartKey/LastEvaluatedKey, parallel scan via Segment/TotalSegments, `batch_writer(overwrite_by_pkeys=...)`, `transact_write_items`, `transact_get_items`, `update_time_to_live`) matches current boto3/DynamoDB APIs.
- Batch limits (25 writes / 100 reads) and reserved-word handling for `status` are correctly stated.
- Mermaid diagrams render correctly and accurately reflect the described flows.
