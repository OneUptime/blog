# How to Implement gRPC Load Balancing with IPv4 Endpoints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Load Balancing, IPv4, Python, Go, Kubernetes

Description: Learn how to implement client-side and server-side load balancing for gRPC services using IPv4 endpoints, including round-robin, DNS-based discovery, and Nginx/Envoy proxy patterns.

## Client-Side Round-Robin (Go)

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
    // DNS-based service discovery: a headless Service can return multiple pod IPs.
    // round_robin tells the client to connect to all resolved addresses and rotate RPCs.
    conn, err := grpc.NewClient(
        "dns:///greeter.default.svc.cluster.local:50051",
        grpc.WithTransportCredentials(insecure.NewCredentials()),
        grpc.WithDefaultServiceConfig(`{"loadBalancingConfig": [{"round_robin":{}}]}`),
    )
    if err != nil {
        log.Fatal(err)
    }
    defer conn.Close()

    client := pb.NewGreeterClient(conn)
    for i := 0; i < 5; i++ {
        ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
        resp, err := client.SayHello(ctx, &pb.HelloRequest{Name: "world"})
        cancel()
        if err != nil {
            log.Printf("RPC failed: %v", err)
            continue
        }
        fmt.Printf("Response: %s\n", resp.GetMessage())
    }
}
```

## Python: Client-Side Round-Robin

```python
import grpc
import hello_pb2
import hello_pb2_grpc

# Load balancing takes effect when DNS returns multiple A records for this name.

channel = grpc.insecure_channel(
    "dns:///greeter.default.svc.cluster.local:50051",
    options=[("grpc.lb_policy_name", "round_robin")],
)

stub = hello_pb2_grpc.GreeterStub(channel)
for _ in range(5):
    try:
        resp = stub.SayHello(hello_pb2.HelloRequest(name="world"), timeout=3.0)
        print(resp.message)
    except grpc.RpcError as e:
        print(f"Error: {e.code()}")
```

## Nginx: Server-Side gRPC Load Balancer

```nginx
# gRPC proxying is available in Nginx 1.13.10+; this snippet uses current HTTP/2 syntax.
upstream grpc_backends {
    least_conn;
    server 10.0.0.1:50051;
    server 10.0.0.2:50051;
    server 10.0.0.3:50051;
    keepalive 32;
}

server {
    listen 50051;
    http2 on;

    location / {
        grpc_pass grpc://grpc_backends;
        error_page 502 = /error502grpc;
    }

    location = /error502grpc {
        internal;
        default_type application/grpc;
        add_header grpc-status 14;  # UNAVAILABLE
        add_header content-length 0;
        return 204;
    }
}
```

## Kubernetes: Headless Service for Client-Side LB

```yaml
# Headless service - DNS returns all pod IPs
apiVersion: v1
kind: Service
metadata:
  name: greeter
spec:
  clusterIP: None   # headless
  selector:
    app: greeter
  ports:
    - port: 50051
```

```text
# DNS A record resolution
nslookup greeter.default.svc.cluster.local
→ 10.244.1.5
→ 10.244.2.8
→ 10.244.3.12
```

A gRPC client configured with `round_robin` connects to the resolved addresses and rotates RPCs across them.

## Conclusion

Per-RPC gRPC load balancing happens in the client or a Layer-7 proxy. A TCP-level load balancer can spread connections, but it does not see individual RPCs inside a long-lived HTTP/2 connection. Use the `round_robin` load balancing policy with DNS resolution to distribute across the pod IPs returned by a Kubernetes headless Service. For server-side load balancing, configure Nginx with `grpc_pass` or use Envoy, which is the standard data plane in many service meshes. A Kubernetes `ClusterIP` Service still balances new TCP connections, but a long-lived gRPC client connection will typically keep sending RPCs to the same backend until it reconnects.
