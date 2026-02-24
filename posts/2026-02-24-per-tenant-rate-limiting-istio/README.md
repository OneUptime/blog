# How to Configure Per-Tenant Rate Limiting in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rate Limiting, Multi-Tenancy, Envoy, Service Mesh

Description: Step-by-step guide to configuring per-tenant rate limiting in Istio using EnvoyFilter and external rate limiting services for fair resource sharing.

---

Rate limiting is one of those features that every multi-tenant system needs but nobody enjoys configuring. When you have multiple tenants sharing the same set of services, you need to make sure one noisy tenant cannot consume all available capacity and starve everyone else. Istio gives you a few different ways to implement per-tenant rate limiting, ranging from simple local rate limits to full-blown external rate limiting services.

## Local Rate Limiting with EnvoyFilter

The simplest approach is local rate limiting, which runs entirely within the Envoy proxy. No external services needed. The downside is that limits are per-pod, not global, so if a service has 5 replicas with a limit of 100 requests/minute each, the effective limit is 500 requests/minute total.

Here is an EnvoyFilter that applies a local rate limit based on a tenant header:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: tenant-local-ratelimit
  namespace: istio-system
spec:
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
        name: envoy.filters.http.local_ratelimit
        typed_config:
          "@type": type.googleapis.com/udpa.type.v1.TypedStruct
          type_url: type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
          value:
            stat_prefix: http_local_rate_limiter
            token_bucket:
              max_tokens: 1000
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
```

This applies a blanket rate limit to all inbound traffic. But it does not differentiate between tenants yet.

## Adding Per-Tenant Descriptors

To rate limit differently per tenant, you need to extract the tenant identity and use it as a rate limit descriptor. If tenants are identified by namespace (which is the case in namespace-based multi-tenancy), the source namespace is already available in mTLS metadata.

For header-based tenant identification, you can use route-level rate limit actions:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: tenant-rate-limit-actions
  namespace: shared-services
spec:
  workloadSelector:
    labels:
      app: shared-api
  configPatches:
  - applyTo: VIRTUAL_HOST
    match:
      context: SIDECAR_INBOUND
    patch:
      operation: MERGE
      value:
        rate_limits:
        - actions:
          - request_headers:
              header_name: x-tenant-id
              descriptor_key: tenant
```

This extracts the `x-tenant-id` header and uses it as a rate limit descriptor. But for this to actually enforce limits, you need an external rate limiting service.

## Setting Up an External Rate Limit Service

For global rate limiting (across all pods), you need to deploy an external rate limit service. The most common choice is Envoy's reference rate limit service.

Deploy the rate limit service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ratelimit
  namespace: istio-system
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
        image: envoyproxy/ratelimit:latest
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 8081
          name: grpc
        env:
        - name: RUNTIME_ROOT
          value: /data
        - name: RUNTIME_SUBDIRECTORY
          value: ratelimit
        - name: LOG_LEVEL
          value: debug
        - name: REDIS_SOCKET_TYPE
          value: tcp
        - name: REDIS_URL
          value: redis.istio-system:6379
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
  namespace: istio-system
spec:
  ports:
  - name: http
    port: 8080
  - name: grpc
    port: 8081
  selector:
    app: ratelimit
```

You also need a Redis instance for the rate limit service to store counters:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: istio-system
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
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: istio-system
spec:
  ports:
  - port: 6379
  selector:
    app: redis
```

## Configuring Per-Tenant Limits

Now configure the actual rate limits per tenant using a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: istio-system
data:
  config.yaml: |
    domain: production
    descriptors:
    - key: tenant
      value: tenant-a
      rate_limit:
        unit: minute
        requests_per_unit: 1000
    - key: tenant
      value: tenant-b
      rate_limit:
        unit: minute
        requests_per_unit: 500
    - key: tenant
      value: tenant-c
      rate_limit:
        unit: minute
        requests_per_unit: 2000
    - key: tenant
      rate_limit:
        unit: minute
        requests_per_unit: 100
```

The last entry without a `value` is the default. Any tenant not explicitly listed gets 100 requests per minute. This is a safety net for unknown or new tenants.

## Connecting Envoy to the Rate Limit Service

Use an EnvoyFilter to configure the Envoy proxies to talk to the external rate limit service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: rate-limit-cluster
  namespace: istio-system
spec:
  configPatches:
  - applyTo: CLUSTER
    match:
      cluster:
        service: ratelimit.istio-system.svc.cluster.local
    patch:
      operation: ADD
      value:
        name: rate_limit_cluster
        type: STRICT_DNS
        connect_timeout: 10s
        lb_policy: ROUND_ROBIN
        load_assignment:
          cluster_name: rate_limit_cluster
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: ratelimit.istio-system.svc.cluster.local
                    port_value: 8081
        typed_extension_protocol_options:
          envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
            "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
            explicit_http_config:
              http2_protocol_options: {}
```

Then add the rate limit filter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: rate-limit-filter
  namespace: istio-system
spec:
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
          domain: production
          failure_mode_deny: false
          timeout: 5s
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: rate_limit_cluster
            transport_api_version: V3
```

Setting `failure_mode_deny: false` means that if the rate limit service is down, requests are allowed through. In production, you might want to set this to `true` depending on your risk tolerance.

## Testing the Rate Limits

Hit the service rapidly from a tenant namespace and verify that rate limiting kicks in:

```bash
# Send 200 requests quickly from tenant-a
for i in $(seq 1 200); do
  kubectl exec -n tenant-a deploy/sleep -- \
    curl -s -o /dev/null -w "%{http_code}\n" \
    -H "x-tenant-id: tenant-a" \
    http://shared-api.shared-services:8080/endpoint
done | sort | uniq -c
```

You should see mostly `200` responses, and then `429` responses once the rate limit is exceeded.

## Monitoring Rate Limit Metrics

The rate limit service exposes metrics that you can scrape with Prometheus:

```bash
kubectl port-forward -n istio-system svc/ratelimit 8080:8080
curl http://localhost:8080/stats
```

You can also monitor rate limiting from the Envoy side by looking at the `envoy_http_local_rate_limit_*` and `envoy_ratelimit_*` stats:

```bash
istioctl proxy-config stats deploy/shared-api -n shared-services | grep rate
```

## Considerations and Trade-offs

Local rate limiting is easy to set up but does not give you true global limits. External rate limiting gives you global limits but adds latency (one more network call per request) and a dependency on Redis.

For most multi-tenant setups, external rate limiting is worth the complexity because you need accurate per-tenant accounting across all replicas. If approximate limits are acceptable, local rate limiting with some math (divide the desired global limit by the number of replicas) can work well enough.

One thing to keep in mind is that rate limit configuration changes require either a ConfigMap update (for the external service) or an EnvoyFilter update (for local limits). Neither of these is dynamic in real-time, so plan for a short propagation delay when adjusting limits.

Per-tenant rate limiting is a cornerstone of fair multi-tenant systems. Without it, a single tenant's traffic spike can degrade the experience for everyone else. Whether you go with local or external rate limiting depends on your accuracy requirements, but either way, get something in place before you onboard your second tenant.
