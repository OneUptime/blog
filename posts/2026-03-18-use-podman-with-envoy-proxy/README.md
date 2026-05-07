# How to Use Podman with Envoy Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Envoy Proxy, Load Balancing, Service Mesh, Networking

Description: Learn how to deploy Envoy Proxy in Podman containers to provide advanced load balancing, traffic management, and observability for your containerized services.

---

> Envoy Proxy running in Podman containers gives your containerized services enterprise-grade load balancing, traffic routing, circuit breaking, and deep observability without modifying application code.

Envoy is a high-performance proxy designed for cloud-native applications. Originally built at Lyft, it has become the foundation for many service mesh implementations. Running Envoy in Podman containers provides your services with sophisticated traffic management including load balancing, circuit breaking, retries, rate limiting, and comprehensive metrics. Unlike application-level solutions, Envoy operates at the network layer, meaning you get these capabilities without changing your application code.

---

## Deploying Envoy as a Reverse Proxy

Start with a basic Envoy configuration as a reverse proxy:

```bash
mkdir -p ~/envoy/config
podman network create app-net
```

```yaml
# ~/envoy/config/envoy.yaml

static_resources:
  listeners:
    - name: listener_0
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
                            prefix: "/api"
                          route:
                            cluster: api_service
                        - match:
                            prefix: "/"
                          route:
                            cluster: web_service
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    - name: api_service
      connect_timeout: 5s
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: api_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: api
                      port_value: 3000

    - name: web_service
      connect_timeout: 5s
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: web_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: web
                      port_value: 8080

admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901
```

Run Envoy:

```bash
podman run -d \
  --name envoy \
  --network app-net \
  --restart always \
  -p 8080:8080 \
  -p 9901:9901 \
  -v ~/envoy/config/envoy.yaml:/etc/envoy/envoy.yaml:ro,Z \
  envoyproxy/envoy:v1.37.2
```

This assumes your backend containers are attached to the same Podman network and are reachable as `api` and `web` via their container names or network aliases.

Access the Envoy admin interface at `http://localhost:9901`.

## Full Application Stack with Envoy

Deploy Envoy as the entry point for a multi-service application:

```yaml
# envoy-stack.yml
version: "3"
services:
  envoy:
    image: envoyproxy/envoy:v1.37.2
    restart: always
    ports:
      - "8080:8080"
      - "9901:9901"
    volumes:
      - ./envoy/config/envoy.yaml:/etc/envoy/envoy.yaml:ro,Z

  api:
    image: myapp-api:latest
    restart: always

  web:
    image: myapp-web:latest
    restart: always

  auth:
    image: myapp-auth:latest
    restart: always
```

## Load Balancing Strategies

Configure different load balancing algorithms:

```yaml
clusters:
  - name: api_service
    connect_timeout: 5s
    type: STRICT_DNS
    # Round Robin (default)
    lb_policy: ROUND_ROBIN
    load_assignment:
      cluster_name: api_service
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: api-1
                    port_value: 3000
            - endpoint:
                address:
                  socket_address:
                    address: api-2
                    port_value: 3000
            - endpoint:
                address:
                  socket_address:
                    address: api-3
                    port_value: 3000

  - name: cache_service
    connect_timeout: 2s
    type: STRICT_DNS
    # Ring Hash for consistent hashing when combined with a route hash_policy
    lb_policy: RING_HASH
    load_assignment:
      cluster_name: cache_service
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: cache-1
                    port_value: 6379
            - endpoint:
                address:
                  socket_address:
                    address: cache-2
                    port_value: 6379

  - name: compute_service
    connect_timeout: 10s
    type: STRICT_DNS
    # Least Request for CPU-intensive services
    lb_policy: LEAST_REQUEST
    load_assignment:
      cluster_name: compute_service
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: compute
                    port_value: 8080
```

For `RING_HASH` to be effective, configure a route `hash_policy` such as a header, cookie, or source IP.

## Circuit Breaking

Protect services from cascading failures:

```yaml
clusters:
  - name: api_service
    connect_timeout: 5s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
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
    load_assignment:
      cluster_name: api_service
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: api
                    port_value: 3000
```

## Rate Limiting

Configure rate limiting to protect your services:

