# How to Use ClickHouse gRPC Interface

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, gRPC, Protocol Buffer, Client, Query

Description: Learn how to enable and use the ClickHouse gRPC interface to execute queries and insert data using generated protobuf clients in Python or Go.

---

ClickHouse includes a gRPC interface that exposes query execution and data insertion via Protocol Buffers over HTTP/2. It is useful when you need streaming, multiplexing, or strong type safety through generated client code.

## Enabling gRPC

In `config.xml` or a config drop-in file, set the gRPC port:

```xml
<grpc_port>9100</grpc_port>
```

Restart ClickHouse after the change. Verify it is listening:

```bash
clickhouse-client --query "SELECT name, value FROM system.server_settings WHERE name = 'grpc_port'"
```

## Protobuf Schema

The proto file is maintained in the ClickHouse source tree and can be downloaded from GitHub:

```bash
curl -O https://raw.githubusercontent.com/ClickHouse/ClickHouse/master/src/Server/grpc_protos/clickhouse_grpc.proto
```

Key types:
- `QueryInfo` - sent by the client (contains SQL, settings, input data)
- `Result` - returned by the server (output, stats, exceptions)

## Generating Python Client

```bash
pip install grpcio grpcio-tools
python -m grpc_tools.protoc \
  -I . \
  --python_out=. \
  --grpc_python_out=. \
  clickhouse_grpc.proto
```

## Running a Query with Python

```python
import grpc
import clickhouse_grpc_pb2 as pb
import clickhouse_grpc_pb2_grpc as grpc_stub

channel = grpc.insecure_channel('localhost:9100')
stub = grpc_stub.ClickHouseStub(channel)

request = pb.QueryInfo(
    query='SELECT number, number * number AS sq FROM numbers(5)',
    output_format='TabSeparated',
    user_name='default',
    password=''
)

for result in stub.ExecuteQueryWithStreamOutput(request):
    if result.output:
        print(result.output.decode())
    if result.exception.code:
        raise Exception(result.exception.display_text)
```

## Inserting Data via gRPC

```python
insert_request = pb.QueryInfo(
    query='INSERT INTO events FORMAT TabSeparated',
    input_data=b'1\t2024-01-01\tpageview\n2\t2024-01-02\tclick\n',
    input_data_delimiter=b'',
    user_name='default',
    password=''
)

result = stub.ExecuteQuery(insert_request)
if result.exception.code:
    raise Exception(result.exception.display_text)
```

## TLS Support

For secure connections, use `grpc.secure_channel`:

```python
creds = grpc.ssl_channel_credentials(
    root_certificates=open('ca.pem', 'rb').read()
)
channel = grpc.secure_channel('clickhouse-host:9100', creds)
```

## When to Use gRPC vs HTTP

```text
gRPC             HTTP
-----------      -----------
HTTP/2 streaming Firewall-friendly (80/443)
Strong typing    Universal language support
Multiplexing     Easier debugging (cURL)
```

## Summary

The ClickHouse gRPC interface provides HTTP/2-based access with Protocol Buffer typing and bidirectional streaming. Generate client stubs from the shipped proto file, then use `ExecuteQueryWithStreamOutput` for SELECT queries and `ExecuteQuery` for inserts and DDL. Use gRPC when your architecture already uses it or when you need streaming multiplexing.
