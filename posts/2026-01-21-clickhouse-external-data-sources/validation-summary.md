# Validation Summary: How to Query External Data Sources from ClickHouse

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- ClickHouse
- PostgreSQL table function and table engine
- MySQL table function and table engine
- S3 table function and table engine
- HDFS table function and table engine
- Remote ClickHouse table functions
- Distributed table engine
- URL table function
- MongoDB table engine
- SQLite table engine
- ClickHouse dictionaries and named collections

## Sources Consulted
- ClickHouse PostgreSQL table engine: https://clickhouse.com/docs/engines/table-engines/integrations/postgresql
- ClickHouse postgresql table function: https://clickhouse.com/docs/sql-reference/table-functions/postgresql
- ClickHouse MySQL table engine: https://clickhouse.com/docs/engines/table-engines/integrations/mysql
- ClickHouse mysql table function: https://clickhouse.com/docs/sql-reference/table-functions/mysql
- ClickHouse S3 table engine: https://clickhouse.com/docs/engines/table-engines/integrations/s3
- ClickHouse s3 table function: https://clickhouse.com/docs/sql-reference/table-functions/s3
- ClickHouse HDFS table engine: https://clickhouse.com/docs/engines/table-engines/integrations/hdfs
- ClickHouse hdfs table function: https://clickhouse.com/docs/sql-reference/table-functions/hdfs
- ClickHouse remote table function: https://clickhouse.com/docs/sql-reference/table-functions/remote
- ClickHouse cluster table function: https://clickhouse.com/docs/sql-reference/table-functions/cluster
- ClickHouse MongoDB table engine: https://clickhouse.com/docs/engines/table-engines/integrations/mongodb
- ClickHouse SQLite table engine: https://clickhouse.com/docs/engines/table-engines/integrations/sqlite
- ClickHouse CREATE DICTIONARY and PostgreSQL dictionary source: https://clickhouse.com/docs/sql-reference/statements/create/dictionary and https://clickhouse.com/docs/sql-reference/statements/create/dictionary/sources/postgresql
- ClickHouse named collections: https://clickhouse.com/docs/operations/named-collections
- ClickHouse session settings: https://clickhouse.com/docs/operations/settings/settings

## Issues Found
- The introductory PostgreSQL table engine example omitted the ClickHouse column list required by the documented `CREATE TABLE ... ENGINE = PostgreSQL(...)` syntax. Added a minimal column list.
- The PostgreSQL schema example omitted the required column list for the table engine. Added representative order columns.
- The MySQL connection pool example omitted the required column list for the table engine. Added representative order columns.
- The S3 table engine example used a directory-like URL for Parquet data. Changed it to a wildcard URL so it maps to Parquet files.
- The HDFS table function examples supplied only URI and format, but the documented `hdfs` table function syntax requires a structure argument. Added explicit structures to the Parquet and ORC examples.
- The SQLite table engine example omitted the required ClickHouse column list. Added a minimal column list.
- The connection pooling best-practice example used `PostgreSQL(...)` with MySQL-style table engine settings and an invalid ellipsis placeholder. Changed the example to a concrete MySQL table engine definition, matching the documented settings.
- The error-handling example used `external_storage_connect_timeout_sec` and `external_storage_max_read_rows` with the PostgreSQL table function. These settings are documented for MySQL external storage, and `external_storage_max_read_rows` is specifically for MySQL external engines, databases, and dictionaries. The example now uses the `mysql` table function with MySQL timeout settings.

## Review Notes
Some integrations have environment-specific caveats. HDFS and SQLite table engines are not supported in ClickHouse Cloud, and the Distributed engine syntax is also not available in ClickHouse Cloud. MongoDB table engine support is read-only and supports MongoDB 3.6+; `mongodb+srv` seed-list URLs are not supported according to the current docs.
