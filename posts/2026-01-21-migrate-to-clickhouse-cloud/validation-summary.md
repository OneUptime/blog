# Validation Summary: How to Migrate from Self-Hosted ClickHouse to ClickHouse Cloud

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- ClickHouse
- ClickHouse Cloud
- ClickHouse SQL
- ClickHouse table functions: remoteSecure and s3
- ClickHouse BACKUP/RESTORE
- ClickPipes for Kafka ingestion
- ClickHouse dictionaries
- Python clickhouse-connect
- Amazon S3

## Sources Consulted
- ClickHouse Cloud migration guide for self-managed ClickHouse to Cloud using BACKUP/RESTORE: https://clickhouse.com/docs/cloud/migration/oss-to-cloud-backup-restore
- ClickHouse remote and remoteSecure table function documentation: https://clickhouse.com/docs/sql-reference/table-functions/remote
- ClickHouse s3 table function documentation: https://clickhouse.com/docs/sql-reference/table-functions/s3
- ClickHouse CREATE TABLE documentation: https://clickhouse.com/docs/sql-reference/statements/create/table
- ClickHouse Cloud compatibility documentation: https://clickhouse.com/docs/whats-new/cloud-compatibility
- ClickHouse Kafka integration and ClickPipes documentation: https://clickhouse.com/docs/integrations/kafka
- ClickHouse CREATE DICTIONARY documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary
- ClickHouse dictionary ClickHouse source documentation: https://clickhouse.com/docs/sql-reference/statements/create/dictionary/sources/clickhouse
- ClickHouse Connect Python documentation: https://clickhouse.com/docs/integrations/python

## Issues Found
- The remote table copy example used `remote()` against port `9440`, which is the secure native port. Changed the example to use `remoteSecure()` consistently.
- The `CREATE TABLE ... AS remoteSecure(...) ENGINE = MergeTree()` example did not match ClickHouse's documented `CREATE TABLE ... AS table_function()` form. Changed it to `CREATE TABLE ... ENGINE = MergeTree() ... AS SELECT * FROM remoteSecure(...) LIMIT 0`.
- The S3 export examples wrote to directory-style URLs. Changed them to write and read explicit Parquet object paths.
- The compatibility notes described Kafka/RabbitMQ engines as unsupported and UDFs as custom features to verify. Updated this to reflect current ClickHouse Cloud compatibility: Kafka/RabbitMQ engines are supported, ClickPipes is recommended for managed ingestion, and UDFs are public beta.
- The backup method used the third-party `clickhouse-backup` tool and said Cloud restore required the support team. Replaced it with ClickHouse's documented native `BACKUP`/`RESTORE` to and from S3.
- The dictionary example used incomplete `SOURCE(CLICKHOUSE(TABLE 'products'))` syntax. Updated it to include the required ClickHouse source parameters shown in the dictionary source documentation.

## Review Notes
The schema export query is only a simplified example and may omit advanced column metadata such as defaults, aliases, comments, codecs, TTLs, indexes, or projections. The post already recommends `SHOW CREATE TABLE`, which is the safer option for real migrations.
