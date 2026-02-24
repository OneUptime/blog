# How to Set Up Request Quotas in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Request Quotas, Rate Limiting, Envoy, Kubernetes

Description: Learn how to implement request quotas in Istio to control API usage and enforce fair resource allocation across clients.

---

Request quotas are different from simple rate limiting. While rate limiting caps the number of requests per time window, quotas give you a budget that gets consumed as requests are made. Think of it like a prepaid phone plan - you get a certain number of calls per month, and once you use them up, you are done. Quotas are especially useful for API management where different clients get different allocation levels.

## Quotas vs Rate Limiting

The distinction matters. Rate limiting says "no more than 100 requests per minute." A quota says "you get 10,000 requests this month." Rate limiting smooths out traffic bursts. Quotas manage long-term resource allocation.

In Istio, you implement quotas through a combination of the Envoy rate limit service (for centralized tracking) and descriptors that identify the quota owner. The underlying mechanism is the same global rate limit service, but the configuration reflects longer time windows and client-specific budgets.

## Setting Up the Quota Infrastructure

You need the same infrastructure as global rate limiting: Redis and the rate limit service. If you already have these deployed, you can skip ahead to the quota configuration.

Deploy Redis:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: rate-limit
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        command: ["redis-server", "--save", "60", "1"]
        volumeMounts:
        - name: redis-data
          mountPath: /data
      volumes:
      - name: redis-data
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: rate-limit
spec:
  selector:
    app: redis
  ports:
  - port: 6379
```

Note the `--save 60 1` flag. For quotas with longer time windows, you want Redis persistence so counters survive restarts.

## Defining Quota Rules

Create quota configurations based on client API keys. The rate limit service config uses the same format, just with longer time windows:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: rate-limit
data:
  config.yaml: |
    domain: api-quotas
    descriptors:
    # Free tier: 1000 requests per day
    - key: api_tier
      value: free
      rate_limit:
        unit: day
        requests_per_unit: 1000

    # Basic tier: 10000 requests per day
    - key: api_tier
      value: basic
      rate_limit:
        unit: day
        requests_per_unit: 10000

    # Premium tier: 100000 requests per day
    - key: api_tier
      value: premium
      rate_limit:
        unit: day
        requests_per_unit: 100000

    # Default for unrecognized clients
    - key: api_tier
      rate_limit:
        unit: day
        requests_per_unit: 500
```

## Deploying the Rate Limit Service for Quotas

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ratelimit
  namespace: rate-limit
spec:
  replicas: 2
  selector:
    matchLabels:
      app: ratelimit
  template:
    metadata:
      labels:
        app: ratelimit
    spec:
      containers:
      - name: ratelimit
        image: envoyproxy/ratelimit:master
        ports:
        - containerPort: 8080
        - containerPort: 8081
        env:
        - name: RUNTIME_ROOT
          value: /data
        - name: RUNTIME_SUBDIRECTORY
          value: ratelimit
        - name: LOG_LEVEL
          value: info
        - name: REDIS_SOCKET_TYPE
          value: tcp
        - name: REDIS_URL
          value: redis.rate-limit.svc.cluster.local:6379
        - name: USE_STATSD
          value: "false"
        volumeMounts:
        - name: config
          mountPath: /data/ratelimit/config
      volumes:
      - name: config
        configMap:
          name: ratelimit-config
---
apiVersion: v1
kind: Service
metadata:
  name: ratelimit
  namespace: rate-limit
spec:
  selector:
    app: ratelimit
  ports:
  - name: http
    port: 8080
  - name: grpc
    port: 8081
```

## Configuring Envoy to Send Quota Descriptors

Now you need EnvoyFilters that extract the API tier from the request and send it to the rate limit service. The tier is typically determined from an API key header or JWT claim.

First, set up the rate limit cluster:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: quota-cluster
  namespace: istio-system
spec:
  configPatches:
  - applyTo: CLUSTER
    patch:
      operation: ADD
      value:
        name: quota_service_cluster
        type: STRICT_DNS
        connect_timeout: 10s
        lb_policy: ROUND_ROBIN
        load_assignment:
          cluster_name: quota_service_cluster
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: ratelimit.rate-limit.svc.cluster.local
                    port_value: 8081
        typed_extension_protocol_options:
          envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
            "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
            explicit_http_config:
              http2_protocol_options: {}
```

