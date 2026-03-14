# How to Configure Envoy for gRPC Load Balancing on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Envoy, Proxy, gRPC, Load Balancing, Linux

Description: Learn how to configure Envoy for gRPC Load Balancing on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

Envoy excels at gRPC load balancing because it understands HTTP/2, which gRPC uses as its transport protocol. Unlike traditional HTTP/1.1 load balancers, Envoy can distribute individual gRPC calls across backends even when they share a single HTTP/2 connection.

## Prerequisites

- RHEL 9 with Envoy installed
- gRPC backend services running

## The gRPC Load Balancing Problem

gRPC uses HTTP/2 with long-lived connections. A traditional Layer 4 load balancer assigns a connection to one backend, meaning all RPCs on that connection go to the same server. Envoy solves this with Layer 7 (per-request) load balancing.

## Step 1: Configure gRPC Listener

```yaml
static_resources:
  listeners:
  - name: grpc_listener
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 50051
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          codec_type: AUTO
          stat_prefix: grpc
          route_config:
            name: grpc_route
            virtual_hosts:
            - name: grpc_service
              domains: ["*"]
              routes:
              - match:
                  prefix: "/"
                  grpc: {}
                route:
                  cluster: grpc_backend
                  timeout: 30s
                  retry_policy:
                    retry_on: "cancelled,deadline-exceeded,unavailable"
                    num_retries: 2
          http_filters:
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

## Step 2: Configure gRPC Backend Cluster

```yaml
  clusters:
  - name: grpc_backend
    connect_timeout: 5s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    typed_extension_protocol_options:
      envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
        "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
        explicit_http_config:
          http2_protocol_options: {}
    load_assignment:
      cluster_name: grpc_backend
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: backend1.local
                port_value: 50051
        - endpoint:
            address:
              socket_address:
                address: backend2.local
                port_value: 50051
    health_checks:
    - timeout: 5s
      interval: 10s
      grpc_health_check: {}
```

## Step 3: Test with grpcurl

```bash
grpcurl -plaintext localhost:50051 list
grpcurl -plaintext localhost:50051 mypackage.MyService/MyMethod
```

## Conclusion

Envoy provides true Layer 7 gRPC load balancing on RHEL 9, distributing individual RPCs across backends rather than pinning connections. Combined with gRPC health checking and retry policies, it provides a robust foundation for gRPC microservice architectures.
