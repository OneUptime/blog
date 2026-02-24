# How to Set Up Redis-Based Rate Limiting with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Redis, Rate Limiting, Envoy, Kubernetes

Description: Complete walkthrough for deploying a Redis-backed global rate limiting system with Istio service mesh and Envoy proxies.

---

When you need rate limits that are enforced consistently across all pods and all gateways, you need a centralized counter. Redis is the go-to choice for this because it is fast, supports atomic operations, and can handle the throughput that a busy rate limit service demands. This guide walks through the complete setup of Redis-backed rate limiting in Istio.

## Architecture Overview

The setup has four components:

1. Redis - stores rate limit counters
2. Rate limit service - receives gRPC rate check requests from Envoy, queries Redis
3. EnvoyFilter - tells Envoy sidecars and gateways to check the rate limit service
4. Rate limit configuration - defines the actual limits (requests per time unit)

Every request flows through Envoy, which makes a gRPC call to the rate limit service. The rate limit service increments a counter in Redis and returns either OK or OVER_LIMIT.

## Deploying Redis

For production, you should use a Redis cluster or a managed Redis service. For getting started, a simple Redis deployment works:

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
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
        args:
        - redis-server
        - --maxmemory
        - 128mb
        - --maxmemory-policy
        - allkeys-lru
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

Create the namespace and deploy:

```bash
kubectl create namespace rate-limit
kubectl apply -f redis.yaml
```

The `maxmemory-policy: allkeys-lru` setting is important. It ensures Redis evicts old keys when memory is full, which prevents the rate limit service from running out of memory under heavy load.

## Deploying the Rate Limit Service

The Envoy rate limit service is the bridge between Envoy and Redis. Deploy it with your rate limit rules:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: rate-limit
data:
  config.yaml: |
    domain: api-gateway
    descriptors:
    - key: generic_key
      value: global
      rate_limit:
        unit: second
        requests_per_unit: 500
    - key: header_match
      value: api-key
      descriptors:
      - key: header_value
        rate_limit:
          unit: minute
          requests_per_unit: 60
    - key: remote_address
      rate_limit:
        unit: minute
        requests_per_unit: 100
---
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
        - name: LOG_LEVEL
          value: info
        - name: REDIS_SOCKET_TYPE
          value: tcp
        - name: REDIS_URL
          value: redis.rate-limit.svc.cluster.local:6379
        - name: USE_STATSD
          value: "false"
        - name: RUNTIME_ROOT
          value: /data
        - name: RUNTIME_SUBDIRECTORY
          value: ratelimit
        - name: RUNTIME_WATCH_ROOT
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
  - name: grpc
    port: 8081
    targetPort: 8081
  - name: http
    port: 8080
    targetPort: 8080
  - name: debug
    port: 6070
    targetPort: 6070
```

```bash
kubectl apply -f ratelimit-service.yaml
```

Wait for the pods to be ready:

```bash
kubectl get pods -n rate-limit -w
```

## Configuring Envoy to Talk to the Rate Limit Service

This is where the EnvoyFilter comes in. You need two patches: one to add the rate limit filter, and one to define the cluster (network endpoint) for the rate limit service.

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
          domain: api-gateway
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

## Adding Rate Limit Actions

Define what descriptors Envoy sends to the rate limit service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ratelimit-actions
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
          - generic_key:
              descriptor_value: global
        - actions:
          - remote_address: {}
```

This sends two descriptors: a global counter that tracks total requests, and a per-IP counter that tracks requests from each client.

Apply all the EnvoyFilters:

```bash
kubectl apply -f envoyfilter-ratelimit.yaml
kubectl apply -f envoyfilter-actions.yaml
```

## Redis Configuration for Production

For production environments, consider these Redis tweaks:

```yaml
args:
- redis-server
- --maxmemory
- 512mb
- --maxmemory-policy
- allkeys-lru
- --appendonly
- "no"
- --save
- ""
```

Disabling persistence (`appendonly no` and `save ""`) is recommended for rate limiting. You do not need to persist rate limit counters to disk. If Redis restarts, the counters reset, which is acceptable behavior. This configuration gives you better write performance.

## Redis Sentinel for High Availability

For high availability, use Redis Sentinel:

```yaml
env:
- name: REDIS_SOCKET_TYPE
  value: tcp
- name: REDIS_TYPE
  value: sentinel
- name: REDIS_URL
  value: redis-sentinel.rate-limit.svc.cluster.local:26379
- name: REDIS_SENTINEL_MASTER_NAME
  value: mymaster
```

## Monitoring Redis-Backed Rate Limiting

Check Redis directly to see rate limit counters:

```bash
kubectl exec -n rate-limit deploy/redis -- redis-cli keys "*"
kubectl exec -n rate-limit deploy/redis -- redis-cli get "api-gateway_generic_key_global_1708819200"
```

The keys follow the pattern `{domain}_{descriptor_key}_{descriptor_value}_{timestamp}`.

Monitor the rate limit service health:

```bash
kubectl logs -n rate-limit deploy/ratelimit --tail=50
```

And check Envoy stats:

```bash
kubectl exec -n istio-system deploy/istio-ingressgateway -- curl -s localhost:15000/stats | grep ratelimit
```

## Testing

Blast requests at the gateway and watch for 429s:

```bash
for i in $(seq 1 600); do
  curl -s -o /dev/null -w "%{http_code}\n" http://your-gateway-ip/api/test
done | sort | uniq -c
```

You should see the first 500 return 200 (matching the global limit of 500 per second) and the rest return 429.

## Summary

Redis-backed rate limiting gives you centralized, consistent rate enforcement across your entire Istio mesh. The setup requires deploying Redis, the Envoy rate limit service, and EnvoyFilter configurations. While it is more complex than local rate limiting, it is the right choice when you need precise global limits. Configure Redis with LRU eviction and no persistence for optimal performance, and consider Redis Sentinel for production high availability.