Then add the rate limit filter with descriptor actions that extract the tier:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: quota-filter
  namespace: default
spec:
  workloadSelector:
    labels:
      app: api-gateway
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
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
          domain: api-quotas
          failure_mode_deny: false
          timeout: 5s
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: quota_service_cluster
            transport_api_version: V3
          enable_x_ratelimit_headers: DRAFT_VERSION_03
  - applyTo: VIRTUAL_HOST
    match:
      context: SIDECAR_INBOUND
    patch:
      operation: MERGE
      value:
        rate_limits:
        - actions:
          - request_headers:
              header_name: "x-api-tier"
              descriptor_key: api_tier
```

The `enable_x_ratelimit_headers` setting adds standard rate limit headers to responses so clients can see their quota usage.

## Mapping API Keys to Tiers

Your application needs a way to translate API keys into tier levels. One approach is to use a Lua filter or Wasm plugin that looks up the API key and sets a header:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: api-key-resolver
  namespace: default
spec:
  workloadSelector:
    labels:
      app: api-gateway
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
            subFilter:
              name: envoy.filters.http.router
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.lua
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
          inline_code: |
            -- Simple mapping of API keys to tiers
            local tier_map = {
              ["key-abc123"] = "premium",
              ["key-def456"] = "basic",
              ["key-ghi789"] = "free"
            }

            function envoy_on_request(request_handle)
              local api_key = request_handle:headers():get("x-api-key")
              if api_key then
                local tier = tier_map[api_key] or "free"
                request_handle:headers():add("x-api-tier", tier)
              else
                request_handle:headers():add("x-api-tier", "free")
              end
            end
```

In production, you would replace the hardcoded map with a lookup to a database or cache.

## Testing Quota Enforcement

Test with different API keys:

```bash
# Free tier - should be limited to 1000/day
for i in $(seq 1 20); do
  curl -s -o /dev/null -w "%{http_code} " \
    -H "x-api-key: key-ghi789" \
    http://api-gateway.default:8080/api/data
done
echo ""

# Premium tier - much higher limit
for i in $(seq 1 20); do
  curl -s -o /dev/null -w "%{http_code} " \
    -H "x-api-key: key-abc123" \
    http://api-gateway.default:8080/api/data
done
echo ""
```

Check the response headers to see quota information:

```bash
curl -v -H "x-api-key: key-ghi789" http://api-gateway.default:8080/api/data
```

You should see headers like:

```
x-ratelimit-limit: 1000
x-ratelimit-remaining: 985
x-ratelimit-reset: 3600
```

## Monitoring Quota Usage

Track quota usage through Envoy metrics:

```bash
kubectl exec api-gateway-pod -c istio-proxy -- \
  curl -s localhost:15000/stats | grep ratelimit
```

You can also query Redis directly to see current counters:

```bash
kubectl exec -n rate-limit redis-pod -- redis-cli keys "*"
kubectl exec -n rate-limit redis-pod -- redis-cli get "api-quotas_api_tier_free_1234567890"
```

## Handling Quota Exhaustion Gracefully

When a client runs out of quota, return helpful information. The rate limit headers tell them the limit, remaining requests, and when the window resets. Your API documentation should explain what the different tiers offer and how to upgrade.

Consider also providing a quota check endpoint that does not consume quota:

```yaml
# In your rate limit config, exclude the quota check path
descriptors:
- key: api_tier
  value: free
  rate_limit:
    unit: day
    requests_per_unit: 1000
  descriptors:
  - key: PATH
    value: "/api/quota-status"
    rate_limit:
      unit: day
      requests_per_unit: 100000
```

## Summary

Request quotas in Istio build on top of the global rate limiting infrastructure. The same Redis and rate limit service handle both, but quotas use longer time windows and client-specific budgets. Extract the client identifier (API key, user ID, tier level) from the request using Lua filters or Wasm plugins, pass it as a descriptor to the rate limit service, and configure your quota rules in the rate limit service config. Monitor usage through both Envoy metrics and direct Redis queries to keep track of how your clients are consuming their allocations.
