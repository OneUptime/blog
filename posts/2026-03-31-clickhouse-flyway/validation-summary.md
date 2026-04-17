# Validation Summary: How to Use Flyway with ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flyway (CLI and Maven plugin)
- ClickHouse (DDL: MergeTree engine, LowCardinality, skip indexes, ALTER TABLE)
- ClickHouse JDBC driver (com.clickhouse:clickhouse-jdbc)
- flyway-database-clickhouse plugin

## Sources Consulted
- [Redgate Flyway Command-line documentation](https://documentation.red-gate.com/flyway)
- [Redgate Flyway ClickHouse Database reference](https://documentation.red-gate.com/flyway/reference/database-driver-reference/clickhouse-database)
- [ClickHouse Java / JDBC Driver releases](https://github.com/ClickHouse/clickhouse-java/releases)
- [Maven Central: org.flywaydb:flyway-database-clickhouse](https://repo1.maven.org/maven2/org/flywaydb/flyway-database-clickhouse/)
- [ClickHouse documentation — MergeTree, LowCardinality, data-skipping indexes, ALTER](https://clickhouse.com/docs)
- Verified download URLs with `curl` (Flyway 10.22.0 tar.gz, versioned ClickHouse JDBC all-jar, plugin JAR on Maven Central).

## Issues Found

1. **Broken ClickHouse JDBC download URL.** The post used `https://github.com/ClickHouse/clickhouse-java/releases/latest/download/clickhouse-jdbc-all.jar`. The actual release assets are versioned (e.g., `clickhouse-jdbc-0.9.8-all.jar`), so the un-versioned `latest/download/...` redirect resolves to a 404. Replaced with the versioned URL `https://github.com/ClickHouse/clickhouse-java/releases/download/v0.9.8/clickhouse-jdbc-0.9.8-all.jar` (verified to return HTTP 200).

2. **Missing required `flyway-database-clickhouse` plugin.** Per the Redgate Flyway ClickHouse reference, ClickHouse support is NOT bundled with the Flyway CLI — the `org.flywaydb:flyway-database-clickhouse` plugin must be added to the classpath. The original post only mentioned the JDBC driver, which would cause Flyway to fail to recognize ClickHouse. Added a second `wget` step in "Adding the ClickHouse JDBC Driver and Flyway Plugin" to fetch the plugin JAR, and added the corresponding `<dependencies>` block inside the Maven plugin configuration.

3. **Flyway version incompatible with plugin.** The post used Flyway CLI 10.0.0, but `flyway-database-clickhouse` only exists on Maven Central starting at version 10.7.0 (earliest published plugin is 10.7.0; latest is 10.24.0). Bumped the CLI version to 10.22.0 throughout (download URL, `PATH`, and drivers directory path) so the CLI version and plugin version match. Verified both the 10.22.0 CLI tar.gz and the 10.22.0 plugin JAR return HTTP 200.

## Review Notes

- The ClickHouse SQL is correct: `MergeTree()` with `ORDER BY` and `PARTITION BY toYYYYMM(...)`, `LowCardinality(String)`, `ADD INDEX ... TYPE bloom_filter GRANULARITY 3`, and `ADD COLUMN IF NOT EXISTS` are all valid ClickHouse DDL.
- The JDBC URL `jdbc:clickhouse://localhost:8123/analytics` correctly uses port 8123, which is the ClickHouse HTTP interface used by the JDBC driver.
- Flyway CLI flag syntax (`-configFiles=...`) with a single dash is correct.
- Custom schema history table name `flyway.table=schema_history` is a valid override; default would be `flyway_schema_history`.
- ClickHouse does not support UPDATE/DELETE in the conventional sense, so Flyway's repair functionality is limited on ClickHouse — worth noting to readers in a future revision but not a factual error in the current post.
- ClickHouse JDBC uses LZ4 compression by default, which requires `lz4-java` on the classpath. Not mentioned here; users hitting a compression error would need to either add `lz4-java` or disable compression via JDBC properties. A future revision could mention this caveat.
