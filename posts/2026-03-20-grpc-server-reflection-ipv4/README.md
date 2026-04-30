# How to Implement gRPC Server Reflection over IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, IPv4, Server Reflection, Go, Python, Grpcurl, Testing

Description: Enable gRPC server reflection on IPv4 servers in Go and Python so clients can discover available services and methods without proto files, using grpcurl and grpc_cli.

## Introduction

gRPC Server Reflection lets clients query a server's available services at runtime without needing compiled proto definitions. This is essential for dynamic clients, testing tools like `grpcurl`, and API gateways that inspect service schemas.

## Enable Reflection in Go

```go
package main

import (
    "context"
    "log"
    "net"

    "google.golang.org/grpc"
    "google.golang.org/grpc/reflection"
    pb "example.com/proto/helloworld"
)

type server struct {
    pb.UnimplementedGreeterServer
}

func (s *server) SayHello(_ context.Context, req *pb.HelloRequest) (*pb.HelloReply, error) {
    return &pb.HelloReply{Message: "Hello, " + req.Name + "!"}, nil
}

func main() {
    lis, err := net.Listen("tcp4", "0.0.0.0:50051")
    if err != nil {
        log.Fatal(err)
    }

    srv := grpc.NewServer()
    pb.RegisterGreeterServer(srv, &server{})

    // Enable reflection
    reflection.Register(srv)

    log.Println("gRPC server with reflection on :50051")
    if err := srv.Serve(lis); err != nil {
        log.Fatal(err)
    }
}
```

## Enable Reflection in Python

```python
import grpc
from grpc_reflection.v1alpha import reflection
from concurrent import futures
import helloworld_pb2
import helloworld_pb2_grpc

class Greeter(helloworld_pb2_grpc.GreeterServicer):
    def SayHello(self, request, context):
        return helloworld_pb2.HelloReply(message=f"Hello, {request.name}!")

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    helloworld_pb2_grpc.add_GreeterServicer_to_server(Greeter(), server)

    # Enable reflection
    SERVICE_NAMES = (
        helloworld_pb2.DESCRIPTOR.services_by_name["Greeter"].full_name,
        reflection.SERVICE_NAME,
    )
    reflection.enable_server_reflection(SERVICE_NAMES, server)

    server.add_insecure_port("0.0.0.0:50051")
    server.start()
    server.wait_for_termination()

if __name__ == "__main__":
    serve()
```

## Query with grpcurl

```bash
# Install grpcurl

brew install grpcurl

# List all services
grpcurl -plaintext 192.168.1.10:50051 list

# Describe a service
grpcurl -plaintext 192.168.1.10:50051 describe helloworld.Greeter

# Describe a message type
grpcurl -plaintext 192.168.1.10:50051 describe helloworld.HelloRequest

# Invoke a method
grpcurl -plaintext -d '{"name": "World"}' \
  192.168.1.10:50051 helloworld.Greeter/SayHello
```

## Query with grpc_cli

```bash
# List services
grpc_cli ls 192.168.1.10:50051

# List methods on a service
grpc_cli ls 192.168.1.10:50051 helloworld.Greeter -l

# Call a method
grpc_cli call 192.168.1.10:50051 SayHello "name: 'World'"
```

## Restrict Reflection to Internal Networks

```go
// Use a stream interceptor to restrict reflection to trusted IPv4 ranges
import (
    "net"
    "strings"

    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/peer"
    "google.golang.org/grpc/status"
)

var trustedNetwork = mustParseCIDR("192.168.0.0/16")

func mustParseCIDR(cidr string) *net.IPNet {
    _, network, err := net.ParseCIDR(cidr)
    if err != nil {
        panic(err)
    }
    return network
}

func reflectionGuard(srv interface{}, ss grpc.ServerStream,
    info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {

    if strings.HasPrefix(info.FullMethod, "/grpc.reflection.") {
        p, ok := peer.FromContext(ss.Context())
        if !ok {
            return status.Error(codes.PermissionDenied, "reflection not allowed")
        }
        host, _, err := net.SplitHostPort(p.Addr.String())
        if err != nil {
            return status.Error(codes.PermissionDenied, "reflection not allowed")
        }
        ip := net.ParseIP(host)
        if ip == nil || !trustedNetwork.Contains(ip) {
            return status.Error(codes.PermissionDenied, "reflection not allowed")
        }
    }
    return handler(srv, ss)
}
```

## Conclusion

gRPC server reflection is a one-line addition (`reflection.Register` in Go, `enable_server_reflection` in Python) that unlocks runtime service discovery and makes testing with `grpcurl` trivial. In production, restrict reflection to internal IPv4 networks using an interceptor to avoid leaking service schemas to external clients.
