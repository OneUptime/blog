# Validation Summary: How to Use ClickHouse Java Client

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- ClickHouse (database)
- clickhouse-java client library (com.clickhouse:clickhouse-http-client 0.6.5)
- clickhouse-jdbc driver (com.clickhouse:clickhouse-jdbc 0.6.5)
- Java (JDBC API)
- HikariCP connection pool
- Spring Boot / Spring JDBC (JdbcTemplate)
- Maven and Gradle build tooling

## Sources Consulted
- ClickHouse Java client GitHub repo: https://github.com/ClickHouse/clickhouse-java
- `BinaryStreamUtils` source: https://github.com/ClickHouse/clickhouse-java/blob/main/clickhouse-data/src/main/java/com/clickhouse/data/format/BinaryStreamUtils.java
- `ClickHouseClient` / `ClickHouseRequest` source (read/write/Mutation methods)
- `ClickHouseException` source (getErrorCode method, line 214)
- ClickHouse JDBC docs: https://clickhouse.com/docs/integrations/java/jdbc
- Maven Central artifact listing: https://central.sonatype.com/artifact/com.clickhouse/clickhouse-http-client (0.6.0–0.6.5 confirmed)

## Issues Found
1. **Insert Rows section — wrong client method**: Used `client.read(server)` to issue an `INSERT INTO ... VALUES`. INSERTs must go through the write/Mutation path. Changed to `client.write(server)`.
2. **Streaming Insert — wrong client method chain**: Used `client.read(server).write()`. Replaced with the idiomatic `client.write(server)` directly.
3. **Streaming Insert — incorrect `BinaryStreamUtils.writeDateTime64` signature**: The post called `writeDateTime64(stream, System.currentTimeMillis(), 3)`, but no such overload exists. The actual overloads accept a `LocalDateTime` and a `TimeZone` (`writeDateTime64(OutputStream, LocalDateTime, int scale, TimeZone)`). Updated the call to pass `LocalDateTime.now()` and `TimeZone.getTimeZone("UTC")`.
4. **Streaming Insert — wrong format for header-less data**: The example used `ClickHouseFormat.RowBinaryWithNamesAndTypes` but did not write the required column-names/types header before the row data, which would cause the server to misparse the stream. Switched to `ClickHouseFormat.RowBinary`, which matches the body the example actually writes.
5. **Streaming Insert — minor cleanup tied to the fixes above**: Removed the unused `ClickHouseConfig config = new ClickHouseConfig();` declaration and the unused `java.io.OutputStream` and `java.util.UUID` imports (which were only present for the now-corrected code path), and added the imports the corrected code requires (`java.time.LocalDateTime`, `java.util.TimeZone`).

## Review Notes
- The version pin `0.6.5` is a real, published release on Maven Central. Newer 0.6.x releases exist but the post is internally consistent with `0.6.5`.
- Both `jdbc:ch://` and `jdbc:clickhouse://` URL schemes are accepted by the driver; the post correctly notes the v2 preference for `jdbc:ch://`.
- `com.clickhouse.jdbc.ClickHouseDriver` is correct (it serves as the V1/V2 driver facade).
- The "Common Pitfalls" claim that `setAutoCommit(false)` "has no effect" is approximately right for the V2 driver but slightly oversimplified for V1, where transactions are listed as "partially supported". Left as-is since the spirit (do not rely on JDBC transactions with ClickHouse) is correct.
- ClickHouse has had experimental transaction support since 22.7, but it is opt-in and not exposed through the standard JDBC autocommit semantics, so the post's guidance remains practically correct.
- The unused `import com.clickhouse.data.value.ClickHouseStringValue;` in the Insert Rows section is a stylistic nit (no functional bug); left as-is to limit changes to technical errors.
