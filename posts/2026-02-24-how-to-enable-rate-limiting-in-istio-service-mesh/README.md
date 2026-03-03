# How to Enable Rate Limiting in Istio Service Mesh

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rate Limiting, Service Mesh, Envoy, Kubernetes

Description: A practical guide to enabling and configuring rate limiting in Istio service mesh to protect your services from traffic overload.

---

Rate limiting is one of those things everyone knows they need but keeps putting off until something breaks. A single misbehaving client or an unexpected traffic spike can bring down your entire service. Istio gives you two ways to handle rate limiting: local rate limiting (per-proxy) and global rate limiting (using a centralized rate limit service). This guide covers how to get started with both approaches.

## Why Rate Limiting Matters in a Service Mesh

Without rate limiting, any client can send as many requests as they want to your services. In a microservices architecture, this is especially dangerous because one overloaded service can cascade failures to everything that depends on it. Rate limiting protects your services by capping the number of requests a client can make within a time window.

Istio handles rate limiting at the Envoy proxy level, which means your application code does not need to know anything about it. The proxy enforces the limits before the request even reaches your application.

## Local vs Global Rate Limiting

Before we get into the details, it helps to understand the two approaches:

**Local rate limiting** runs entirely within each Envoy proxy instance. Each proxy maintains its own counters. If you have 5 replicas of a service, each one enforces the limit independently. A limit of 100 requests per second actually means 500 requests per second across all replicas.

**Global rate limiting** uses a centralized rate limit service that all proxies talk to. Every proxy checks with the central service before allowing a request through. A limit of 100 requests per second means exactly 100 requests per second, regardless of how many replicas you have.

## Enabling Local Rate Limiting

Local rate limiting is simpler to set up because it does not require any external service. You configure it using an EnvoyFilter resource:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: local-rate-limit
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-service
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
```

This limits each proxy instance to 100 requests per 60 seconds. When the limit is hit, the proxy returns a 429 (Too Many Requests) response.

## Enabling Global Rate Limiting

Global rate limiting requires deploying a rate limit service. The most common choice is the Envoy rate limit service (ratelimit), which uses Redis as its backend.

First, deploy Redis:

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
    targetPort: 6379
```

Next, create the rate limit configuration as a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: rate-limit
data:
  config.yaml: |
    domain: my-ratelimit
    descriptors:
    - key: PATH
      rate_limit:
        unit: minute
        requests_per_unit: 100
```

Then deploy the rate limit service itself:

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
        - containerPort: 6070
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
    targetPort: 8080
  - name: grpc
    port: 8081
    targetPort: 8081
```

## Connecting Istio to the Global Rate Limit Service

Now you need to tell Envoy to check with the rate limit service. This takes two EnvoyFilter resources. First, define the rate limit cluster:

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
        service: ratelimit.rate-limit.svc.cluster.local
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
                    address: ratelimit.rate-limit.svc.cluster.local
                    port_value: 8081
        typed_extension_protocol_options:
          envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
            "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
            explicit_http_config:
              http2_protocol_options: {}
```

Second, add the rate limit filter to the HTTP filter chain:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: rate-limit-filter
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      app: my-service
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
          domain: my-ratelimit
          failure_mode_deny: true
          timeout: 10s
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: rate_limit_cluster
            transport_api_version: V3
```

## Testing Your Rate Limits

Once everything is deployed, test that rate limiting is working:

```bash
# Send a burst of requests
for i in $(seq 1 150); do
  curl -s -o /dev/null -w "%{http_code}\n" http://my-service.default.svc.cluster.local:8080/api/test
done
```

After 100 requests, you should start seeing 429 status codes.

## Checking Rate Limit Headers

When a request is rate limited, the response includes standard headers:

```text
HTTP/1.1 429 Too Many Requests
x-ratelimit-limit: 100
x-ratelimit-remaining: 0
x-ratelimit-reset: 45
```

These headers tell the client how many requests are allowed, how many are remaining, and when the window resets.

## Monitoring Rate Limit Metrics

Both local and global rate limiting generate Envoy metrics. For local rate limiting:

```bash
kubectl exec my-service-pod -c istio-proxy -- \
  curl -s localhost:15000/stats | grep local_rate_limiter
```

For global rate limiting:

```bash
kubectl exec my-service-pod -c istio-proxy -- \
  curl -s localhost:15000/stats | grep ratelimit
```

## Summary

Enabling rate limiting in Istio requires choosing between local and global approaches based on your needs. Local rate limiting is simple and self-contained but imprecise with multiple replicas. Global rate limiting is accurate but requires deploying and maintaining a separate rate limit service with Redis. For most production systems, global rate limiting is worth the extra complexity because it gives you precise control over how much traffic your services receive. Start with local rate limiting to get basic protection in place, then graduate to global rate limiting as your needs mature.
