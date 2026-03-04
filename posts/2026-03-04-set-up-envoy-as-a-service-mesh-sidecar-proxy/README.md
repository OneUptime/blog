# How to Set Up Envoy as a Service Mesh Sidecar Proxy on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Envoy, Proxy, Service Mesh, Linux

Description: Learn how to set Up Envoy as a Service Mesh Sidecar Proxy on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

Envoy is commonly deployed as a sidecar proxy in service mesh architectures, where each service instance has its own Envoy instance handling all inbound and outbound network traffic. This pattern provides observability, security, and traffic control without modifying application code.

## Prerequisites

- RHEL 9
- Envoy installed
- Application service running locally

## Understanding the Sidecar Pattern

```
Client -> Envoy (inbound) -> Application -> Envoy (outbound) -> Upstream
```

Each application has its own Envoy sidecar that handles:
- Inbound traffic (authentication, rate limiting)
- Outbound traffic (service discovery, load balancing, retries)
- Metrics collection and tracing

## Step 1: Configure Inbound Listener

```yaml
static_resources:
  listeners:
  - name: inbound_listener
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 8080
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: inbound
          route_config:
            name: local
            virtual_hosts:
            - name: local_service
              domains: ["*"]
              routes:
              - match:
                  prefix: "/"
                route:
                  cluster: local_app
          http_filters:
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

## Step 2: Configure Outbound Listener

```yaml
  - name: outbound_listener
    address:
      socket_address:
        address: 127.0.0.1
        port_value: 9001
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: outbound
          route_config:
            name: upstream
            virtual_hosts:
            - name: upstream_service
              domains: ["*"]
              routes:
              - match:
                  prefix: "/"
                route:
                  cluster: upstream_cluster
                  retry_policy:
                    retry_on: "5xx,connect-failure"
                    num_retries: 3
          http_filters:
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

## Step 3: Define Clusters

```yaml
  clusters:
  - name: local_app
    connect_timeout: 1s
    type: STATIC
    load_assignment:
      cluster_name: local_app
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: 127.0.0.1
                port_value: 3000

  - name: upstream_cluster
    connect_timeout: 5s
    type: STRICT_DNS
    load_assignment:
      cluster_name: upstream_cluster
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: upstream-service.local
                port_value: 8080
```

## Step 4: Add Circuit Breaking

```yaml
  - name: upstream_cluster
    circuit_breakers:
      thresholds:
      - max_connections: 1024
        max_pending_requests: 1024
        max_requests: 1024
        max_retries: 3
```

## Step 5: Enable Metrics

```yaml
admin:
  address:
    socket_address:
      address: 127.0.0.1
      port_value: 9901
```

Prometheus metrics are available at `/stats/prometheus`.

## Conclusion

Deploying Envoy as a sidecar proxy on RHEL 9 provides transparent service mesh capabilities including retries, circuit breaking, load balancing, and observability without requiring changes to your application code.
