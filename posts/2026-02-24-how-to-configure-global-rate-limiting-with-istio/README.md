# How to Configure Global Rate Limiting with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rate Limiting, Global Rate Limit, Envoy, Redis, Kubernetes

Description: Step-by-step guide to configuring global rate limiting in Istio using the Envoy rate limit service and Redis backend.

---

Global rate limiting in Istio gives you accurate, centralized control over request rates across all your service replicas. Unlike local rate limiting where each proxy tracks its own counters, global rate limiting uses a shared service that every proxy consults before allowing a request through. This means if you set a limit of 1000 requests per minute, you get exactly 1000 requests per minute regardless of how many pods are running.

## Architecture Overview

The global rate limiting setup involves three components:

1. **Redis** - Stores the rate limit counters
2. **Rate Limit Service** - Implements the rate limit logic, backed by Redis
3. **Envoy Configuration** - EnvoyFilters that tell each proxy to check with the rate limit service

Every time a request arrives at an Envoy proxy, it sends a gRPC call to the rate limit service with descriptors (key-value pairs that describe the request). The rate limit service checks Redis, increments the counter, and tells Envoy whether to allow or reject the request.

## Step 1: Deploy Redis

Redis is the backend store for rate limit counters. For production you want a Redis cluster with persistence, but for getting started a single instance works:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: rate-limit
---
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
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 250m
            memory: 256Mi
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

```bash
kubectl apply -f redis.yaml
```

## Step 2: Create Rate Limit Configuration

The rate limit service reads its configuration from a config file. Define your rate limit rules in a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: rate-limit
data:
  config.yaml: |
    domain: production-ratelimit
    descriptors:
    - key: PATH
      rate_limit:
        unit: minute
        requests_per_unit: 500
    - key: PATH
      value: "/api/expensive-operation"
      rate_limit:
        unit: minute
        requests_per_unit: 50
    - key: header_match
      value: "api-key-tier-free"
      rate_limit:
        unit: hour
        requests_per_unit: 1000
    - key: header_match
      value: "api-key-tier-premium"
      rate_limit:
        unit: hour
        requests_per_unit: 50000
```

This configuration creates several rate limit rules:

- A general limit of 500 requests per minute for any path
- A tighter limit of 50 requests per minute for a specific expensive endpoint
- Different limits for free and premium API key tiers

## Step 3: Deploy the Rate Limit Service

The Envoy rate limit service is the standard implementation:

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
          name: http
        - containerPort: 8081
          name: grpc
        - containerPort: 6070
          name: debug
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
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
        readinessProbe:
          httpGet:
            path: /healthcheck
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
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
  - name: debug
    port: 6070
    targetPort: 6070
```

```bash
kubectl apply -f ratelimit.yaml
```

Wait for it to come up and verify:

```bash
kubectl get pods -n rate-limit
kubectl logs -l app=ratelimit -n rate-limit
```

## Step 4: Configure Envoy to Use the Rate Limit Service

This is the part that connects everything together. You need two EnvoyFilter resources.

First, register the rate limit service as an Envoy cluster:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ratelimit-cluster
  namespace: istio-system
spec:
  configPatches:
  - applyTo: CLUSTER
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

Second, add the rate limit filter and configure the descriptors that get sent to the rate limit service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ratelimit-filter
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      app: my-api
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
          domain: production-ratelimit
          failure_mode_deny: false
          timeout: 5s
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: rate_limit_cluster
            transport_api_version: V3
  - applyTo: VIRTUAL_HOST
    match:
      context: SIDECAR_INBOUND
      routeConfiguration:
        vhost:
          name: "inbound|http|8080"
    patch:
      operation: MERGE
      value:
        rate_limits:
        - actions:
          - request_headers:
              header_name: ":path"
              descriptor_key: PATH
```

Note the `failure_mode_deny: false` setting. This means if the rate limit service is unavailable, requests will be allowed through. Set it to `true` if you want to fail closed, but be aware that this means a rate limit service outage will block all traffic.

## Step 5: Test the Configuration

Send a burst of requests and observe the rate limiting in action:

```bash
for i in $(seq 1 600); do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://my-api.default:8080/api/test)
  echo "Request $i: $RESPONSE"
done
```

After hitting the limit, responses should switch from 200 to 429.

## Updating Rate Limit Rules

To change the rate limit rules, update the ConfigMap and restart the rate limit service:

```bash
kubectl edit configmap ratelimit-config -n rate-limit
kubectl rollout restart deployment ratelimit -n rate-limit
```

The rate limit service reads its configuration on startup, so a restart is required for changes to take effect.

## Monitoring Global Rate Limits

The rate limit service exposes metrics on port 6070. You can also monitor from the Envoy side:

```bash
kubectl exec my-api-pod -c istio-proxy -- \
  curl -s localhost:15000/stats | grep ratelimit
```

Key metrics to watch:

- `ratelimit.ok` - Requests that passed the rate limit check
- `ratelimit.over_limit` - Requests that were rejected
- `ratelimit.error` - Errors communicating with the rate limit service
- `ratelimit.failure_mode_allowed` - Requests allowed because the rate limit service was unavailable

## Production Considerations

For production deployments, keep these things in mind:

- Run at least 2 replicas of the rate limit service for availability
- Use Redis Sentinel or Redis Cluster for Redis high availability
- Set appropriate timeouts so a slow rate limit service does not add excessive latency
- Monitor the rate limit service's own resource usage
- Consider using `failure_mode_deny: false` to avoid blocking traffic if the rate limit service goes down

## Summary

Global rate limiting in Istio requires some setup work, but it gives you precise, cluster-wide control over request rates. The key components are Redis for counter storage, the Envoy rate limit service for logic, and EnvoyFilter resources to connect your proxies to the rate limit service. Once it is running, you can define flexible rate limit rules based on paths, headers, or any other request attributes, and those limits apply accurately across all your service replicas.
