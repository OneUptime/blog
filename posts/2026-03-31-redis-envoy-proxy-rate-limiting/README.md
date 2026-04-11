# How to Use Redis with Envoy Proxy for Rate Limiting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Envoy, Rate Limiting

Description: Learn how to integrate Redis with Envoy Proxy's global rate limiting service to enforce per-user and per-IP request quotas across distributed service instances.

---

Envoy's local rate limiting applies limits per instance, which breaks down in a multi-replica deployment. To enforce global rate limits consistently, Envoy delegates rate limit decisions to an external Rate Limit Service (RLS). Redis is the standard backing store for the reference RLS implementation.

## How Envoy Global Rate Limiting Works

1. Envoy intercepts each request
2. It sends a rate limit check RPC to the external RLS
3. The RLS consults Redis to check and increment counters
4. RLS returns OVER_LIMIT or OK
5. Envoy allows or rejects the request

## Setting Up Redis

```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

## Deploy the Envoy Rate Limit Service

The official `envoyproxy/ratelimit` service uses Redis as its store:

```bash
docker run -d \
  --name ratelimit \
  -e REDIS_SOCKET_TYPE=tcp \
  -e REDIS_URL=redis:6379 \
  -e USE_STATSD=false \
  -e LOG_LEVEL=debug \
  -e RUNTIME_ROOT=/data \
  -e RUNTIME_SUBDIRECTORY=ratelimit \
  -p 8081:8081 \
  -v $(pwd)/ratelimit-config:/data/ratelimit/config \
  envoyproxy/ratelimit:latest
```

## Rate Limit Configuration File

Create `ratelimit-config/config.yaml`:

```text
domain: api_limits
descriptors:
  - key: user_id
    rate_limit:
      unit: minute
      requests_per_unit: 100
  - key: remote_address
    rate_limit:
      unit: second
      requests_per_unit: 10
```

## Envoy Configuration

Configure the rate limit filter and cluster in `envoy.yaml`:

```text
http_filters:
  - name: envoy.filters.http.ratelimit
    typed_config:
      "@type": type.googleapis.com/envoy.extensions.filters.http.ratelimit.v3.RateLimit
      domain: api_limits
      request_type: external
      failure_mode_deny: false
      rate_limit_service:
        grpc_service:
          envoy_grpc:
            cluster_name: rate_limit_cluster
        transport_api_version: V3

clusters:
  - name: rate_limit_cluster
    type: STRICT_DNS
    connect_timeout: 1s
    lb_policy: ROUND_ROBIN
    typed_extension_protocol_options:
      envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
        "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
        explicit_http_version_config:
          http2_protocol_options: {}
    load_assignment:
      cluster_name: rate_limit_cluster
      endpoints:
        - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: ratelimit
                    port_value: 8081
```

## Testing the Rate Limit

Use a loop to trigger rate limiting:

```bash
for i in $(seq 1 15); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "x-user-id: user123" \
    http://localhost:10000/api/resource
done
```

After the limit is reached, requests return HTTP 429.

## Inspect Redis Counters

```bash
redis-cli keys "*api_limits*"
redis-cli get "api_limits_user_id_user123_1706054400"
```

The keys use a composite of domain, descriptor, and time window bucket.

## Summary

Redis provides the shared counter store that makes Envoy's global rate limiting work across multiple proxy instances. The Envoy RLS service handles the gRPC interface between Envoy and Redis, letting you define per-user or per-IP quotas in a central config file. This pattern scales horizontally since all Envoy replicas consult the same Redis-backed RLS.
