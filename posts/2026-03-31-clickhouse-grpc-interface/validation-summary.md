# Validation Summary: How to Configure ClickHouse gRPC Interface

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (gRPC interface)
- gRPC / Protocol Buffers
- TLS / mTLS (client certificate auth)
- grpcurl
- Python gRPC client (`grpc`, generated stubs)
- XML server configuration

## Sources Consulted
- ClickHouse gRPC interface docs: https://clickhouse.com/docs/en/interfaces/grpc
- ClickHouse default `config.xml`: https://github.com/ClickHouse/ClickHouse/blob/master/programs/server/config.xml
- ClickHouse gRPC proto definition: https://github.com/ClickHouse/ClickHouse/blob/master/src/Server/grpc_protos/clickhouse_grpc.proto
- `system.processes` docs: https://clickhouse.com/docs/en/operations/system-tables/processes

## Issues Found
1. **Wrong compression algorithm name.** The post listed `stream_zlib` as a valid compression value, both in an XML comment and in the compression table. ClickHouse supports `none`, `deflate`, `gzip`, and `stream_gzip` — not `stream_zlib`. Fixed in both locations.
2. **Wrong config field name for compression.** The post used `<compression>deflate</compression>` inside the `<grpc>` block. The actual field in ClickHouse's config is `<transport_compression_type>` (paired with an optional `<transport_compression_level>`). Replaced with the correct field names and added the level field.
3. **Incorrect RPC method signatures in the proto snippet.**
   - `ExecuteQuery` returns `Result`, not `stream Result`. Fixed.
   - `ExecuteQueryWithStreamInput` returns `Result`, not `stream Result`. Fixed.
   - `ExecuteBatchQuery` is not a real method in the ClickHouse proto; the bidirectional streaming RPC is actually `ExecuteQueryWithStreamIO`. Renamed.
4. **Python example iterated over a non-streaming RPC.** The original `for result in stub.ExecuteQuery(request):` would not work because `ExecuteQuery` returns a single `Result`, not an iterator/stream. Replaced with a single-result assignment and `print`.

## Review Notes
- The `verbose_logs` comment originally said "Log grpc queries to system.query_log" which is misleading — `verbose_logs` enables detailed server-side logging, not query_log routing. Tightened the comment wording.
- The `compression` column in the table heading still says "Algorithm" correctly; the row for `stream_gzip` is noted as "Streaming gzip" now that the name is correct.
- The grpcurl example and service name `clickhouse.grpc.ClickHouse/ExecuteQuery` are correct — the package in the proto is `clickhouse.grpc` and the service is `ClickHouse`.
- The `system.processes` query with `WHERE interface = 'GRPC'` is valid because `interface` is an `Enum8` that compares to its string labels (`'TCP'`, `'HTTP'`, `'GRPC'`, etc.).
- If readers are on very old ClickHouse versions (pre-gRPC, i.e. before ~20.12), the interface may not be available. Not called out in the post but unlikely to matter today.
