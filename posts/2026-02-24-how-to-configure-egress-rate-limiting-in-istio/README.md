# How to Configure Egress Rate Limiting in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Egress, Rate Limiting, Kubernetes, Traffic Management

Description: Implement rate limiting on outbound traffic in Istio to prevent abuse, protect external API quotas, and control costs from egress traffic.

---

Rate limiting outbound traffic is something teams often forget about until they hit an external API rate limit in production. If your application calls a third-party API that has a rate limit of 100 requests per minute and you are sending 200, you are going to get errors. And if you are paying per API call, uncontrolled outbound traffic can rack up serious costs.

Istio gives you tools to rate limit egress traffic at the mesh level, so you do not have to implement rate limiting in every individual application. This guide covers how to set up egress rate limiting using Istio's connection pool settings, local rate limiting with Envoy filters, and external rate limiting.

## Connection Pool Limits

The simplest form of egress rate limiting is connection pool management through DestinationRules. This does not provide true request-per-second rate limiting, but it caps the number of concurrent connections and requests to an external service:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-api-limits
  namespace: default
spec:
  host: api.example.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
        connectTimeout: 5s
      http:
        h2UpgradePolicy: DO_NOT_UPGRADE
        maxRequestsPerConnection: 100
        maxRetries: 3
```

This configuration limits traffic to `api.example.com` to:
- Maximum 50 concurrent TCP connections
- Maximum 100 requests per connection before the connection is recycled
- Maximum 3 concurrent retries

When these limits are hit, additional requests get queued or rejected. This protects the external service from being overwhelmed and prevents your application from burning through API quotas too quickly.

## Circuit Breaking for External Services

Circuit breaking is another way to protect against runaway egress traffic. If the external service starts returning errors, the circuit breaker trips and stops sending traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-api-circuit-breaker
  namespace: default
spec:
  host: api.example.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        maxRequestsPerConnection: 50
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
      maxEjectionPercent: 100
```

With this config, if the external API returns 5 consecutive 5xx errors within a 30-second window, the endpoint gets ejected (circuit opened) for 60 seconds. During that time, all requests to the external service will fail immediately instead of waiting for the external service to respond.

## Local Rate Limiting with EnvoyFilter

For true requests-per-second rate limiting, you can use Envoy's local rate limit filter. This applies rate limiting at the sidecar or egress gateway level without needing an external rate limiting service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: egress-rate-limit
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: egressgateway
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: GATEWAY
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
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

This applies a rate limit of 100 requests per 60 seconds on all HTTP traffic flowing through the egress gateway. When the limit is hit, the gateway returns a 429 Too Many Requests response.

## Rate Limiting Per Source Workload

You might want different rate limits for different source workloads. For example, your batch processing service should have a lower rate limit than your real-time API service.

You can achieve this by applying the EnvoyFilter to specific sidecars instead of the egress gateway:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: batch-service-rate-limit
  namespace: batch-processing
spec:
  workloadSelector:
    labels:
      app: batch-processor
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_OUTBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.local_ratelimit
        typed_config:
          "@type": type.googleapis.com/udpa.type.v1.TypedStruct
          type_url: type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
          value:
            stat_prefix: batch_rate_limiter
            token_bucket:
              max_tokens: 10
              tokens_per_fill: 10
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
```

This limits the `batch-processor` workload to 10 outbound HTTP requests per minute.

## Global Rate Limiting with External Service

For shared rate limits across multiple pods (where you need a global counter, not per-pod counters), you need an external rate limiting service. Istio supports integrating with a gRPC-based rate limit service:

First, deploy a rate limit service (like Envoy's reference implementation):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ratelimit
  namespace: istio-system
spec:
  replicas: 1
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
        - containerPort: 8081
          name: grpc
        env:
        - name: RUNTIME_ROOT
          value: /data
        - name: RUNTIME_SUBDIRECTORY
          value: ratelimit
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
  selector:
    app: ratelimit
  ports:
  - port: 8081
    targetPort: 8081
    name: grpc
```

Create the rate limit configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: istio-system
data:
  config.yaml: |
    domain: egress-ratelimit
    descriptors:
    - key: destination
      rate_limit:
        unit: minute
        requests_per_unit: 100
```

Then configure the egress gateway to use the external rate limit service via an EnvoyFilter. This approach gives you a global rate limit shared across all pods, which is important when you need to respect a hard API quota.

## Monitoring Rate Limited Traffic

Track how often your rate limits are being hit:

```promql
sum(rate(istio_requests_total{
  destination_workload="istio-egressgateway",
  response_code="429"
}[5m])) by (source_workload)
```

Also monitor the Envoy rate limit statistics:

```promql
sum(rate(envoy_http_local_rate_limit_rate_limited[5m]))
```

## Choosing the Right Approach

**Connection pool limits**: Good for basic protection. Easy to configure, no additional components needed. But they limit concurrency, not request rate.

**Local rate limiting**: Good for per-pod rate limits. No external dependencies. But the rate limit is per Envoy instance, so total mesh-wide request rate depends on how many pods you have.

**External rate limiting**: Good for hard API quotas that must be shared across all pods. Requires deploying and maintaining a rate limit service and Redis. More complex but provides true global rate limiting.

For most use cases, start with connection pool limits and add local rate limiting if you need more precise control. Only go to external rate limiting when you have strict API quotas that must be enforced globally.
