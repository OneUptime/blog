# Validation Summary: ClickHouse for DynamoDB Developers - Key Differences

## Status
validated

## Post Type
Guide / comparison post for developers migrating from or integrating with ClickHouse alongside DynamoDB.

## Technologies Covered
- ClickHouse (MergeTree, ReplicatedMergeTree, Map, LowCardinality, clickhouse-connect Python client)
- Amazon DynamoDB (key-value/document model, partition/sort keys, Streams, Global Tables)
- AWS Lambda (event handler for Streams → ClickHouse ingestion)
- Python (boto3 Key expressions, clickhouse-connect)

## Sources Consulted
- ClickHouse Connect Python integration: https://clickhouse.com/docs/integrations/python
- ClickHouse Map(K, V) type: https://clickhouse.com/docs/sql-reference/data-types/map
- ClickHouse LowCardinality(T) type: https://clickhouse.com/docs/sql-reference/data-types/lowcardinality
- ClickHouse replication architecture: https://clickhouse.com/docs/architecture/replication
- DynamoDB Streams StreamRecord reference: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_streams_StreamRecord.html
- DynamoDB Global Tables: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html

## Issues Found
No technical issues found. Verified items:
- `clickhouse_connect.get_client(host=..., port=8443, secure=True)` — correct API and correct HTTPS port for ClickHouse Cloud.
- `ch.insert(table, rows, column_names=[...])` — correct clickhouse-connect method signature.
- `Map(String, String)` and `properties['page']` accessor — valid MergeTree type and query syntax.
- `LowCardinality(String)` — valid ClickHouse data type.
- DynamoDB Streams record shape (`record['dynamodb']['NewImage']`, `{'S': ...}`, `{'N': ...}`) — matches the official StreamRecord format (numbers arrive as strings, which is compatible with ClickHouse DateTime Unix-timestamp ingestion).
- DynamoDB Global Tables — correctly described as multi-region active-active.
- `ReplicatedMergeTree` — correctly described as within-region by default with cross-region needing extra setup.

## Review Notes
- The first code block is fenced as ```sql but illustratively mixes a Python boto3 snippet (with a `#` comment) and a ClickHouse SQL query. This is a presentational choice for side-by-side comparison, not a technical error, so it was left unchanged.
- The Lambda example writes `timestamp` (DynamoDB `N` type, arriving as a string) into a ClickHouse `DateTime` column. ClickHouse accepts numeric strings as Unix timestamps for `DateTime`, so this works, but readers may want to cast explicitly in production code for clarity.
