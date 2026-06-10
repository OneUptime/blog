# Validation Summary: How to Implement Local Secondary Indexes in DynamoDB

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Amazon DynamoDB (Local Secondary Indexes, Global Secondary Indexes, item collections, projections)
- AWS CLI (`aws dynamodb create-table`)
- AWS CloudFormation (`AWS::DynamoDB::Table`)
- AWS SDK for JavaScript v3 (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`)
- AWS SDK for Python (boto3, including `boto3.dynamodb.conditions.Key`)
- Amazon CloudWatch (alarms, `get_metric_statistics`)

## Sources Consulted
- DynamoDB Local Secondary Indexes overview: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/LSI.html
- DynamoDB item collections (10 GB limit): https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/LSI.html#LSI.ItemCollections
- DynamoDB CloudWatch metrics and dimensions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
- DynamoDB service quotas (5 LSI/table, 20 GSI/table defaults): https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html
- `ReturnItemCollectionMetrics` parameter (PutItem API reference): https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html
- AWS CLI `create-table` reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/create-table.html
- CloudFormation `AWS::DynamoDB::Table` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html
- AWS SDK for JavaScript v3 `lib-dynamodb` (`DynamoDBDocumentClient`, `QueryCommand`, `UpdateCommand`): https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/

## Issues Found

1. **Non-existent CloudWatch metric `ItemCollectionSizeBytes`** (in `enable_item_collection_metrics`).
   - **Problem**: DynamoDB does not publish item collection size as a CloudWatch metric. The `AWS/DynamoDB` namespace has no `ItemCollectionSizeBytes` metric, so the alarm would never fire. Item collection size information is only surfaced via the `ReturnItemCollectionMetrics` request parameter on write operations, returning a `SizeEstimateRangeGB` range in the API response.
   - **Fix**: Replaced the function with `write_with_collection_metrics`, which performs a write with `ReturnItemCollectionMetrics='SIZE'`, reads the returned `SizeEstimateRangeGB`, and prints a warning when the upper bound nears 10 GB. Updated docstring to explain that this is the correct mechanism.

2. **Non-existent CloudWatch dimension `LocalSecondaryIndexName`** (in `get_lsi_metrics`).
   - **Problem**: DynamoDB's CloudWatch dimensions include `TableName` and `GlobalSecondaryIndexName` but not `LocalSecondaryIndexName`. LSI traffic is aggregated into the base table's metrics — there is no per-LSI breakdown. The `get_metric_statistics` call as written would return empty datapoints.
   - **Fix**: Removed the `LocalSecondaryIndexName` dimension and the `index_name` parameter from the function signature, and added a docstring note explaining that LSI metrics roll up into the base table's metrics.

## Review Notes
- All other technical claims verified as correct: the 5-LSI-per-table and 20-GSI-per-table default quotas, the 10 GB item collection limit applying only to tables with LSIs, LSI partition key requirement matching the base table, LSIs being defined only at table-creation time, strongly consistent reads being available on LSIs (and not on GSIs), sparse-index behavior for items missing the LSI sort key attribute, and LSIs' ability to fetch non-projected attributes from the base table at the cost of additional RCUs.
- AWS CLI `create-table` invocation with `--local-secondary-indexes` JSON literal is syntactically valid; attribute set covers all key-schema attributes (table keys + LSI sort keys) as required.
- CloudFormation `LocalSecondaryIndexes` schema (IndexName, KeySchema, Projection with NonKeyAttributes) matches the current `AWS::DynamoDB::Table` resource specification.
- Node.js SDK v3 usage (`DynamoDBDocumentClient.from`, `QueryCommand`, `UpdateCommand`, `ScanIndexForward`, `ConsistentRead`) is correct and current. The `consistent-read-example.js` and `projection-fetch-example.js` snippets are partial — `docClient` and `UpdateCommand` are not imported in those excerpts because the post presents them as continuations of the earlier file; this is a stylistic choice rather than a technical error.
- boto3 usage (`boto3.resource('dynamodb')`, `Key().eq()`, `Key().between()`, `ScanIndexForward`, `ConsistentRead`, `ExclusiveStartKey`/`LastEvaluatedKey`) is correct.
- `datetime.utcnow()` is used in a few Python examples. It emits a `DeprecationWarning` in Python 3.12+ in favor of `datetime.now(timezone.utc)`. It still works correctly, so I did not change it, but a future revision could modernize these calls.
