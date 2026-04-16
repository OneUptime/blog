# Validation Summary: How to Use the ClickHouse gRPC Interface

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- ClickHouse (gRPC interface)
- gRPC / Protobuf
- Python (`grpcio`, `grpcio-tools`)
- Go (`google.golang.org/grpc`)
- XML server configuration
- TLS / SSL

## Sources Consulted
- ClickHouse gRPC interface docs: https://clickhouse.com/docs/en/interfaces/grpc
- Official ClickHouse proto file: https://raw.githubusercontent.com/ClickHouse/ClickHouse/master/src/Server/grpc_protos/clickhouse_grpc.proto

## Issues Found

1. **Incorrect port configuration placement.** The original XML placed `<port>9100</port>` inside the `<grpc>` section. In ClickHouse the gRPC port is actually configured at the top level via `<grpc_port>9100</grpc_port>`; the `<grpc>` section contains only the detailed gRPC-specific options. Fixed in both the "Enable the gRPC Interface" and "Enable TLS" config snippets.

2. **Invalid `<receive_timeout_ms>` and `<send_timeout_ms>` elements.** These are not documented sub-elements of `<grpc>` in ClickHouse. The supported timing/size controls are `max_receive_message_size` and `max_send_message_size`. Removed the two invalid elements and added the documented `<compression_level>` field to keep the example realistic.

3. **`pb2.ClickHouseSetting` does not exist.** In `clickhouse_grpc.proto`, the `settings` field on `QueryInfo` is defined as `map<string, string> settings = 3;` — there is no `ClickHouseSetting` message. Changed the Python example from `settings=[pb2.ClickHouseSetting(name="max_threads", value="4")]` to `settings={"max_threads": "4"}`, which is how `grpcio` exposes a proto map field.

## Review Notes
- The default gRPC port (9100), the service name (`ClickHouse`), and the RPC method names (`ExecuteQuery`, `ExecuteQueryWithStreamOutput`) all match the current proto definition.
- `QueryInfo` fields used in the examples (`query`, `database`, `user_name`, `password`, `output_format`, `settings`) all exist in the proto.
- `Result.output` is `bytes`, so `response.output.decode()` is correct; `Result.stats.rows` is a `uint64`, so `response.stats.rows` is valid.
- The Go example uses `grpc.Dial`, which is marked deprecated in newer `google.golang.org/grpc` releases in favor of `grpc.NewClient`. The deprecated call still works, so this was left as-is; readers targeting the latest gRPC-Go may prefer `grpc.NewClient`.
- The `process(line)` call in the streaming example is a placeholder — intentionally left unchanged.
