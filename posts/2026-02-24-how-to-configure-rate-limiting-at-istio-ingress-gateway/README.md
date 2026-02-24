# How to Configure Rate Limiting at Istio Ingress Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Rate Limiting, Ingress Gateway, EnvoyFilter, Security

Description: How to implement rate limiting at the Istio Ingress Gateway using local and global rate limiting with EnvoyFilter and external rate limit services.

---

Rate limiting at the ingress gateway protects your services from traffic spikes, abusive clients, and accidental DDoS. Istio supports two approaches: local rate limiting (per-gateway-pod) and global rate limiting (using an external rate limit service). Each has tradeoffs, and the right choice depends on your requirements.

This guide covers both approaches with working configurations you can adapt for your setup.

## Local Rate Limiting

Local rate limiting runs entirely within the Envoy proxy on each ingress gateway pod. It is simple to set up, requires no external dependencies, and works well for basic protection. The downside is that each gateway pod maintains its own counter, so if you have 3 replicas, the effective rate limit is 3x what you configure.

### Basic Local Rate Limit

Apply an EnvoyFilter to add a local rate limit to the ingress gateway:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: local-ratelimit
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

This allows 100 requests per minute per gateway pod. When the limit is hit, clients receive a 429 Too Many Requests response.

### Per-Route Local Rate Limiting

You can apply different rate limits to different routes by using route-level configuration:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: route-ratelimit
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  - applyTo: HTTP_ROUTE
    match:
      context: GATEWAY
      routeConfiguration:
        vhost:
          name: "api.example.com:443"
          route:
            action: ANY
    patch:
      operation: MERGE
      value:
        typed_per_filter_config:
          envoy.filters.http.local_ratelimit:
            "@type": type.googleapis.com/udpa.type.v1.TypedStruct
            type_url: type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
            value:
              stat_prefix: api_rate_limiter
              token_bucket:
                max_tokens: 50
                tokens_per_fill: 50
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

## Global Rate Limiting

Global rate limiting uses an external service to coordinate rate limit decisions across all gateway pods. This gives you accurate, cluster-wide rate limits. The most common implementation uses the Envoy rate limit service.

### Deploy the Rate Limit Service

First, deploy the rate limit service and its Redis backend:

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
        requests_per_unit: 1000
    - key: remote_address
      rate_limit:
        unit: minute
        requests_per_unit: 60
    - key: header_match
      value: api-endpoint
      rate_limit:
        unit: minute
        requests_per_unit: 100
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
        image: envoyproxy/ratelimit:latest
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
    name: grpc
    targetPort: 8081
```

### Configure the Ingress Gateway for Global Rate Limiting

Add an EnvoyFilter that connects the ingress gateway to the rate limit service:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: global-ratelimit
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
          timeout: 0.5s
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: rate_limit_cluster
            transport_api_version: V3
  - applyTo: CLUSTER
    match:
      cluster:
        service: ratelimit.istio-system.svc.cluster.local
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
                    address: ratelimit.istio-system.svc.cluster.local
                    port_value: 8081
```

### Define Rate Limit Actions

Tell Envoy which descriptors to send to the rate limit service:

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
          name: "api.example.com:443"
    patch:
      operation: MERGE
      value:
        rate_limits:
        - actions:
          - remote_address: {}
        - actions:
          - generic_key:
              descriptor_value: default
```

## Rate Limit by API Key or Header

You can rate limit based on specific headers, like an API key:

Update the rate limit config:

```yaml
data:
  config.yaml: |
    domain: production
    descriptors:
    - key: header_match
      value: api-key
      descriptors:
      - key: api_key
        rate_limit:
          unit: minute
          requests_per_unit: 100
```

And add the corresponding action in the EnvoyFilter:

```yaml
rate_limits:
- actions:
  - header_value_match:
      descriptor_value: api-key
      headers:
      - name: x-api-key
        present_match: true
  - request_headers:
      header_name: x-api-key
      descriptor_key: api_key
```

## Monitoring Rate Limits

Check rate limit metrics in Envoy:

```bash
kubectl exec -n istio-system deploy/istio-ingressgateway -- \
  curl -s localhost:15000/stats | grep ratelimit
```

Look for counters like:
- `ratelimit.production.over_limit` - requests that were rate limited
- `ratelimit.production.ok` - requests that passed the rate limit check

## Troubleshooting

**Rate limits not being enforced.** Check that the EnvoyFilter is applied:

```bash
istioctl proxy-config listener deploy/istio-ingressgateway -n istio-system -o json | grep ratelimit
```

**Getting 500 errors instead of 429.** The rate limit service might be down. Set `failure_mode_deny: false` to allow traffic when the rate limit service is unavailable.

**Inconsistent rate limiting across pods.** That is expected with local rate limiting. Switch to global rate limiting for consistent behavior.

## Summary

Local rate limiting is quick to set up and works for basic protection without external dependencies. Global rate limiting with the Envoy rate limit service gives you accurate, cluster-wide limits and per-client controls. For most production setups, start with local rate limiting and move to global when you need per-client limits or consistent enforcement across gateway replicas.
