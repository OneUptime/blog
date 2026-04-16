# How to Use the ClickHouse gRPC Interface

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, gRPC, API, Protobuf, Streaming, Python, Go

Description: Query ClickHouse using its gRPC interface to stream results, send compressed requests, and integrate with gRPC-native microservices.

---

ClickHouse ships with a built-in gRPC server (port 9100 by default) that exposes a Protobuf-based API for executing queries and receiving results as streams. This is useful for microservices already using gRPC for inter-service communication or when you want efficient binary serialization without the overhead of the HTTP/1.1 interface.

## Enable the gRPC Interface

In `/etc/clickhouse-server/config.xml` or a custom override file:

```xml
<grpc_port>9100</grpc_port>
<grpc>
    <enable_ssl>false</enable_ssl>
    <max_receive_message_size>-1</max_receive_message_size>
    <max_send_message_size>-1</max_send_message_size>
    <compression>deflate</compression>
    <compression_level>medium</compression_level>
</grpc>
```

Restart ClickHouse and verify the port is listening:

```bash
ss -tlnp | grep 9100
```

## Generate Python Client Stubs

ClickHouse ships its `.proto` file in the source tree. Download it and generate stubs:

```bash
# Download the proto file
curl -O https://raw.githubusercontent.com/ClickHouse/ClickHouse/master/src/Server/grpc_protos/clickhouse_grpc.proto

# Generate Python stubs
pip install grpcio grpcio-tools
python -m grpc_tools.protoc \
    -I. \
    --python_out=. \
    --grpc_python_out=. \
    clickhouse_grpc.proto
```

## Execute a Query via Python gRPC Client

```python
import grpc
import clickhouse_grpc_pb2 as pb2
import clickhouse_grpc_pb2_grpc as pb2_grpc

channel = grpc.insecure_channel('clickhouse.example.com:9100')
stub = pb2_grpc.ClickHouseStub(channel)

request = pb2.QueryInfo(
    query="SELECT number, number * number AS square FROM numbers(10)",
    database="default",
    user_name="default",
    password="",
    output_format="TabSeparated",
    settings={"max_threads": "4"},
)

response = stub.ExecuteQuery(request)
print("Result:", response.output.decode())
print("Rows:", response.stats.rows if response.stats else "N/A")
```

## Stream Large Results

```python
def stream_results(stub, query):
    request = pb2.QueryInfo(
        query=query,
        database="default",
        user_name="default",
        output_format="JSONEachRow",
    )
    for response in stub.ExecuteQueryWithStreamOutput(request):
        if response.output:
            yield response.output.decode()

for chunk in stream_results(stub, "SELECT * FROM events LIMIT 1000000"):
    # Process each chunk as newline-delimited JSON
    for line in chunk.strip().splitlines():
        process(line)
```

## Go Client with gRPC

```go
package main

import (
    "context"
    "fmt"
    "log"

    pb "github.com/yourorg/clickhouse-grpc-client/proto"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
)

func main() {
    conn, err := grpc.Dial("clickhouse.example.com:9100",
        grpc.WithTransportCredentials(insecure.NewCredentials()))
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    client := pb.NewClickHouseClient(conn)

    resp, err := client.ExecuteQuery(context.Background(), &pb.QueryInfo{
        Query:        "SELECT count() FROM events",
        Database:     "default",
        UserName:     "default",
        OutputFormat: "TabSeparated",
    })
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Result: %s\n", resp.Output)
}
```

## Enable TLS for the gRPC Interface

```xml
<grpc_port>9100</grpc_port>
<grpc>
    <enable_ssl>true</enable_ssl>
    <ssl_cert_file>/etc/clickhouse-server/server.crt</ssl_cert_file>
    <ssl_key_file>/etc/clickhouse-server/server.key</ssl_key_file>
    <ssl_ca_cert_file>/etc/clickhouse-server/ca.crt</ssl_ca_cert_file>
</grpc>
```

## Summary

The ClickHouse gRPC interface provides efficient binary transport with optional compression and streaming, making it a strong choice for data-intensive microservices. Enable it via the config, generate client stubs from the official `.proto` file, and use streaming RPCs for large result sets to avoid buffering everything in memory.