```yaml
http_filters:
  - name: envoy.filters.http.local_ratelimit
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
      stat_prefix: http_local_rate_limiter
      token_bucket:
        max_tokens: 100
        tokens_per_fill: 100
        fill_interval: 60s
      filter_enabled:
        runtime_key: local_rate_limit_enabled
        default_value:
          numerator: 100
          denominator: HUNDRED
      filter_enforced:
        runtime_key: local_rate_limit_enforced
        default_value:
          numerator: 100
          denominator: HUNDRED
      response_headers_to_add:
        - append_action: OVERWRITE_IF_EXISTS_OR_ADD
          header:
            key: x-local-rate-limit
            value: "true"
  - name: envoy.filters.http.router
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

## Traffic Splitting and Canary Deployments

Route traffic between service versions for canary releases:

```yaml
route_config:
  name: local_route
  virtual_hosts:
    - name: api
      domains: ["*"]
      routes:
        - match:
            prefix: "/api"
          route:
            weighted_clusters:
              clusters:
                - name: api_v1
                  weight: 90
                - name: api_v2
                  weight: 10

clusters:
  - name: api_v1
    connect_timeout: 5s
    type: STRICT_DNS
    load_assignment:
      cluster_name: api_v1
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: api-v1
                    port_value: 3000

  - name: api_v2
    connect_timeout: 5s
    type: STRICT_DNS
    load_assignment:
      cluster_name: api_v2
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: api-v2
                    port_value: 3000
```

## Retry and Timeout Policies

Configure intelligent retry behavior:

```yaml
routes:
  - match:
      prefix: "/api"
    route:
      cluster: api_service
      timeout: 15s
      retry_policy:
        retry_on: "5xx,reset,connect-failure,retriable-4xx"
        num_retries: 3
        per_try_timeout: 5s
        retry_back_off:
          base_interval: 0.25s
          max_interval: 1s
```

## Observability

Envoy provides rich metrics, logging, and tracing:

```yaml
# Access logging
typed_config:
  "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
  stat_prefix: ingress_http
  access_log:
    - name: envoy.access_loggers.stdout
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.access_loggers.stream.v3.StdoutAccessLog
        log_format:
          json_format:
            timestamp: "%START_TIME%"
            method: "%REQ(:METHOD)%"
            path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
            protocol: "%PROTOCOL%"
            response_code: "%RESPONSE_CODE%"
            response_time: "%DURATION%"
            upstream_host: "%UPSTREAM_HOST%"
            bytes_sent: "%BYTES_SENT%"
            bytes_received: "%BYTES_RECEIVED%"
  http_filters:
    - name: envoy.filters.http.router
      typed_config:
        "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

Expose metrics for Prometheus:

```yaml
admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901

# Prometheus scrape endpoint is at :9901/stats/prometheus
```

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'envoy'
    metrics_path: /stats/prometheus
    static_configs:
      - targets: ['envoy:9901']
```

Key Envoy metrics to monitor:

```promql
# Request rate
rate(envoy_http_downstream_rq_total[5m])

# Error rate
rate(envoy_http_downstream_rq_xx{envoy_response_code_class="5"}[5m])

# Latency (p99)
histogram_quantile(0.99, rate(envoy_http_downstream_rq_time_bucket[5m]))

# Active connections
envoy_http_downstream_cx_active

# Circuit breaker trips
envoy_cluster_circuit_breakers_default_cx_open
```

## Envoy as a Sidecar Proxy

Run Envoy as a sidecar alongside your application in a pod:

```bash
# Create a pod
podman pod create \
  --name myapp-pod \
  -p 8080:8080 \
  -p 9901:9901

# Run the application
podman run -d \
  --pod myapp-pod \
  --name myapp \
  myapp:latest

# Run Envoy as sidecar
podman run -d \
  --pod myapp-pod \
  --name envoy-sidecar \
  -v ~/envoy/config/sidecar.yaml:/etc/envoy/envoy.yaml:ro,Z \
  envoyproxy/envoy:v1.37.2
```

## Conclusion

Envoy Proxy in Podman containers provides enterprise-grade traffic management for your containerized services. From basic reverse proxying and load balancing to advanced features like circuit breaking, traffic splitting, and rate limiting, Envoy delivers capabilities that would otherwise require significant application-level code. The rich observability built into Envoy, with detailed metrics, access logging, and distributed tracing support, gives you deep insight into your service communication. Whether used as a front proxy, sidecar, or the foundation for a service mesh, Envoy and Podman together create a powerful networking layer for your container infrastructure.
