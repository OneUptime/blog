# How to Configure Rate Limiting with Envoy on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Envoy, Rate Limiting, Proxy, Service Mesh, Linux

Description: Learn how to configure local and global rate limiting with Envoy proxy on RHEL, including token bucket configuration, descriptor-based rules, and integration with external rate limit services.

---

Rate limiting is essential for protecting your backend services from being overwhelmed by traffic spikes, misbehaving clients, or denial-of-service attacks. Envoy proxy provides two approaches to rate limiting: local rate limiting that runs entirely within each Envoy instance, and global rate limiting that uses an external service for coordinated limits across your fleet. This guide covers both on RHEL.

## Prerequisites

You need:

- RHEL with root or sudo access
- Envoy proxy installed (version 1.28 or newer)
- Basic familiarity with Envoy configuration

Install Envoy if you have not already:

```bash
# Install Envoy from the GetEnvoy project
curl -L https://func-e.io/install.sh | bash -s -- -b /usr/local/bin
func-e run --version
```

Alternatively, install from a container image for testing:

```bash
# Pull the Envoy container image
podman pull docker.io/envoyproxy/envoy:v1.29-latest
```

## Understanding Rate Limiting in Envoy

Envoy supports two rate limiting mechanisms:

- **Local rate limiting** - Each Envoy instance enforces limits independently using a token bucket algorithm. Simple to set up but limits are per-instance, not global.
- **Global rate limiting** - Envoy calls an external rate limit service (like Lyft's ratelimit) to make decisions. Limits are shared across all Envoy instances.

## Configuring Local Rate Limiting

Local rate limiting is the simplest approach. Add the `envoy.filters.http.local_ratelimit` filter to your HTTP connection manager:

```yaml
# envoy-local-ratelimit.yaml
static_resources:
  listeners:
  - name: main
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

  clusters:
  - name: backend_service
    connect_timeout: 5s
    type: STRICT_DNS
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

This configuration allows 100 requests per 60-second window per Envoy instance.

## Per-Route Local Rate Limiting

You can apply different rate limits to different routes:

```yaml
virtual_hosts:
- name: backend
  domains: ["*"]
  routes:
  - match:
      prefix: "/api/v1"
    route:
      cluster: api_service
    typed_per_filter_config:
      envoy.filters.http.local_ratelimit:
        "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
        stat_prefix: api_rate_limiter
        token_bucket:
          max_tokens: 50
          tokens_per_fill: 50
          fill_interval: 60s
  - match:
      prefix: "/health"
    route:
      cluster: backend_service
    typed_per_filter_config:
      envoy.filters.http.local_ratelimit:
        "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
        stat_prefix: health_rate_limiter
        token_bucket:
          max_tokens: 1000
          tokens_per_fill: 1000
          fill_interval: 60s
```

## Setting Up Global Rate Limiting

Global rate limiting requires an external rate limit service. First, deploy the reference implementation:

```bash
# Clone the rate limit service
git clone https://github.com/envoyproxy/ratelimit.git
cd ratelimit
```

Create a rate limit configuration:

```bash
# Create the rate limit config directory
mkdir -p /etc/ratelimit/config
```

```yaml
# /etc/ratelimit/config/config.yaml
domain: production
descriptors:
  - key: remote_address
    rate_limit:
      unit: minute
      requests_per_unit: 60
  - key: path
    value: "/api"
    rate_limit:
      unit: second
      requests_per_unit: 10
  - key: header_match
    value: "api_key"
    rate_limit:
      unit: minute
      requests_per_unit: 100
```

Run the rate limit service (requires Redis):

```bash
# Start Redis
sudo dnf install -y redis
sudo systemctl enable --now redis
```

```bash
# Build and run the rate limit service
cd ratelimit
go build -o /usr/local/bin/ratelimit ./src/service_cmd/main.go
```

```bash
# Start the rate limit service
REDIS_SOCKET_TYPE=tcp \
REDIS_URL=127.0.0.1:6379 \
RUNTIME_ROOT=/etc/ratelimit \
RUNTIME_SUBDIRECTORY=config \
LOG_LEVEL=debug \
/usr/local/bin/ratelimit
```

## Configuring Envoy for Global Rate Limiting

Update your Envoy configuration to use the external rate limit service:

```yaml
http_filters:
- name: envoy.filters.http.ratelimit
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.ratelimit.v3.RateLimit
    domain: production
    request_type: external
    stage: 0
    rate_limited_as_resource_exhausted: true
    failure_mode_deny: false
    rate_limit_service:
      grpc_service:
        envoy_grpc:
          cluster_name: rate_limit_cluster
      transport_api_version: V3
- name: envoy.filters.http.router
  typed_config:
    "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

Add rate limit actions to your routes:

```yaml
routes:
- match:
    prefix: "/api"
  route:
    cluster: api_service
    rate_limits:
    - actions:
      - remote_address: {}
    - actions:
      - request_headers:
          header_name: ":path"
          descriptor_key: "path"
```

Add the rate limit cluster:

```yaml
clusters:
- name: rate_limit_cluster
  type: STRICT_DNS
  connect_timeout: 1s
  http2_protocol_options: {}
  load_assignment:
    cluster_name: rate_limit_cluster
    endpoints:
    - lb_endpoints:
      - endpoint:
          address:
            socket_address:
              address: 127.0.0.1
              port_value: 8081
```

## Testing Rate Limits

Send requests rapidly to verify rate limiting is working:

```bash
# Send 150 requests quickly and count status codes
for i in $(seq 1 150); do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/test
done | sort | uniq -c
```

You should see a mix of 200 and 429 responses once the limit is exceeded.

## Monitoring Rate Limit Metrics

Envoy exposes rate limiting metrics at the stats endpoint:

```bash
# Check rate limiting stats
curl -s http://localhost:8001/stats | grep ratelimit
```

Key metrics include:

- `http.ingress_http.http_local_rate_limiter.ok` - requests that passed the limit
- `http.ingress_http.http_local_rate_limiter.rate_limited` - requests that were rejected
- `ratelimit.production.over_limit` - global rate limit rejections

## Conclusion

Envoy provides flexible rate limiting on RHEL through both local per-instance token buckets and global coordinated limits via an external service. Local rate limiting is quick to set up for single-instance deployments, while global rate limiting with the reference ratelimit service gives you consistent limits across your entire fleet.
