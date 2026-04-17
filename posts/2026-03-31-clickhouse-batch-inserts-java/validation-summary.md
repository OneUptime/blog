# Validation Summary: How to Handle Batch Inserts in ClickHouse from Java

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (HTTP interface, async inserts, RowBinary format)
- Java (JDBC, java.sql.PreparedStatement)
- ClickHouse JDBC driver (`jdbc:ch://` URL scheme)
- ClickHouse Java client library (`com.clickhouse.client`, `com.clickhouse.data`)

## Sources Consulted
- ClickHouse Java client source on GitHub: https://github.com/ClickHouse/clickhouse-java
  - `clickhouse-data/src/main/java/com/clickhouse/data/ClickHouseOutputStream.java`
  - `clickhouse-data/src/main/java/com/clickhouse/data/format/BinaryStreamUtils.java`
  - `clickhouse-client/src/main/java/com/clickhouse/client/ClickHouseResponseSummary.java`
  - `clickhouse-jdbc/src/main/java/com/clickhouse/jdbc/internal/ClickHouseJdbcUrlParser.java`
- ClickHouse async insert documentation: https://clickhouse.com/docs/en/optimize/asynchronous-inserts
- JDBC `PreparedStatement` batch API (Java SE): https://docs.oracle.com/en/java/javase/17/docs/api/java.sql/java/sql/PreparedStatement.html

## Issues Found
- **`out.writeLong(e.getUserId())` in the native-client RowBinary example**: `ClickHouseOutputStream` does not expose a `writeLong(long)` method — the available helpers are `writeVarInt`, `writeUnsignedVarInt`, `writeAsciiString`, `writeUnicodeString`, `writeByte`, `writeBytes`, etc. The canonical way to emit a fixed 8-byte little-endian Int64 in RowBinary is `BinaryStreamUtils.writeInt64(OutputStream, long)` from `com.clickhouse.data.format.BinaryStreamUtils`. Replaced `out.writeLong(e.getUserId())` with `BinaryStreamUtils.writeInt64(out, e.getUserId())`. The existing `com.clickhouse.data.*` import already covers `BinaryStreamUtils`.

## Review Notes
- `out.writeAsciiString(e.getName())` is a real method on `ClickHouseOutputStream` and is retained as-is. If event names can ever contain non-ASCII characters, `BinaryStreamUtils.writeString(out, e.getName())` (UTF-8) or `out.writeUnicodeString(e.getName())` would be safer — noted for the author, not changed because the existing call compiles and matches the post's stated intent.
- `jdbc:ch://` is a valid short-form prefix accepted by the ClickHouse JDBC driver (alongside `jdbc:clickhouse://`), confirmed in `ClickHouseJdbcUrlParser`.
- `async_insert=1&wait_for_async_insert=0` are current, documented ClickHouse server settings; the described fire-and-forget semantics are accurate.
- `ClickHouseResponseSummary.getWrittenRows()` exists and returns a `long`.
- The `client.write(server).table(...).format(...).data(writer).executeAndWait()` fluent shape matches the v1 `ClickHouseClient` / `Mutation` API. Note that `ClickHouseWriter` (the functional interface consumed by `.data(...)`) is marked `@Deprecated` in current master as the project transitions to client-v2 (`com.clickhouse.client.api.Client`), so this example may need revisiting when the author upgrades.
- JDBC batch recommendations (5,000 row flush for sync pipelines, smaller batches for async) align with common ClickHouse guidance that favors fewer, larger parts to reduce merge pressure.
