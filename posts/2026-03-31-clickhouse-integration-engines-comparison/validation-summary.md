# Validation Summary: ClickHouse Integration Engines Feature Comparison

## Status
validated

## Post Type
Reference / Comparison guide

## Technologies Covered
- ClickHouse integration table engines
- Kafka engine (streaming ingestion)
- S3 engine (object storage)
- MySQL engine
- PostgreSQL engine
- MongoDB engine
- JDBC engine
- Redis engine
- HDFS engine
- URL engine
- Materialized views (MergeTree target)

## Sources Consulted
- ClickHouse Kafka engine docs: https://clickhouse.com/docs/en/engines/table-engines/integrations/kafka
- ClickHouse S3 engine docs: https://clickhouse.com/docs/en/engines/table-engines/integrations/s3
- ClickHouse MySQL engine docs: https://clickhouse.com/docs/en/engines/table-engines/integrations/mysql
- ClickHouse PostgreSQL engine docs: https://clickhouse.com/docs/en/engines/table-engines/integrations/postgresql
- ClickHouse MongoDB engine docs: https://clickhouse.com/docs/en/engines/table-engines/integrations/mongodb
- ClickHouse JDBC engine docs: https://clickhouse.com/docs/en/engines/table-engines/integrations/jdbc
- ClickHouse Redis engine docs: https://clickhouse.com/docs/en/engines/table-engines/integrations/redis

## Issues Found
- **JDBC engine write support**: The overview table claimed JDBC was Read=Yes / Write=No. Per the official JDBC engine docs, INSERT is supported (the docs explicitly include an `INSERT INTO jdbc_table ... SELECT ...` example). Updated the row to Write=Yes.
- **MongoDB engine write support**: The overview table claimed MongoDB was Read=Yes / Write=Yes. Per the official MongoDB engine docs, "MongoDB engine is read-only table engine which allows to read data from a remote MongoDB collection." Updated to Write=No and changed the notes column to "Read-only MongoDB collections".

## Review Notes
- The S3 engine supports writes but with the limitation that rows can only be inserted into new files (no merge cycles); subsequent inserts to the same file fail unless `s3_truncate_on_insert` or `s3_create_new_file_on_insert` is set. This nuance is not surfaced in the overview table but is acceptable for an introductory comparison.
- Kafka CREATE TABLE syntax with the four required SETTINGS (`kafka_broker_list`, `kafka_topic_list`, `kafka_group_name`, `kafka_format`) is correct.
- MySQL and PostgreSQL engine parameter order (`host:port, database, table, user, password`) is correct.
- The S3 table function call with credentials in the order `(url, access_key, secret_key, format)` is correct.
- The MongoDB `CREATE TABLE` example uses the standard parameter order (`host:port, database, collection, user, password`) which matches the docs; only the read/write claim was wrong.
- Redis engine note ("Read/write Redis keys") is accurate — INSERT, SELECT, UPDATE (non-PK), DELETE, and TRUNCATE are all supported.
- The materialized view pattern `CREATE MATERIALIZED VIEW ... TO target AS SELECT * FROM kafka_table` is the canonical ClickHouse pattern for moving Kafka data into MergeTree.
