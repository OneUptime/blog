# How to Connect a gRPC Client to an IPv4 Server Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, IPv4, Python, Go, Client, Networking

Description: Learn how to configure a gRPC client to connect to a server at a specific IPv4 address in Python and Go, including channel options, TLS, timeouts, retry policies, and connection management.

## Python: Basic gRPC Client

```python
import grpc
import hello_pb2
import hello_pb2_grpc

def call_greeter(address: str = "192.168.1.10:50051") -> None:
    # Insecure channel for internal services (no TLS)
    with grpc.insecure_channel(address) as channel:
        stub = hello_pb2_grpc.GreeterStub(channel)
        response = stub.SayHello(hello_pb2.HelloRequest(name="world"))
        print(f"Server replied: {response.message}")

call_greeter()
```

## Python: Channel with Options

```python
import grpc
import os

SERVER_ADDR = os.environ.get("GREETER_ADDR", "192.168.1.10:50051")

channel = grpc.insecure_channel(
    SERVER_ADDR,
    options=[
        ("grpc.max_send_message_length",    10 * 1024 * 1024),
        ("grpc.max_receive_message_length", 10 * 1024 * 1024),
        ("grpc.keepalive_time_ms",          30_000),
        ("grpc.keepalive_timeout_ms",       10_000),
        ("grpc.keepalive_permit_without_calls", True),
        ("grpc.http2.max_pings_without_data", 0),
    ],
)
```

## Python: gRPC Client with TLS

```python
import grpc

def create_secure_channel(address: str) -> grpc.Channel:
    with open("ca.crt", "rb") as f:
        trusted_certs = f.read()

    credentials = grpc.ssl_channel_credentials(
        root_certificates=trusted_certs,
    )
    # If the server requires mutual TLS, also pass private_key=... and certificate_chain=....
    # When connecting by IPv4 address, the server certificate must include that IP in subjectAltName.
    return grpc.secure_channel(address, credentials)
```

## Python: Call with Deadline (Timeout)

```python
import grpc
import hello_pb2
import hello_pb2_grpc

with grpc.insecure_channel("192.168.1.10:50051") as channel:
    stub = hello_pb2_grpc.GreeterStub(channel)
    try:
        # deadline in seconds from now
        response = stub.SayHello(
            hello_pb2.HelloRequest(name="world"),
            timeout=3.0
        )
        print(response.message)
    except grpc.RpcError as e:
        if e.code() == grpc.StatusCode.DEADLINE_EXCEEDED:
            print("Call timed out")
        else:
            print(f"RPC failed: {e.code()} - {e.details()}")
```

## Go: gRPC Client

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    pb "example.com/hello"
)

func main() {
    addr := "192.168.1.10:50051"

    // grpc.Dial is deprecated in newer versions; grpc.NewClient creates the ClientConn
    // and the first RPC will trigger connection establishment.
    conn, err := grpc.NewClient(
        addr,
        grpc.WithTransportCredentials(insecure.NewCredentials()),
    )
    if err != nil {
        log.Fatalf("create client: %v", err)
    }
    defer conn.Close()

    client := pb.NewGreeterClient(conn)

    ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
    defer cancel()

    resp, err := client.SayHello(ctx, &pb.HelloRequest{Name: "world"})
    if err != nil {
        log.Fatalf("SayHello: %v", err)
    }
    fmt.Printf("Server: %s\n", resp.GetMessage())
}
```

## Conclusion

Pass the server address as `"host:port"` to `grpc.insecure_channel` (Python) or `grpc.NewClient` (Go). In gRPC-Go, `grpc.NewClient` creates the `ClientConn`; the first RPC triggers connection establishment. Use environment variables for the server address to avoid hard-coding IPs. Set `timeout` per-call (Python) or use `context.WithTimeout` (Go) to enforce deadlines. Enable keepalive options for long-lived connections, but keep the client and server keepalive settings aligned. For production, use TLS credentials (`ssl_channel_credentials` in Python or `grpc.WithTransportCredentials(credentials.NewTLS(...))` in Go) instead of insecure channels, and ensure the certificate is valid for the IPv4 address if you connect by IP.
