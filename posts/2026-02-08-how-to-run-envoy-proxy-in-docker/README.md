# How to Run Envoy Proxy in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Envoy Proxy, Service Mesh, Load Balancing, DevOps, Microservices

Description: Deploy Envoy Proxy in Docker with load balancing, traffic routing, rate limiting, and observability for microservices

---

Envoy is a high-performance edge and service proxy originally built at Lyft. It handles load balancing, traffic routing, observability, and resilience features like circuit breaking and retries. Envoy is the data plane behind service mesh implementations like Istio. Running Envoy in Docker lets you add a powerful L4/L7 proxy in front of your services without complex installations.

## Why Envoy?

Nginx and HAProxy handle basic proxying well, but Envoy was built from the start for modern microservice architectures. It provides dynamic configuration through xDS APIs (no restarts needed), first-class observability with distributed tracing and rich metrics, and advanced traffic management features like weighted routing, fault injection, and outlier detection.

If you are building microservices and need more than basic load balancing, Envoy is worth the learning curve.

## Quick Start

Run Envoy with a basic static configuration.

```bash
# Create the config directory
mkdir -p envoy-config
```

Write a minimal Envoy configuration.

```yaml
# envoy-config/envoy.yaml
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
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: backend_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: backend
                      port_value: 3000

admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901
```

Run Envoy.

```bash
docker run -d \
  --name envoy \
  -p 8080:8080 \
  -p 9901:9901 \
  -v $(pwd)/envoy-config/envoy.yaml:/etc/envoy/envoy.yaml:ro \
  envoyproxy/envoy:v1.30-latest
```

Access the admin dashboard at `http://localhost:9901`.

## Docker Compose with Backend Services

A complete setup with Envoy proxying to multiple backend services.

```yaml
# docker-compose.yml
version: "3.8"

services:
  envoy:
    image: envoyproxy/envoy:v1.30-latest
    container_name: envoy
    ports:
      - "8080:8080"    # Application traffic
      - "9901:9901"    # Admin interface
    volumes:
      - ./envoy-config/envoy.yaml:/etc/envoy/envoy.yaml:ro
    depends_on:
      - api-v1
      - api-v2
    networks:
      - mesh

  api-v1:
    image: nginx:alpine
    container_name: api-v1
    volumes:
      - ./api-v1/index.html:/usr/share/nginx/html/index.html:ro
    networks:
      - mesh

  api-v2:
    image: nginx:alpine
    container_name: api-v2
    volumes:
      - ./api-v2/index.html:/usr/share/nginx/html/index.html:ro
    networks:
      - mesh

networks:
  mesh:
    driver: bridge
```

Create simple backend responses.

```bash
mkdir -p api-v1 api-v2
echo '{"version": "v1", "message": "Response from API v1"}' > api-v1/index.html
echo '{"version": "v2", "message": "Response from API v2"}' > api-v2/index.html
```

## Load Balancing Configuration

Configure Envoy to load balance across multiple instances of a service.

```yaml
# envoy-config/envoy-lb.yaml
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
                            cluster: backend_cluster
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
    - name: backend_cluster
      connect_timeout: 5s
      type: STRICT_DNS
      # Load balancing policy: ROUND_ROBIN, LEAST_REQUEST, RANDOM, RING_HASH
      lb_policy: LEAST_REQUEST
      health_checks:
        - timeout: 2s
          interval: 10s
          unhealthy_threshold: 3
          healthy_threshold: 2
          http_health_check:
            path: "/health"
      load_assignment:
        cluster_name: backend_cluster
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: api-v1
                      port_value: 80
              - endpoint:
                  address:
                    socket_address:
                      address: api-v2
                      port_value: 80

admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901
```

## Weighted Traffic Splitting (Canary Deployments)

Route a percentage of traffic to different service versions.

```yaml
# Route configuration for canary deployment
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
                # Send 90% of traffic to v1
                - name: api_v1
                  weight: 90
                # Send 10% to the canary (v2)
                - name: api_v2
                  weight: 10
```

## Rate Limiting

Add local rate limiting to protect backend services.

```yaml
# Add rate limiting to the HTTP connection manager
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

## Circuit Breaking

Prevent cascading failures by limiting connections and requests to upstream services.

```yaml
clusters:
  - name: backend_cluster
    connect_timeout: 5s
    type: STRICT_DNS
    lb_policy: ROUND_ROBIN
    # Circuit breaker settings
    circuit_breakers:
      thresholds:
        - priority: DEFAULT
          max_connections: 100
          max_pending_requests: 50
          max_requests: 200
          max_retries: 3
    # Outlier detection removes unhealthy hosts
    outlier_detection:
      consecutive_5xx: 5
      interval: 10s
      base_ejection_time: 30s
      max_ejection_percent: 50
    load_assignment:
      cluster_name: backend_cluster
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: backend
                    port_value: 3000
```

## Retry Policy

Configure automatic retries for failed requests.

```yaml
routes:
  - match:
      prefix: "/api"
    route:
      cluster: backend_cluster
      timeout: 15s
      retry_policy:
        retry_on: "5xx,connect-failure,reset"
        num_retries: 3
        per_try_timeout: 5s
        retry_back_off:
          base_interval: 0.25s
          max_interval: 1s
```

## Observability

Envoy exposes rich metrics, tracing, and access logs.

```bash
# View all stats
curl http://localhost:9901/stats

# View cluster health
curl http://localhost:9901/clusters

# View server info
curl http://localhost:9901/server_info

# Reset stats
curl -X POST http://localhost:9901/reset_counters
```

Check specific metrics.

```bash
# Request counts and latency per cluster
curl -s http://localhost:9901/stats | grep "backend_cluster"

# Connection pool stats
curl -s http://localhost:9901/stats | grep "upstream_cx"

# HTTP response code breakdown
curl -s http://localhost:9901/stats | grep "downstream_rq"
```

## Access Logging

Add JSON access logs for structured log analysis.

```yaml
# Add to the http_connection_manager
access_log:
  - name: envoy.access_loggers.stdout
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.access_loggers.stream.v3.StdoutAccessLog
      log_format:
        json_format:
          timestamp: "%START_TIME%"
          method: "%REQ(:METHOD)%"
          path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
          status: "%RESPONSE_CODE%"
          duration_ms: "%DURATION%"
          upstream_host: "%UPSTREAM_HOST%"
          bytes_sent: "%BYTES_SENT%"
          user_agent: "%REQ(USER-AGENT)%"
```

## Validating Configuration

Always validate your configuration before deploying.

```bash
# Validate the Envoy config file
docker run --rm \
  -v $(pwd)/envoy-config/envoy.yaml:/etc/envoy/envoy.yaml:ro \
  envoyproxy/envoy:v1.30-latest \
  envoy --mode validate -c /etc/envoy/envoy.yaml
```

## Summary

Envoy Proxy in Docker provides a powerful L4/L7 proxy for microservice architectures. It handles load balancing with health checks, weighted traffic splitting for canary deployments, circuit breaking for resilience, and rate limiting for protection. The admin interface gives you deep visibility into traffic patterns and cluster health. Start with a static configuration file, validate it, and mount it into the Envoy container. For dynamic environments, explore the xDS APIs to update routing without restarts. Envoy's learning curve is steeper than Nginx, but the observability and traffic management capabilities justify the investment for microservice deployments.
