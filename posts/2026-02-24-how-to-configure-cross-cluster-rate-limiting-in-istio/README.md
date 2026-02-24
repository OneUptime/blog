# How to Configure Cross-Cluster Rate Limiting in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rate Limiting, Multi-Cluster, Kubernetes, Traffic Management

Description: How to implement global and local rate limiting across multiple Istio clusters to protect services from traffic spikes.

---

Rate limiting in a single-cluster Istio deployment is straightforward enough. But when you have services spread across multiple clusters, rate limiting gets tricky. Do you rate limit per cluster? Globally across all clusters? Per service instance? The answer depends on what you are protecting against, and the implementation varies significantly between local and global rate limiting.

This guide covers both approaches and shows you how to set them up in a multi-cluster Istio environment.

## Local vs Global Rate Limiting

Istio supports two types of rate limiting:

**Local rate limiting** happens at the Envoy proxy level. Each sidecar enforces its own rate limits independently. This is fast and does not require any external infrastructure, but it means the effective global rate is the local rate multiplied by the number of instances.

**Global rate limiting** uses an external rate limit service that all proxies communicate with. This gives you a true global rate limit across all clusters, but adds latency and requires running additional infrastructure.

For multi-cluster setups, you typically want global rate limiting for APIs that need hard limits (like public-facing endpoints) and local rate limiting for internal protection against runaway clients.

## Setting Up Local Rate Limiting

Local rate limiting is configured using an EnvoyFilter. Here is how to apply it to a service that exists in multiple clusters:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: payment-local-ratelimit
  namespace: default
spec:
  workloadSelector:
    labels:
      app: payment
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

Apply this EnvoyFilter to both clusters:

```bash
kubectl apply -f payment-local-ratelimit.yaml --context=cluster-a
kubectl apply -f payment-local-ratelimit.yaml --context=cluster-b
```

The important thing to understand is that each pod in each cluster enforces these limits independently. If you have 3 replicas in cluster A and 2 replicas in cluster B, your effective rate limit is 500 requests per minute (5 pods x 100 requests each).

## Setting Up Global Rate Limiting

For a true global rate limit, you need a rate limit service. The standard approach is to use Envoy's rate limit service, which uses Redis as a backend.

**Step 1: Deploy Redis**

Deploy Redis in a central location accessible from both clusters. You can use a managed Redis service or deploy one yourself:

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

**Step 2: Deploy the Rate Limit Service**

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
        - name: LOG_LEVEL
          value: debug
        - name: REDIS_SOCKET_TYPE
          value: tcp
        - name: REDIS_URL
          value: redis.rate-limit:6379
        - name: USE_STATSD
          value: "false"
        - name: RUNTIME_ROOT
          value: /data
        - name: RUNTIME_SUBDIRECTORY
          value: ratelimit
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
  - port: 8081
    targetPort: 8081
    name: grpc
```

**Step 3: Configure Rate Limit Rules**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: rate-limit
data:
  config.yaml: |
    domain: production
    descriptors:
    - key: PATH
      value: "/api/payment"
      rate_limit:
        unit: minute
        requests_per_unit: 1000
    - key: PATH
      rate_limit:
        unit: minute
        requests_per_unit: 5000
```

**Step 4: Configure Istio to Use the Rate Limit Service**

Apply an EnvoyFilter that connects Istio proxies to the global rate limit service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: global-ratelimit
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
          timeout: 0.25s
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: rate_limit_cluster
            transport_api_version: V3
  - applyTo: CLUSTER
    patch:
      operation: ADD
      value:
        name: rate_limit_cluster
        type: STRICT_DNS
        connect_timeout: 0.25s
        lb_policy: ROUND_ROBIN
        typed_extension_protocol_options:
          envoy.extensions.upstreams.http.v3.HttpProtocolOptions:
            "@type": type.googleapis.com/envoy.extensions.upstreams.http.v3.HttpProtocolOptions
            explicit_http_config:
              http2_protocol_options: {}
        load_assignment:
          cluster_name: rate_limit_cluster
          endpoints:
          - lb_endpoints:
            - endpoint:
                address:
                  socket_address:
                    address: ratelimit.rate-limit
                    port_value: 8081
```

Apply this to both clusters so that all proxies check the same rate limit service:

```bash
kubectl apply -f global-ratelimit.yaml --context=cluster-a
kubectl apply -f global-ratelimit.yaml --context=cluster-b
```

## Making the Rate Limit Service Highly Available

Since the global rate limit service is now a critical component in your traffic path, it needs to be highly available.

- Run at least 2 replicas of the rate limit service
- Use Redis Sentinel or Redis Cluster for the backend
- Set `failure_mode_deny: false` so traffic is allowed if the rate limit service is unreachable
- Monitor the rate limit service's latency and error rate

## Testing Rate Limits

Generate traffic and verify the rate limits are enforced:

```bash
# Send 100 requests quickly from cluster A
kubectl exec deploy/sleep -c sleep --context=cluster-a -- \
  sh -c 'for i in $(seq 1 100); do curl -s -o /dev/null -w "%{http_code}\n" payment:8080/api/payment; done'

# Send 100 requests from cluster B
kubectl exec deploy/sleep -c sleep --context=cluster-b -- \
  sh -c 'for i in $(seq 1 100); do curl -s -o /dev/null -w "%{http_code}\n" payment:8080/api/payment; done'
```

With global rate limiting, the combined rate from both clusters should not exceed the configured limit. With local rate limiting, each cluster enforces its own limit independently.

## Monitoring Rate Limit Metrics

Track rate limiting activity with these Prometheus queries:

```promql
# Rate of rate-limited requests
sum(rate(envoy_http_local_rate_limit_rate_limited{app="payment"}[5m])) by (cluster)

# Rate limit service response time
histogram_quantile(0.99, sum(rate(envoy_cluster_upstream_rq_time_bucket{envoy_cluster_name="rate_limit_cluster"}[5m])) by (le, cluster))
```

Cross-cluster rate limiting requires careful thought about whether you need local or global enforcement, and how to handle the additional complexity of running a shared rate limit service. Start with local rate limiting for simple use cases and add global rate limiting when you truly need a single rate limit counter across all your clusters.
