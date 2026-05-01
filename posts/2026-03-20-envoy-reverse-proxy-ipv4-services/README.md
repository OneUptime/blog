# How to Configure Envoy as a Reverse Proxy for IPv4 Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Reverse Proxy, IPv4, Service Mesh, Kubernetes, Load Balancing

Description: Configure Envoy Proxy with static resources to reverse proxy IPv4 traffic to backend services with load balancing, health checks, and circuit breaking.

## Introduction

Envoy is a high-performance, L4/L7 proxy originally built at Lyft and now the data plane for Istio and most service meshes. When used as a standalone reverse proxy, it provides advanced features like circuit breaking, retries, outlier detection, and detailed observability out of the box.

## Basic Envoy Configuration

Envoy is configured via a YAML file (or dynamically via xDS APIs). The key components are:

- **Listeners**: Define where Envoy accepts incoming traffic
- **Filters**: Process the connection (e.g., HTTP connection manager)
- **Clusters**: Define the upstream backends
- **Routes**: Map incoming requests to clusters

## Static Configuration Example

```yaml
# envoy.yaml - reverse proxy for an IPv4 backend service

admin:
  address:
    socket_address:
      address: 0.0.0.0          # Admin interface
      port_value: 9901

static_resources:
  listeners:
    - name: listener_0
      address:
        socket_address:
          address: 0.0.0.0          # Listen on all interfaces
          port_value: 8080          # Incoming port
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: ingress_http
                route_config:
                  name: local_route
                  virtual_hosts:
                    - name: backend_service
                      domains: ["*"]
                      routes:
                        - match:
                            prefix: "/"
                          route:
                            cluster: backend_cluster
                            timeout: 30s
                            retry_policy:
                              retry_on: "5xx"
                              num_retries: 3
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    - name: backend_cluster
      connect_timeout: 5s
      type: STATIC                   # Use explicitly configured IPv4 backends
      lb_policy: ROUND_ROBIN         # Load balancing algorithm
      load_assignment:
        cluster_name: backend_cluster
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: 10.0.1.10
                      port_value: 8000
              - endpoint:
                  address:
                    socket_address:
                      address: 10.0.1.11
                      port_value: 8000
      health_checks:
        - timeout: 5s
          interval: 10s
          unhealthy_threshold: 3
          healthy_threshold: 2
          http_health_check:
            path: /health             # Active health check endpoint
```

## Running Envoy

```bash
# Run with Docker

docker run --rm \
  -v $(pwd)/envoy.yaml:/etc/envoy/envoy.yaml \
  -p 8080:8080 \
  -p 9901:9901 \
  envoyproxy/envoy:v1.29-latest \
  -c /etc/envoy/envoy.yaml

# The admin interface is at http://localhost:9901
```

## Accessing the Admin Interface

Envoy exposes a rich admin API at port 9901:

```bash
# Check cluster health status
curl http://localhost:9901/clusters | grep backend_cluster

# View stats
curl http://localhost:9901/stats | grep upstream_cx

# Check config dump
curl http://localhost:9901/config_dump
```

## Adding Circuit Breaking

```yaml
clusters:
  - name: backend_cluster
    circuit_breakers:
      thresholds:
        - priority: DEFAULT
          max_connections: 1000       # Max concurrent connections
          max_pending_requests: 1000  # Max requests waiting for a connection
          max_requests: 2000          # Max active requests
          max_retries: 10             # Max active retries
```

## Configuring Outlier Detection

Automatically eject unhealthy backends:

```yaml
clusters:
  - name: backend_cluster
    outlier_detection:
      consecutive_5xx: 5             # Eject after 5 consecutive 5xx errors
      interval: 10s                  # Check interval
      base_ejection_time: 30s        # How long to eject for
      max_ejection_percent: 50       # Max percentage of backends to eject
```

## Conclusion

Envoy provides production-grade proxy functionality with circuit breaking, outlier detection, retries, and deep observability. Its xDS API makes it the ideal foundation for dynamic service mesh data planes. Use the admin API to monitor performance in real time.
