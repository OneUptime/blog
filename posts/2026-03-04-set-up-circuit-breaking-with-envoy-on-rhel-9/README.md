# How to Set Up Circuit Breaking with Envoy on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Envoy, Circuit Breaking, Resilience, Proxy, Linux

Description: Learn how to configure circuit breaking with Envoy proxy on RHEL to protect backend services from cascading failures, including connection limits, pending request thresholds, and outlier detection.

---

Circuit breaking is a resilience pattern that prevents a failing service from bringing down your entire system. When a backend becomes unhealthy or overloaded, Envoy's circuit breaker trips and starts rejecting requests quickly instead of letting them pile up and cause cascading failures. This guide shows you how to configure circuit breaking in Envoy on RHEL.

## How Circuit Breaking Works in Envoy

Envoy implements circuit breaking at the cluster level with several configurable thresholds:

- **max_connections** - Maximum number of TCP connections to the upstream cluster
- **max_pending_requests** - Maximum number of requests waiting for a connection from the pool
- **max_requests** - Maximum number of concurrent requests to the cluster
- **max_retries** - Maximum number of concurrent retries across all hosts in the cluster

When any of these thresholds is exceeded, Envoy short-circuits the request and returns a 503 immediately rather than adding to the overload.

## Prerequisites

- RHEL with Envoy installed
- A backend service to protect
- Basic understanding of Envoy configuration

## Basic Circuit Breaking Configuration

Add circuit breaker thresholds to your cluster definition:

```yaml
# envoy-circuit-breaker.yaml
static_resources:
  listeners:
  - name: main_listener
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
                  cluster: backend_service
          http_filters:
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
  - name: backend_service
    connect_timeout: 5s
    type: STRICT_DNS
    circuit_breakers:
      thresholds:
      - priority: DEFAULT
        max_connections: 100
        max_pending_requests: 50
        max_requests: 200
        max_retries: 3
      - priority: HIGH
        max_connections: 200
        max_pending_requests: 100
        max_requests: 400
        max_retries: 5
    load_assignment:
      cluster_name: backend_service
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: 127.0.0.1
                port_value: 9090
```

This configuration sets separate limits for DEFAULT and HIGH priority traffic. The HIGH priority thresholds allow critical requests to continue even when normal traffic is being circuit-broken.

## Configuring Outlier Detection

Outlier detection complements circuit breaking by automatically ejecting unhealthy hosts from the load balancing pool:

```yaml
clusters:
- name: backend_service
  connect_timeout: 5s
  type: STRICT_DNS
  circuit_breakers:
    thresholds:
    - priority: DEFAULT
      max_connections: 100
      max_pending_requests: 50
      max_requests: 200
      max_retries: 3
  outlier_detection:
    consecutive_5xx: 5
    interval: 10s
    base_ejection_time: 30s
    max_ejection_percent: 50
    enforcing_consecutive_5xx: 100
    enforcing_success_rate: 100
    success_rate_minimum_hosts: 3
    success_rate_request_volume: 100
    success_rate_stdev_factor: 1900
  load_assignment:
    cluster_name: backend_service
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: backend1.example.com
              port_value: 9090
      - endpoint:
          address:
            socket_address:
              address: backend2.example.com
              port_value: 9090
      - endpoint:
          address:
            socket_address:
              address: backend3.example.com
              port_value: 9090
```

This tells Envoy to:

- Eject a host after 5 consecutive 5xx errors
- Check host health every 10 seconds
- Keep ejected hosts out for at least 30 seconds
- Never eject more than 50% of the hosts (so you always have capacity)

## Setting Up Priority-Based Routing

Route high-priority traffic separately so it gets its own circuit breaker thresholds:

```yaml
routes:
- match:
    prefix: "/critical"
  route:
    cluster: backend_service
    priority: HIGH
- match:
    prefix: "/"
  route:
    cluster: backend_service
    priority: DEFAULT
```

## Connection Pool Settings

Fine-tune the connection pool alongside circuit breaking:

```yaml
clusters:
- name: backend_service
  connect_timeout: 5s
  type: STRICT_DNS
  circuit_breakers:
    thresholds:
    - priority: DEFAULT
      max_connections: 100
      max_pending_requests: 50
      max_requests: 200
  common_http_protocol_options:
    idle_timeout: 300s
  http_protocol_options:
    max_headers_count: 100
  upstream_connection_options:
    tcp_keepalive:
      keepalive_probes: 3
      keepalive_time: 60
      keepalive_interval: 10
```

## Testing Circuit Breaking

Start a backend service that you can control:

```bash
# Run a simple Python HTTP server as a backend
python3 -m http.server 9090 &
```

Start Envoy with the circuit breaker configuration:

```bash
# Start Envoy
envoy -c envoy-circuit-breaker.yaml --log-level info
```

Use a load testing tool to trigger the circuit breaker:

```bash
# Install hey for load testing
sudo dnf install -y golang
go install github.com/rakyll/hey@latest
```

```bash
# Send 500 concurrent requests to trigger the circuit breaker
~/go/bin/hey -n 1000 -c 500 http://localhost:8080/
```

Check Envoy stats for circuit breaker activity:

```bash
# View circuit breaker stats
curl -s http://localhost:8001/stats | grep circuit
```

You will see counters like:

- `cluster.backend_service.circuit_breakers.default.cx_open` - whether the connection circuit breaker is open
- `cluster.backend_service.circuit_breakers.default.rq_pending_open` - whether the pending request circuit breaker is open
- `cluster.backend_service.upstream_rq_pending_overflow` - requests rejected due to pending request limit

## Monitoring Circuit Breaker Health

Set up monitoring to alert when circuit breakers trip:

```bash
# Check if any circuit breaker is currently open
curl -s http://localhost:8001/stats | grep "cx_open\|rq_open\|rq_pending_open"
```

```bash
# View outlier detection ejection stats
curl -s http://localhost:8001/stats | grep "outlier_detection"
```

Key metrics to track:

- `upstream_rq_pending_overflow` - indicates the pending request limit was hit
- `upstream_cx_overflow` - indicates the connection limit was hit
- `outlier_detection.ejections_active` - number of currently ejected hosts

## Conclusion

Circuit breaking in Envoy on RHEL protects your services from cascading failures by limiting connections, pending requests, and concurrent requests to upstream clusters. Combined with outlier detection, it gives you automatic recovery when backends become unhealthy, keeping the rest of your system responsive even when individual services struggle.
