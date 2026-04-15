# Validation Summary: How to Sync DynamoDB Data to ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon DynamoDB
- DynamoDB Streams
- AWS Lambda (Python)
- Amazon Kinesis
- AWS Glue (PySpark)
- ClickHouse (ReplacingMergeTree, s3() table function, FINAL modifier)
- AWS CLI

## Sources Consulted
- AWS CLI DynamoDB reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/update-table.html
- AWS DynamoDB Streams documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html
- AWS DynamoDB Kinesis streaming destination: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/kds.html
- boto3 DynamoDB TypeDeserializer: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb.html
- AWS Glue DynamoDB connection options: https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-etl-connect-dynamodb-home.html
- ClickHouse ReplacingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse FINAL modifier: https://clickhouse.com/docs/en/sql-reference/statements/select/from#final-modifier
- ClickHouse s3() table function: https://clickhouse.com/docs/en/sql-reference/table-functions/s3
- ClickHouse HTTP interface: https://clickhouse.com/docs/en/interfaces/http

## Issues Found

### 1. Incorrect AWS Glue `additional_options` for DynamoDB read
- **What was wrong:** The Glue `from_catalog()` call used `additional_options={"dynamodb.output.tableName": "orders"}`. The `dynamodb.output.tableName` option is for writing to DynamoDB, not reading. When reading from the Glue Data Catalog, this option is invalid and unnecessary.
- **What was changed:** Removed the `additional_options` parameter entirely, since the table metadata is already available from the catalog entry.
- **Why:** The `dynamodb.output.*` prefix is for the DynamoDB write path. The read counterpart would be `dynamodb.input.tableName`, but it is also unnecessary when reading via `from_catalog()` since the table name is already specified through the catalog.

### 2. Delete handler produced rows in wrong partition, breaking ReplacingMergeTree deduplication
- **What was wrong:** The REMOVE event handler only included `order_id` and `_deleted` in the inserted row. All other columns (including `created_at`) would receive default values. Since `created_at` defaults to epoch (`1970-01-01 00:00:00`), the delete marker would land in partition `197001`, while the original row is in a different partition (e.g., `202603`). ClickHouse's `ReplacingMergeTree` only deduplicates within a single partition — both during background merges and when using `FINAL`. This means the delete marker would never replace the original row, and `WHERE _deleted = 0` would still return the "deleted" row.
- **What was changed:** The REMOVE handler now deserializes the full `OldImage` from the stream record (available because the stream is configured with `NEW_AND_OLD_IMAGES` view type) and includes all fields (`order_id`, `user_id`, `status`, `total`, `created_at`) along with `_deleted: 1`. This ensures the delete marker lands in the same partition as the original row.
- **Why:** `ReplacingMergeTree` + `FINAL` deduplication is partition-scoped. Rows with the same ORDER BY key but different partition key values are never merged together.

## Review Notes
- The `from decimal import Decimal` import in the Lambda function is unused by the code directly (boto3's TypeDeserializer returns Decimal internally, but the code converts to int/float immediately). This is harmless and common in DynamoDB Lambda examples, so it was left as-is.
- The `ReplacingMergeTree()` is used without a version column. This means during merges, the last inserted row (by insertion order) is kept. This works correctly for the streaming use case where events arrive in order, but could be fragile if events arrive out of order. A version column (e.g., a timestamp or sequence number) would make this more robust, but is beyond the scope of this tutorial.
- ClickHouse 23.2+ supports `ReplacingMergeTree(ver, is_deleted)` with native delete column support, which would be a cleaner approach. The `_deleted` + `WHERE _deleted = 0` pattern used in this post is the traditional approach and remains valid.
