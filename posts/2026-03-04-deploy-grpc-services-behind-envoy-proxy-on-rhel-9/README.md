# How to Deploy gRPC Services Behind Envoy Proxy on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, GRPC, Envoy, Proxy, Microservices, Linux

Description: Learn how to deploy gRPC services behind Envoy proxy on RHEL, covering HTTP/2 configuration, gRPC routing, load balancing, health checking, and TLS termination for gRPC traffic.

---

gRPC uses HTTP/2 as its transport protocol, which means you cannot just drop a standard HTTP/1.1 reverse proxy in front of gRPC services and expect everything to work. Envoy has native HTTP/2 and gRPC support, making it the ideal proxy for gRPC microservices. This guide shows you how to set up Envoy as a front proxy for gRPC services on RHEL.

## Why Envoy for gRPC

Envoy understands gRPC at the protocol level, which enables:

- gRPC-aware load balancing across backend instances
- gRPC health checking using the standard gRPC health protocol
- Automatic HTTP/2 connection management
- gRPC-JSON transcoding for REST clients
- Per-method routing and rate limiting

## Prerequisites

- RHEL with Envoy installed
- A gRPC service to proxy (we will create a simple one)
- Go or Python for the example gRPC service

## Creating a Sample gRPC Service

First, create a simple gRPC service for testing. Using Go:

```bash
# Install Go and gRPC tools
sudo dnf install -y golang
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```

Create a simple greeting service:

```protobuf
// greeter.proto
syntax = "proto3";
package greeter;
option go_package = "./greeter";

service Greeter {
  rpc SayHello (HelloRequest) returns (HelloReply) {}
}

message HelloRequest {
  string name = 1;
}

message HelloReply {
  string message = 1;
}
```

A minimal Go server implementation:

```go
// main.go
package main

import (
    "context"
    "log"
    "net"

    "google.golang.org/grpc"
    "google.golang.org/grpc/health"
    healthpb "google.golang.org/grpc/health/grpc_health_v1"
    pb "example/greeter"
)

type server struct {
    pb.UnimplementedGreeterServer
}

func (s *server) SayHello(ctx context.Context, in *pb.HelloRequest) (*pb.HelloReply, error) {
    return &pb.HelloReply{Message: "Hello " + in.GetName()}, nil
}

func main() {
    lis, err := net.Listen("tcp", ":50051")
    if err != nil {
        log.Fatalf("failed to listen: %v", err)
    }
    s := grpc.NewServer()
    pb.RegisterGreeterServer(s, &server{})

    // Register the health service
    healthServer := health.NewServer()
    healthpb.RegisterHealthServer(s, healthServer)
    healthServer.SetServingStatus("greeter.Greeter", healthpb.HealthCheckResponse_SERVING)

    log.Println("gRPC server listening on :50051")
    if err := s.Serve(lis); err != nil {
        log.Fatalf("failed to serve: %v", err)
    }
}
```

## Configuring Envoy for gRPC

The key to proxying gRPC is making sure both the listener and the cluster use HTTP/2:

```yaml
# envoy-grpc.yaml
static_resources:
  listeners:
  - name: grpc_listener
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 8080
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: grpc_ingress
          codec_type: AUTO
          route_config:
            name: grpc_route
            virtual_hosts:
            - name: grpc_services
              domains: ["*"]
              routes:
              - match:
                  prefix: "/greeter.Greeter/"
                route:
                  cluster: greeter_service
                  timeout: 30s
              - match:
                  prefix: "/"
                route:
                  cluster: greeter_service
          http_filters:
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
  - name: greeter_service
    connect_timeout: 5s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    typed_extension_protocol_options:
      envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
        "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
        explicit_http_config:
          http2_protocol_options: {}
    load_assignment:
      cluster_name: greeter_service
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: 127.0.0.1
                port_value: 50051
```

The critical part is `http2_protocol_options` in the cluster configuration, which tells Envoy to use HTTP/2 when connecting to the backend.

## Adding gRPC Health Checking

Configure Envoy to use the gRPC health checking protocol:

```yaml
clusters:
- name: greeter_service
  connect_timeout: 5s
  type: STRICT_DNS
  lb_policy: ROUND_ROBIN
  typed_extension_protocol_options:
    envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
      "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
      explicit_http_config:
        http2_protocol_options: {}
  health_checks:
  - timeout: 5s
    interval: 10s
    unhealthy_threshold: 3
    healthy_threshold: 2
    grpc_health_check:
      service_name: "greeter.Greeter"
  load_assignment:
    cluster_name: greeter_service
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: 127.0.0.1
              port_value: 50051
```

## Load Balancing Multiple gRPC Backends

For multiple backend instances, add them to the load assignment:

```yaml
load_assignment:
  cluster_name: greeter_service
  endpoints:
  - lb_endpoints:
    - endpoint:
        address:
          socket_address:
            address: backend1.example.com
            port_value: 50051
    - endpoint:
        address:
          socket_address:
            address: backend2.example.com
            port_value: 50051
    - endpoint:
        address:
          socket_address:
            address: backend3.example.com
            port_value: 50051
```

For gRPC, `ROUND_ROBIN` works well because HTTP/2 multiplexes many requests over a single connection. If you need request-level balancing, use `LEAST_REQUEST`:

```yaml
lb_policy: LEAST_REQUEST
```

## TLS Termination for gRPC

Add TLS to the listener for secure gRPC:

```yaml
listeners:
- name: grpc_listener
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 443
  filter_chains:
  - transport_socket:
      name: envoy.transport_sockets.tls
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.transport_sockets.tls.v3.DownstreamTlsContext
        common_tls_context:
          alpn_protocols: ["h2"]
          tls_certificates:
          - certificate_chain:
              filename: /etc/envoy/certs/server.crt
            private_key:
              filename: /etc/envoy/certs/server.key
    filters:
    - name: envoy.filters.network.http_connection_manager
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
        stat_prefix: grpc_ingress
        codec_type: AUTO
        route_config:
          name: grpc_route
          virtual_hosts:
          - name: grpc_services
            domains: ["*"]
            routes:
            - match:
                prefix: "/"
              route:
                cluster: greeter_service
        http_filters:
        - name: envoy.filters.http.router
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

Note the `alpn_protocols: ["h2"]` setting, which is required for gRPC over TLS.

## Per-Method Routing

Route different gRPC methods to different clusters:

```yaml
routes:
- match:
    prefix: "/greeter.Greeter/SayHello"
  route:
    cluster: greeter_v2
- match:
    prefix: "/greeter.Greeter/"
  route:
    cluster: greeter_v1
```

## Testing the Setup

Start Envoy and test with grpcurl:

```bash
# Install grpcurl
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest
```

```bash
# Test the gRPC service through Envoy
grpcurl -plaintext -d '{"name": "World"}' localhost:8080 greeter.Greeter/SayHello
```

You should see:

```json
{
  "message": "Hello World"
}
```

## Monitoring gRPC Traffic

Check Envoy stats for gRPC-specific metrics:

```bash
# View gRPC stats
curl -s http://localhost:8001/stats | grep grpc
```

Key metrics include `grpc.greeter.Greeter.SayHello.total`, response code distribution, and upstream connection counts.

## Conclusion

Envoy on RHEL provides native gRPC support that handles HTTP/2 connection management, health checking, load balancing, and TLS termination. By configuring HTTP/2 protocol options on your upstream clusters and using gRPC-aware health checks, you get a production-ready proxy layer for your gRPC microservices.
