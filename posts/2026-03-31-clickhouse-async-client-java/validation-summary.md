# Validation Summary: How to Use ClickHouse Async Client in Java

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- Java
- `clickhouse-client` (Java client library) v0.6.0
- `clickhouse-http-client` v0.6.0
- `java.util.concurrent.CompletableFuture`

## Sources Consulted
- ClickHouse Java Client documentation: https://clickhouse.com/docs/en/integrations/java
- ClickHouse Java Client GitHub repo: https://github.com/ClickHouse/clickhouse-java
- Maven Central `com.clickhouse:clickhouse-client` 0.6.0 artifact
- Maven Central `com.clickhouse:clickhouse-http-client` 0.6.0 artifact
- Java SE `CompletableFuture` Javadoc (`allOf`, `thenAccept`, `exceptionally`, `orTimeout`)
- `ClickHouseNode`, `ClickHouseClient`, `ClickHouseProtocol`, `ClickHouseResponse`, `ClickHouseRecord`, `ClickHouseFormat`, `ClickHouseResponseSummary` public APIs

## Issues Found
No technical issues found.

- Maven dependency coordinates (`com.clickhouse:clickhouse-client:0.6.0` and `com.clickhouse:clickhouse-http-client:0.6.0`) are valid and published to Maven Central.
- `ClickHouseNode.of("http://localhost:8123/default")` is a valid factory method.
- `ClickHouseClient.newInstance(ClickHouseProtocol.HTTP)` is the correct factory for creating a client.
- `client.read(server).query(...).execute()` returns `CompletableFuture<ClickHouseResponse>` as documented.
- `response.records()` returns an iterable of `ClickHouseRecord`, and `record.getValue(index).asString()/asLong()` are correct value accessors.
- `response.firstRecord()` exists on `ClickHouseResponse`.
- `client.write(server).table(...).format(...).data(writer).execute()` returns `CompletableFuture<ClickHouseResponse>`.
- `ClickHouseResponseSummary#getWrittenRows()` exists and is the correct accessor for insert counts.
- `CompletableFuture#orTimeout` is a valid Java 9+ API; the example is correct.
- `client.close()` is valid; `ClickHouseClient` implements `AutoCloseable`.

## Review Notes
- The post targets `clickhouse-client` 0.6.0. A newer v2 Java client (`com.clickhouse:client-v2`) has since been released with a different API surface (blocking plus reactive builders). The examples here remain accurate for the 0.6.x/legacy client branch, but readers on newer major versions should consult the v2 docs.
- The stated thread-safety and "share one client instance" guidance matches the official recommendation.
- The async insert example uses a lambda placeholder (`// write rows to stream`). In practice the `data(...)` writer receives an `OutputStream` which must be fed bytes encoded in the specified `ClickHouseFormat` — readers should be aware this requires additional serialization code.
- `response.close()` inside `thenAccept` is correct; callers must close responses to release the underlying HTTP connection.
