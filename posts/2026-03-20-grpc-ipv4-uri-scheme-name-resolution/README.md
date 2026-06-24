# How to Use the ipv4 URI Scheme in gRPC Name Resolution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, IPv4, Name Resolution, Go, Python, Networking

Description: Use the ipv4:// URI scheme in gRPC to create direct IPv4 connections, configure custom name resolvers, and handle multi-address load balancing in Go and Python.

## Introduction

gRPC supports pluggable name resolution. The `ipv4:` target syntax in the gRPC naming spec lets gRPC C-core-based clients specify one or more IPv4 endpoints directly without DNS lookup, which is useful in environments where DNS is unavailable or unreliable. `grpc-go` does not include a built-in `ipv4` resolver, so Go clients use `passthrough` for a single direct address or a custom resolver for multiple backends.

## Direct IPv4 Target in Go

```go
package main

import (
    "context"
    "log"
    "time"

    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
    pb "example.com/proto/helloworld"
)

func main() {
    // Single IPv4 target
    conn, err := grpc.NewClient(
        "passthrough:///192.168.1.10:50051",
        grpc.WithTransportCredentials(insecure.NewCredentials()),
    )
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    client := pb.NewGreeterClient(conn)
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    resp, err := client.SayHello(ctx, &pb.HelloRequest{Name: "world"})
    if err != nil {
        log.Fatal(err)
    }
    log.Println(resp.Message)
}
```

## Multiple IPv4 Addresses with Round-Robin

In `grpc-go`, use the `static` resolver shown below to return multiple backend addresses, then enable `round_robin` via service config.

```go
conn, err := grpc.NewClient(
    "static:///helloworld",
    grpc.WithTransportCredentials(insecure.NewCredentials()),
    grpc.WithDefaultServiceConfig(`{"loadBalancingConfig":[{"round_robin":{}}]}`),
)
```

## Python gRPC with ipv4 Target

```python
import grpc
import helloworld_pb2
import helloworld_pb2_grpc

channel = grpc.insecure_channel(
    "ipv4:192.168.1.10:50051"
)

stub = helloworld_pb2_grpc.GreeterStub(channel)
response = stub.SayHello(helloworld_pb2.HelloRequest(name="World"))
print(response.message)
```

## Python - Multiple Addresses

```python
channel = grpc.insecure_channel(
    "ipv4:192.168.1.10:50051,192.168.1.11:50051",
    options=[("grpc.lb_policy_name", "round_robin")]
)
```

## Custom Static Resolver in Go

```go
package main

import (
    "google.golang.org/grpc/resolver"
)

type staticResolver struct {
    cc resolver.ClientConn
}

func (r *staticResolver) ResolveNow(resolver.ResolveNowOptions) {}
func (r *staticResolver) Close() {}

type staticResolverBuilder struct{}

func (b *staticResolverBuilder) Build(target resolver.Target,
    cc resolver.ClientConn, opts resolver.BuildOptions) (resolver.Resolver, error) {

    addrs := []resolver.Address{
        {Addr: "192.168.1.10:50051"},
        {Addr: "192.168.1.11:50051"},
    }
    cc.UpdateState(resolver.State{Addresses: addrs})
    return &staticResolver{cc: cc}, nil
}

func (b *staticResolverBuilder) Scheme() string { return "static" }

func init() {
    resolver.Register(&staticResolverBuilder{})
}
```

## Service Config with Health Checking

```go
serviceConfig := `{
    "loadBalancingConfig": [{"round_robin":{}}],
    "healthCheckConfig": {"serviceName": ""}
}`

conn, _ := grpc.NewClient(
    "static:///helloworld",
    grpc.WithDefaultServiceConfig(serviceConfig),
    grpc.WithTransportCredentials(insecure.NewCredentials()),
)
```

## Conclusion

The `ipv4:` target syntax bypasses DNS and connects directly to specified IPv4 addresses in gRPC C-core-based clients such as Python. In `grpc-go`, use `passthrough` for a single direct address and a custom `resolver.Builder` to push multi-address updates into the gRPC channel. Combine the resolved address list with the `round_robin` load balancing policy to distribute calls across multiple backends.
