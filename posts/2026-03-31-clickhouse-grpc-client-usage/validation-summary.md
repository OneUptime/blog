# Validation Summary: How to Use ClickHouse gRPC Interface

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (gRPC interface)
- gRPC / HTTP/2
- Protocol Buffers
- Python (grpcio, grpcio-tools)
- TLS / SSL channel credentials
- ClickHouse `config.xml`

## Sources Consulted
- ClickHouse gRPC proto definition: https://github.com/ClickHouse/ClickHouse/blob/master/src/Server/grpc_protos/clickhouse_grpc.proto
- ClickHouse default server config: https://github.com/ClickHouse/ClickHouse/blob/master/programs/server/config.xml
- ClickHouse docs on gRPC interface: https://clickhouse.com/docs/en/interfaces/grpc
- ClickHouse `system.server_settings` table documentation
- grpcio / grpcio-tools Python API documentation

## Issues Found

1. **Incorrect proto file path.** The post claimed the proto file ships at `/usr/share/clickhouse/grpc_protos/clickhouse_grpc.proto` on installed systems. The Debian/RPM packages do not install the `.proto` file; it exists only in the ClickHouse source tree. Replaced the "ships at" claim with a `curl` command that downloads the proto from the ClickHouse GitHub repo, and updated the `protoc -I` flag to use the current directory (`.`) instead of the nonexistent system path.

2. **Nonexistent system table.** The verification command referenced `system.server_ports`, which does not exist in ClickHouse. Replaced with a query against `system.server_settings` filtering on `name = 'grpc_port'`, which is the correct table exposing runtime server-level settings including the gRPC port.

## Review Notes
- The gRPC service name (`ClickHouse`, stub `ClickHouseStub`), package (`clickhouse.grpc`), and all four RPC methods (`ExecuteQuery`, `ExecuteQueryWithStreamInput`, `ExecuteQueryWithStreamOutput`, `ExecuteQueryWithStreamIO`) match the official proto.
- All `QueryInfo` fields used in the examples (`query`, `output_format`, `user_name`, `password`, `input_data`, `input_data_delimiter`) and `Result` fields (`output`, `exception.code`, `exception.display_text`) are correct.
- The `<grpc_port>9100</grpc_port>` config element and default port of 9100 match the shipped `programs/server/config.xml` (where it is present but commented out by default).
- The `grpc.insecure_channel` / `grpc.secure_channel` / `grpc.ssl_channel_credentials` usage is idiomatic for the grpcio Python client.
- Minor future improvement: the post could mention that the `<grpc>` config block also supports options such as `enable_ssl`, `ssl_cert_file`, `ssl_key_file`, and `compression`, which pair with the TLS section.
