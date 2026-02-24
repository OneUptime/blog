# How to Configure Rate Limiting per API Key in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rate Limiting, API Key, Envoy, API Management

Description: How to implement per-API-key rate limiting in Istio using Envoy filters and the external rate limit service with Redis backend.

---

API keys are one of the most common ways to identify and control API consumers. Different customers get different rate limits based on their plan or usage agreement. Implementing per-API-key rate limiting in Istio requires the global rate limiting approach since each API key needs to share a counter across all proxy instances. Here is how to set it all up.

## How It Works

The request flow for per-API-key rate limiting:

1. Client sends a request with an API key (usually in a header like `x-api-key`)
2. Envoy extracts the API key from the request header
3. Envoy sends the key as a descriptor to the rate limit service
4. The rate limit service checks the counter for that specific API key in Redis
5. If the counter is under the limit, the request proceeds. Otherwise, 429.

## Prerequisites

You need the global rate limiting infrastructure in place:
- Redis deployed and running
- Envoy rate limit service deployed
- Basic EnvoyFilter for the rate limit cluster configured

If you do not have these yet, deploy them first. The rate limit service and Redis should be in their own namespace.

## Rate Limit Service Configuration

The key piece is the rate limit configuration. You define different limits for different API keys:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: rate-limit
data:
  config.yaml: |
    domain: api-ratelimit
    descriptors:
    - key: api_key
      value: "key-premium-customer-001"
      rate_limit:
        unit: minute
        requests_per_unit: 1000
    - key: api_key
      value: "key-standard-customer-002"
      rate_limit:
        unit: minute
        requests_per_unit: 100
    - key: api_key
      value: "key-free-tier-003"
      rate_limit:
        unit: minute
        requests_per_unit: 10
    - key: api_key
      rate_limit:
        unit: minute
        requests_per_unit: 30
```

The last entry without a specific value acts as a catch-all default for any API key not explicitly listed. This handles the case where a new customer starts using the API before you update the configuration.

Apply the ConfigMap:

```bash
kubectl apply -f ratelimit-config.yaml
# Restart the rate limit service to pick up the new config
kubectl rollout restart deployment/ratelimit -n rate-limit
```

## Configuring Envoy to Extract API Keys

Now configure Envoy to pull the API key from the request header and send it as a descriptor:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ratelimit-filter
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: GATEWAY
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
            subFilter:
              name: envoy.filters.http.router
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.ratelimit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.ratelimit.v3.RateLimit
          domain: api-ratelimit
          failure_mode_deny: false
          timeout: 0.5s
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: rate_limit_cluster
            transport_api_version: V3
  - applyTo: CLUSTER
    match:
      context: GATEWAY
    patch:
      operation: ADD
      value:
        name: rate_limit_cluster
        type: STRICT_DNS
        connect_timeout: 0.5s
        lb_policy: ROUND_ROBIN
        protocol_selection: USE_CONFIGURED_PROTOCOL
        http2_protocol_options: {}
        load_assignment:
          cluster_name: rate_limit_cluster
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: ratelimit.rate-limit.svc.cluster.local
                    port_value: 8081
```

## Setting Up Rate Limit Actions for API Key Header

This is the critical part. The actions tell Envoy which header to extract and how to send it as a descriptor:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ratelimit-actions-apikey
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  - applyTo: VIRTUAL_HOST
    match:
      context: GATEWAY
      routeConfiguration:
        vhost:
          name: ""
          route:
            action: ANY
    patch:
      operation: MERGE
      value:
        rate_limits:
        - actions:
          - request_headers:
              header_name: x-api-key
              descriptor_key: api_key
```

The `request_headers` action tells Envoy to read the `x-api-key` header and use it as the value for the `api_key` descriptor key. This matches the descriptor configuration in the rate limit service.

Apply both EnvoyFilters:

```bash
kubectl apply -f envoyfilter-ratelimit.yaml
kubectl apply -f envoyfilter-actions-apikey.yaml
```

## Handling Missing API Keys

What happens when a request arrives without the `x-api-key` header? By default, Envoy skips the rate limit check entirely for that action, meaning unauthenticated requests are not rate limited.

To handle this, add a second action that catches requests without the API key:

```yaml
rate_limits:
- actions:
  - request_headers:
      header_name: x-api-key
      descriptor_key: api_key
- actions:
  - request_headers:
      header_name: x-api-key
      descriptor_key: api_key
      skip_if_absent: true
  - generic_key:
      descriptor_value: no-api-key
```

And add a matching descriptor in the rate limit config:

```yaml
descriptors:
- key: generic_key
  value: "no-api-key"
  rate_limit:
    unit: minute
    requests_per_unit: 5
```

This gives unauthenticated requests a very low rate limit of 5 per minute.

## Combining API Key with Path-Based Limits

You can get more granular by combining API key with request path:

```yaml
domain: api-ratelimit
descriptors:
- key: api_key
  descriptors:
  - key: path
    value: "/api/v1/search"
    rate_limit:
      unit: minute
      requests_per_unit: 20
  - key: path
    value: "/api/v1/upload"
    rate_limit:
      unit: minute
      requests_per_unit: 5
  - key: path
    rate_limit:
      unit: minute
      requests_per_unit: 100
```

And the corresponding actions:

```yaml
rate_limits:
- actions:
  - request_headers:
      header_name: x-api-key
      descriptor_key: api_key
  - request_headers:
      header_name: ":path"
      descriptor_key: path
```

This gives you per-API-key, per-endpoint rate limits. The search endpoint gets 20 requests per minute per API key, upload gets 5, and everything else gets 100.

## Testing Per-API-Key Rate Limits

Test with different API keys:

```bash
# Premium customer - should allow 1000/min
for i in $(seq 1 50); do
  curl -s -o /dev/null -w "%{http_code} " -H "x-api-key: key-premium-customer-001" http://gateway-ip/api/test
done
echo

# Free tier - should limit at 10/min
for i in $(seq 1 20); do
  curl -s -o /dev/null -w "%{http_code} " -H "x-api-key: key-free-tier-003" http://gateway-ip/api/test
done
echo
```

The premium customer should see all 200s, while the free tier customer should start seeing 429s after the 10th request.

## Dynamically Updating API Key Limits

When you need to add a new customer or change a limit, update the ConfigMap and restart the rate limit service:

```bash
kubectl edit configmap ratelimit-config -n rate-limit
kubectl rollout restart deployment/ratelimit -n rate-limit
```

For more dynamic updates, consider using the rate limit service's file watcher mode by setting `RUNTIME_WATCH_ROOT: "true"`. This watches for ConfigMap changes without needing a restart.

## Checking Redis Counters

To see the actual rate limit counters in Redis:

```bash
kubectl exec -n rate-limit deploy/redis -- redis-cli keys "*api_key*"
```

Each API key will have its own set of counters in Redis, with keys that include the API key value and the current time window.

## Summary

Per-API-key rate limiting in Istio uses the global rate limiting infrastructure (rate limit service + Redis) with Envoy configured to extract the API key from request headers and send it as a descriptor. You define different rate limits for different API keys in the rate limit service configuration, with a catch-all default for unknown keys. This approach scales well because Redis handles the shared counter state, and you can combine API key limits with path-based limits for fine-grained control over each endpoint.
