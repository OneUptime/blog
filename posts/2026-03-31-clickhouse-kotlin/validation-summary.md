# Validation Summary: How to Use ClickHouse with Kotlin

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (database)
- ClickHouse JDBC driver (com.clickhouse:clickhouse-jdbc 0.6.0)
- Kotlin
- HikariCP 5.1.0 (connection pooling)
- kotlinx.coroutines 1.8.1 (Dispatchers.IO)
- Ktor (HTTP routing)
- JDBC PreparedStatement / batch API

## Sources Consulted
- ClickHouse Java integration docs: https://clickhouse.com/docs/en/integrations/java
- ClickHouse JDBC driver repo: https://github.com/ClickHouse/clickhouse-java
- HikariCP docs: https://github.com/brettwooldridge/HikariCP
- kotlinx.coroutines docs: https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-core/kotlinx.coroutines/-dispatchers/-i-o.html
- Ktor routing docs: https://ktor.io/docs/server-routing.html

## Issues Found
No technical issues found.

- `com.clickhouse:clickhouse-jdbc:0.6.0` is a valid published version.
- `com.clickhouse.jdbc.ClickHouseDriver` is the correct driver class for the v2 driver line.
- `jdbc:ch://` is a supported short alias for `jdbc:clickhouse://` in current ClickHouse JDBC versions, on the default HTTP port 8123.
- HikariCP 5.1.0 and kotlinx-coroutines-core 1.8.1 are real, compatible versions (JDK 11+ / Kotlin 1.9+).
- Wrapping blocking JDBC calls in `withContext(Dispatchers.IO)` is the canonical Kotlin coroutines pattern.
- The `INTERVAL ? DAY` parameter pattern works with ClickHouse JDBC because the driver substitutes the parameter as a literal client-side before sending the query.
- The Ktor `routing { get("/api/events") { ... } }` block is valid for a server `Application` module.
- `data class` definition, `buildList`, `chunked`, `addBatch`/`executeBatch`/`clearBatch` usage, and `use` resource handling are all idiomatic and correct.

## Review Notes
- For the `clickhouse-jdbc` artifact, the project also publishes shaded variants (e.g., `clickhouse-jdbc:0.6.0:all` or `:http`) that bundle the HTTP transport and its dependencies. The plain artifact relies on transitive resolution of `clickhouse-http-client`; readers who hit "no suitable driver" or missing-class errors at runtime may want to switch to the `:all` classifier. Not strictly an error in the post, just a common gotcha worth being aware of.
- Newer ClickHouse JDBC releases (0.7.x+) ship a redesigned v2 driver under `com.clickhouse.jdbc.ClickHouseDriver` with some behavior changes (auto-discovery, settings handling). The post's code remains correct for 0.6.0 but may need minor revisits if the reader upgrades.
- Insert performance against ClickHouse is generally better via the native binary protocol or `INSERT ... SELECT` from a `RowBinary`/`JSONEachRow` stream than via JDBC `addBatch` for very large workloads. The shown approach is fine for moderate batch sizes (5,000) but is not the highest-throughput option.
