# Validation Summary: How to Use jdbc() Table Function in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse JDBC Bridge (clickhouse-jdbc-bridge)
- PostgreSQL (as example external source)
- JDBC drivers
- SQL

## Sources Consulted
- [ClickHouse `jdbc()` table function docs](https://clickhouse.com/docs/en/sql-reference/table-functions/jdbc)
- [ClickHouse JDBC Bridge GitHub repository](https://github.com/ClickHouse/clickhouse-jdbc-bridge)
- [ClickHouse JDBC Bridge README](https://github.com/ClickHouse/clickhouse-jdbc-bridge/blob/master/README.md)
- [ClickHouse JDBC Bridge releases (latest: v2.1.0)](https://github.com/ClickHouse/clickhouse-jdbc-bridge/releases)
- [Connecting ClickHouse to external data sources with JDBC](https://clickhouse.com/docs/integrations/jdbc/jdbc-with-clickhouse)

## Issues Found
1. **Wrong download URL.** The post used `https://github.com/.../releases/latest/download/clickhouse-jdbc-bridge.jar`, but no asset with that name exists on the latest release (v2.1.0). The actual asset is `clickhouse-jdbc-bridge-2.1.0-shaded.jar`. Fixed by replacing the URL with the versioned shaded-jar URL and updating the `java -jar` filename to match.
2. **Invalid `--listen-host` flag.** v2.x of the bridge no longer accepts CLI flags such as `--listen-host` (those existed only in v1.x). v2.x is configured through JSON files under `config/`. Removed the flag from the start command.
3. **Wrong special query name.** The post referenced `jdbc('', '__sources')` for listing data sources, but the bridge's actual special query is `show datasources` (`select * from jdbc('', 'show datasources')` per the bridge README). Fixed both the SQL example and the surrounding prose.
4. **Datasource configuration location.** The post said the data source is configured in "the bridge's `datasources.json`", implying a single combined file. The bridge actually loads named data sources from individual JSON files under `config/datasources/`. Updated the wording to reflect this; the JSON body itself is correct (driver URL, driver class name, JDBC URL, username, password are all valid `NamedDataSource` fields).

## Review Notes
- The ClickHouse JDBC Bridge repository was archived on 2025-10-10 and is officially "no longer supported"; ClickHouse documentation flags it as containing experimental code with potential reliability and security issues. The post already advises preferring the JDBC table engine or scheduled ingestion for production, which is in line with this guidance, but readers should be aware the bridge itself is unmaintained.
- The "Basic Syntax" section lists three forms (`(datasource, query)`, `(datasource, database, table)`, `(datasource, schema, table)`). Per the official ClickHouse `jdbc()` docs, the canonical forms are `(datasource, external_database, external_table)`, `(datasource, external_table)`, and `(named_collection)`. The post's "schema" form is effectively the same as the "database" form; it is not strictly wrong (the bridge resolves the second positional arg as a database/schema), but the listing is slightly redundant. Left as-is to preserve author intent.
- The PostgreSQL JDBC driver `postgresql-42.7.1.jar` referenced in the datasource config is a real published version and is appropriate for the example.
