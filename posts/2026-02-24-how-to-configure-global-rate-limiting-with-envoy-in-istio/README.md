# How to Configure Global Rate Limiting with Envoy in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rate Limiting, Envoy, Kubernetes, Traffic Management

Description: How to set up global rate limiting in Istio using an external rate limit service with Envoy filters and configuration.

---

Rate limiting is one of those things every production service needs but nobody enjoys configuring. Global rate limiting in Istio involves an external rate limit service that all Envoy proxies talk to, ensuring consistent rate enforcement across your entire mesh. This is different from local rate limiting, which operates per-proxy. With global rate limiting, if you set a limit of 100 requests per minute, that limit applies across all instances of a service.

## How Global Rate Limiting Works

The flow looks like this:

1. A request hits an Envoy sidecar (or gateway)
2. Envoy sends a rate limit check to the external rate limit service
3. The rate limit service checks the current count and decides allow or deny
4. Envoy either forwards the request or returns 429 Too Many Requests

The rate limit service is typically backed by Redis for fast counter storage. Envoy communicates with it over gRPC.

## Deploying the Rate Limit Service

First, deploy Redis:

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
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
```

Next, deploy the Envoy rate limit service:

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
    - key: generic_key
      value: default
      rate_limit:
        unit: minute
        requests_per_unit: 100
    - key: PATH
      rate_limit:
        unit: minute
        requests_per_unit: 50
---
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
          value: redis.istio-system.svc.cluster.local:6379
        - name: USE_STATSD
          value: "false"
        - name: RUNTIME_ROOT
          value: /data
        - name: RUNTIME_SUBDIRECTORY
          value: ratelimit
        - name: RUNTIME_WATCH_ROOT
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
  namespace: istio-system
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
```

Apply these:

```bash
kubectl apply -f redis.yaml
kubectl apply -f ratelimit.yaml
```

## Configuring Envoy to Use the Rate Limit Service

Now you need to tell Envoy to talk to the rate limit service. This is done through an EnvoyFilter:

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
          domain: production
          failure_mode_deny: false
          timeout: 1s
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
        connect_timeout: 1s
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
                    address: ratelimit.istio-system.svc.cluster.local
                    port_value: 8081
```

## Adding Rate Limit Actions

The EnvoyFilter above enables the rate limit filter, but you also need to define what triggers a rate limit check. Add actions through a route-level configuration:

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
              descriptor_value: default
        - actions:
          - request_headers:
              header_name: ":path"
              descriptor_key: PATH
```

This sends two descriptors to the rate limit service for each request: a generic key with value "default" and the request path. The rate limit service matches these against the configuration we defined in the ConfigMap.

## Testing the Rate Limit

Send requests through the gateway and watch for 429 responses:

```bash
# Quick burst of 200 requests
for i in $(seq 1 200); do
  curl -s -o /dev/null -w "%{http_code}\n" http://your-gateway-ip/api/endpoint
done | sort | uniq -c
```

You should see a mix of 200 and 429 responses once you hit the limit.

## Customizing Rate Limit Descriptors

You can get creative with descriptors. Here is a configuration that limits different paths differently:

```yaml
domain: production
descriptors:
- key: PATH
  value: "/api/v1/users"
  rate_limit:
    unit: minute
    requests_per_unit: 200
- key: PATH
  value: "/api/v1/search"
  rate_limit:
    unit: minute
    requests_per_unit: 30
- key: PATH
  rate_limit:
    unit: minute
    requests_per_unit: 100
```

The last entry is a catch-all for any path not explicitly listed. This gives you fine-grained control over which endpoints get which limits.

## Failure Mode Configuration

Notice the `failure_mode_deny: false` setting in the EnvoyFilter. This means if the rate limit service is unavailable, requests are allowed through. Set this to `true` if you want to deny requests when the rate limit service is down, but be aware that this can cause outages if the rate limit service becomes unhealthy.

## Monitoring Rate Limits

The rate limit service exposes metrics. Check the logs for rate limit decisions:

```bash
kubectl logs -l app=ratelimit -n istio-system
```

You can also check Envoy stats for rate limit metrics:

```bash
kubectl exec deploy/istio-ingressgateway -n istio-system -- curl -s localhost:15000/stats | grep ratelimit
```

Look for `ratelimit.ok`, `ratelimit.over_limit`, and `ratelimit.error` counters.

## Summary

Global rate limiting with Istio requires deploying an external rate limit service (backed by Redis) and configuring Envoy to send rate limit checks before processing requests. The setup involves three pieces: the rate limit service itself, an EnvoyFilter to wire Envoy to the service, and rate limit actions to define what triggers the checks. While the configuration is more involved than local rate limiting, global rate limiting gives you consistent enforcement across all instances and is essential for protecting backend services from traffic spikes.
