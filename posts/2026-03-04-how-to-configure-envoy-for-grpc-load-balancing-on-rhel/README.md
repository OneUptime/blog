# How to Configure Envoy for gRPC Load Balancing on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Envoy, gRPC, Load Balancing, Microservices

Description: Learn how to configure Envoy on RHEL to load balance gRPC traffic across multiple backend services with HTTP/2 support.

---

gRPC uses HTTP/2 for transport, which means traditional L4 load balancers cannot distribute requests across connections effectively. Envoy provides L7 gRPC-aware load balancing that distributes individual RPC calls.

## Installing Envoy

```bash
# Download Envoy binary
curl -L https://github.com/envoyproxy/envoy/releases/download/v1.28.0/envoy-1.28.0-linux-x86_64 \
  -o /usr/local/bin/envoy
sudo chmod +x /usr/local/bin/envoy
```

## Envoy Configuration for gRPC

```yaml
# Save as /etc/envoy/grpc-lb.yaml
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
                stat_prefix: grpc
                codec_type: AUTO
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
                            cluster: grpc_backends
                            timeout: 30s
                            retry_policy:
                              retry_on: "unavailable,resource-exhausted"
                              num_retries: 3
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    - name: grpc_backends
      connect_timeout: 5s
      type: STATIC
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
          grpc_health_check: {}
      load_assignment:
        cluster_name: grpc_backends
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: 127.0.0.1
                      port_value: 50052
              - endpoint:
                  address:
                    socket_address:
                      address: 127.0.0.1
                      port_value: 50053
              - endpoint:
                  address:
                    socket_address:
                      address: 127.0.0.1
                      port_value: 50054

admin:
  address:
    socket_address:
      address: 127.0.0.1
      port_value: 9901
```

## Running and Testing

```bash
# Start Envoy
envoy -c /etc/envoy/grpc-lb.yaml &

# Test with grpcurl (install from GitHub releases)
grpcurl -plaintext localhost:50051 list
grpcurl -plaintext localhost:50051 grpc.health.v1.Health/Check
```

## Creating a systemd Service

```bash
cat << 'SERVICE' | sudo tee /etc/systemd/system/envoy-grpc.service
[Unit]
Description=Envoy gRPC Load Balancer
After=network.target

[Service]
ExecStart=/usr/local/bin/envoy -c /etc/envoy/grpc-lb.yaml
Restart=always
User=envoy

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable --now envoy-grpc
```

The key configuration elements are `http2_protocol_options` on the cluster (required for gRPC) and `grpc_health_check` for backend health monitoring using the standard gRPC Health Checking Protocol.
