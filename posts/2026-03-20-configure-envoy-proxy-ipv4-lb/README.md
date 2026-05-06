# How to Configure Envoy Proxy for IPv4 Load Balancing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Load Balancing, IPv4, Proxy, Service Mesh, Cluster

Description: Configure Envoy Proxy as an IPv4 load balancer with static listener and cluster configuration, health checks, and circuit breaker settings for production workloads.

## Introduction

Envoy is a high-performance edge and service proxy used in service meshes (Istio, AWS App Mesh). It can be run standalone as an IPv4 load balancer. Envoy's configuration is declarative YAML and comprises listeners (incoming), clusters (backends), and routes (matching rules).

## Installing Envoy

```bash
# Ubuntu

sudo apt-get update
sudo apt-get install -y curl gpg
sudo install -m 0755 -d /etc/apt/keyrings

curl -fsSL https://apt.envoyproxy.io/signing.key | sudo gpg --dearmor -o /etc/apt/keyrings/envoy-keyring.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/envoy-keyring.gpg] https://apt.envoyproxy.io $(. /etc/os-release && echo \"$VERSION_CODENAME\") main" | sudo tee /etc/apt/sources.list.d/envoy.list > /dev/null

sudo apt-get update
sudo apt-get install -y envoy
```

## Static Configuration for HTTP Load Balancing

```yaml
# /etc/envoy/envoy.yaml

static_resources:
  listeners:
    - name: http_listener
      address:
        socket_address:
          address: 0.0.0.0
          port_value: 8080
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: ingress_http
                route_config:
                  name: local_route
                  virtual_hosts:
                    - name: backend
                      domains: ["*"]
                      routes:
                        - match:
                            prefix: "/"
                          route:
                            cluster: web_cluster
                            timeout: 30s
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    - name: web_cluster
      connect_timeout: 5s
      type: STATIC
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: web_cluster
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: 10.0.1.10
                      port_value: 8080
              - endpoint:
                  address:
                    socket_address:
                      address: 10.0.1.11
                      port_value: 8080
              - endpoint:
                  address:
                    socket_address:
                      address: 10.0.1.12
                      port_value: 8080

admin:
  address:
    socket_address:
      address: 127.0.0.1
      port_value: 9901
```

## Running Envoy

```bash
envoy -c /etc/envoy/envoy.yaml --log-level info
```

## Health Checks in Clusters

```yaml
clusters:
  - name: web_cluster
    connect_timeout: 5s
    type: STATIC
    lb_policy: LEAST_REQUEST
    health_checks:
      - timeout: 2s
        interval: 10s
        unhealthy_threshold: 3
        healthy_threshold: 2
        http_health_check:
          path: /health
    load_assignment:
      cluster_name: web_cluster
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: 10.0.1.10
                    port_value: 8080
```

## Circuit Breaker Configuration

```yaml
clusters:
  - name: web_cluster
    circuit_breakers:
      thresholds:
        - priority: DEFAULT
          max_connections: 1000
          max_pending_requests: 1000
          max_requests: 1000
          max_retries: 3
```

## Load Balancing Policies

| Policy | Description |
|---|---|
| ROUND_ROBIN | Sequential rotation |
| LEAST_REQUEST | Fewest active requests |
| RANDOM | Random selection |
| RING_HASH | Consistent hash with a configured hash policy |
| MAGLEV | Google Maglev consistent hash with a configured hash policy |

## Accessing the Admin API

```bash
# View cluster endpoints and health
curl http://localhost:9901/clusters

# View statistics
curl http://localhost:9901/stats | grep upstream

# Cleanly shut down Envoy
curl -X POST http://localhost:9901/quitquitquit
```

## Conclusion

Envoy's static configuration defines listeners and clusters in YAML. Set `lb_policy` to `ROUND_ROBIN` or `LEAST_REQUEST` for the cluster. Add `health_checks` with HTTP path checks to remove unhealthy endpoints. Configure circuit breakers with connection and request limits. Use the admin API on port 9901 for runtime inspection and stats.
