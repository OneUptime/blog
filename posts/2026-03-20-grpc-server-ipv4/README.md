# How to Configure a gRPC Server to Listen on an IPv4 Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, IPv4, Python, Go, Networking, Microservice

Description: Learn how to configure a gRPC server to listen on a specific IPv4 address in Python and Go, including bind address syntax, TLS configuration, and health checking setup.

## gRPC Address Syntax

gRPC server listen APIs in Python and Go use address strings in `host:port` form (use brackets around IPv6 literals):

| Address | Meaning |
|---------|---------|
| `0.0.0.0:50051` | All IPv4 interfaces |
| `127.0.0.1:50051` | Localhost only |
| `192.168.1.10:50051` | Specific IPv4 interface |
| `[::]:50051` | All IPv6 interfaces |

## Python: grpc server on specific IP

```python
import grpc
from concurrent import futures
import hello_pb2
import hello_pb2_grpc

class GreeterServicer(hello_pb2_grpc.GreeterServicer):
    def SayHello(self, request, context):
        return hello_pb2.HelloReply(message=f"Hello, {request.name}!")

def serve(bind_address: str = "0.0.0.0:50051") -> None:
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    hello_pb2_grpc.add_GreeterServicer_to_server(GreeterServicer(), server)

    # Insecure (no TLS) - fine for internal services behind mTLS mesh
    server.add_insecure_port(bind_address)
    server.start()
    print(f"gRPC server listening on {bind_address}")
    server.wait_for_termination()

if __name__ == "__main__":
    import os
    addr = os.environ.get("GRPC_LISTEN_ADDR", "0.0.0.0:50051")
    serve(addr)
```

## Python: gRPC with TLS

```python
import grpc
from concurrent import futures

def serve_tls(bind_address: str = "0.0.0.0:50051") -> None:
    # Load server certificates
    with open("server.key", "rb") as f:
        private_key = f.read()
    with open("server.crt", "rb") as f:
        certificate_chain = f.read()
    with open("ca.crt", "rb") as f:
        root_certificates = f.read()

    credentials = grpc.ssl_server_credentials(
        [(private_key, certificate_chain)],
        root_certificates=root_certificates,
        require_client_auth=True,  # mTLS
    )

    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    # add servicers here ...
    server.add_secure_port(bind_address, credentials)
    server.start()
    server.wait_for_termination()
```

## Go: gRPC Server

```go
package main

import (
    "context"
    "fmt"
    "log"
    "net"
    "os"
    "google.golang.org/grpc"
    pb "example.com/hello"
)

type server struct{ pb.UnimplementedGreeterServer }

func (s *server) SayHello(ctx context.Context, req *pb.HelloRequest) (*pb.HelloReply, error) {
    return &pb.HelloReply{Message: "Hello " + req.Name}, nil
}

func main() {
    addr := os.Getenv("GRPC_LISTEN_ADDR")
    if addr == "" {
        addr = "0.0.0.0:50051"
    }

    // "tcp4" forces IPv4 only
    lis, err := net.Listen("tcp4", addr)
    if err != nil {
        log.Fatalf("listen: %v", err)
    }

    s := grpc.NewServer()
    pb.RegisterGreeterServer(s, &server{})

    fmt.Printf("gRPC server on %s\n", addr)
    if err := s.Serve(lis); err != nil {
        log.Fatalf("serve: %v", err)
    }
}
```

## Graceful Shutdown

```python
import grpc
import signal
from concurrent import futures

server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
# ... add servicers ...

server.add_insecure_port("0.0.0.0:50051")
server.start()

def graceful_stop(signum, frame):
    print("Shutting down gRPC server...")
    # grace=5: allow 5 seconds for in-flight RPCs to finish
    server.stop(grace=5).wait()
    print("Server stopped")

signal.signal(signal.SIGTERM, graceful_stop)
signal.signal(signal.SIGINT,  graceful_stop)
server.wait_for_termination()
```

## Conclusion

Pass the bind address as `"host:port"` to `add_insecure_port` or `add_secure_port`. Use environment variables to configure the address at deploy time without changing code. Use `"tcp4"` (Go) or bind to an IPv4 address such as `"0.0.0.0:50051"` (Python) to restrict to IPv4. Implement graceful shutdown with a non-zero `grace` period to drain in-flight requests before the process exits. For production, always use TLS or a service mesh that enforces mTLS between services.
