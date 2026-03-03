# How to Set Up Rate Limiting with Service Mesh on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Rate Limiting, Service Mesh, Kubernetes, API Protection

Description: A step-by-step guide to implementing rate limiting with a service mesh on Talos Linux to protect services from overload and abuse.

---

Rate limiting controls how many requests a client or service can make within a given time period. It is one of the most important tools for protecting services from overload, whether the overload comes from a misconfigured client, a sudden traffic spike, or a deliberate denial-of-service attack. On Talos Linux, implementing rate limiting through a service mesh gives you a centralized, configurable approach that applies consistently across all your services without requiring each application to implement its own rate limiting logic.

This guide covers setting up rate limiting on a Talos Linux cluster using Istio and Envoy, with practical examples for both local and global rate limiting.

## Types of Rate Limiting

There are two main types of rate limiting in a service mesh:

**Local rate limiting** happens at each proxy instance independently. If you set a limit of 100 requests per minute and you have 3 replicas, the effective limit across all replicas is 300 requests per minute. This is simpler to set up but less precise.

**Global rate limiting** uses a centralized rate limiting service. All proxy instances check with this service before allowing requests. This gives you exact limits regardless of how many replicas are running, but it adds a network hop to each request.

## Prerequisites

You need:

- A Talos Linux cluster with Istio installed
- `kubectl` access
- An application to rate limit

```bash
# Verify Istio is running
kubectl get pods -n istio-system

# Deploy a test application
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/httpbin/httpbin.yaml
```

## Local Rate Limiting with Envoy

Local rate limiting is configured through an EnvoyFilter in Istio:

```yaml
# local-rate-limit.yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: local-rate-limit
  namespace: default
spec:
  workloadSelector:
    labels:
      app: httpbin
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: "envoy.filters.network.http_connection_manager"
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

This limits each pod to 100 requests per 60 seconds. Apply and test:

```bash
kubectl apply -f local-rate-limit.yaml

# Send requests rapidly to trigger the rate limit
for i in $(seq 1 200); do
  curl -s -o /dev/null -w "%{http_code} " http://httpbin.default.svc.cluster.local/get
done
```

You should see 200 responses for the first ~100 requests and 429 (Too Many Requests) after that.

## Global Rate Limiting with Envoy

Global rate limiting requires a rate limit service. Here is how to set one up:

### Deploy the Rate Limit Service

```yaml
# ratelimit-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ratelimit
  namespace: default
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
        image: envoyproxy/ratelimit:latest
        ports:
        - containerPort: 8080
        - containerPort: 8081
        - containerPort: 6070
        env:
        - name: RUNTIME_ROOT
          value: /data
        - name: RUNTIME_SUBDIRECTORY
          value: ratelimit
        - name: REDIS_SOCKET_TYPE
          value: tcp
        - name: REDIS_URL
          value: redis.default.svc.cluster.local:6379
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
  namespace: default
spec:
  selector:
    app: ratelimit
  ports:
  - name: http
    port: 8080
  - name: grpc
    port: 8081
  - name: debug
    port: 6070
```

### Deploy Redis for Rate Limit Storage

```yaml
# redis.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: default
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
  namespace: default
spec:
  selector:
    app: redis
  ports:
  - port: 6379
```

### Configure Rate Limit Rules

```yaml
# ratelimit-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: default
data:
  config.yaml: |
    domain: production
    descriptors:
    # Global limit per source IP
    - key: remote_address
      rate_limit:
        unit: minute
        requests_per_unit: 60
    # Per-path limits
    - key: path
      value: "/api/search"
      rate_limit:
        unit: minute
        requests_per_unit: 30
    - key: path
      value: "/api/upload"
      rate_limit:
        unit: minute
        requests_per_unit: 10
    # Per-user limits (based on header)
    - key: user_id
      rate_limit:
        unit: hour
        requests_per_unit: 1000
```

### Connect Istio to the Rate Limit Service

```yaml
# global-ratelimit-filter.yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: global-rate-limit
  namespace: default
spec:
  workloadSelector:
    labels:
      app: httpbin
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.ratelimit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.ratelimit.v3.RateLimit
          domain: production
          failure_mode_deny: false
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: outbound|8081||ratelimit.default.svc.cluster.local
            transport_api_version: V3
```

## Rate Limiting by Header

A common requirement is rate limiting by API key or user ID:

```yaml
# Extract the API key header and use it for rate limiting
- applyTo: HTTP_ROUTE
  match:
    context: SIDECAR_INBOUND
  patch:
    operation: MERGE
    value:
      route:
        rate_limits:
        - actions:
          - request_headers:
              header_name: "x-api-key"
              descriptor_key: "api_key"
```

With the corresponding rate limit configuration:

```yaml
descriptors:
- key: api_key
  rate_limit:
    unit: minute
    requests_per_unit: 100
  descriptors:
  # Different limits for different API keys
  - key: api_key
    value: "premium-key-123"
    rate_limit:
      unit: minute
      requests_per_unit: 1000
```

## Testing Rate Limits

Verify rate limiting is working:

```bash
# Test local rate limiting
for i in $(seq 1 150); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://httpbin.default.svc.cluster.local/get)
  echo "Request $i: $STATUS"
done

# Test with specific API key
for i in $(seq 1 50); do
  curl -s -o /dev/null -w "%{http_code} " \
    -H "x-api-key: test-key" \
    http://httpbin.default.svc.cluster.local/get
done
```

## Monitoring Rate Limit Activity

Track how often rate limits are being hit:

```bash
# Check Envoy stats for rate limit metrics
kubectl exec <POD_NAME> -c istio-proxy -- \
  curl -s localhost:15000/stats | grep ratelimit

# Key metrics:
# ratelimit.ok - requests that passed rate limiting
# ratelimit.over_limit - requests that were rate limited
# ratelimit.error - errors communicating with rate limit service

# Check the rate limit service logs
kubectl logs deployment/ratelimit
```

## Talos Linux Considerations

Rate limiting on Talos Linux works the same as on other platforms since it is entirely Kubernetes-native. The main considerations are:

1. Redis for global rate limiting needs persistent storage - make sure you have a StorageClass configured
2. The rate limit service should have enough replicas for high availability
3. Monitor the rate limit service itself to make sure it is not a bottleneck

## Conclusion

Rate limiting with a service mesh on Talos Linux protects your services from overload without requiring any application-level changes. Local rate limiting is simple and works well for per-pod limits, while global rate limiting through a centralized service gives you precise control across all replicas. The declarative configuration through Kubernetes resources means your rate limiting policies are version-controlled, reviewable, and easily reproducible. Combined with Talos Linux's secure infrastructure, you get a robust defense against traffic abuse and accidental overload.
