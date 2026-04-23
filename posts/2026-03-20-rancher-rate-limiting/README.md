# How to Configure Rate Limiting with Service Mesh in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Rate Limiting, Istio, Service Mesh, Security

Description: Implement rate limiting in Rancher using Istio and Envoy rate limiting filters to protect services from traffic spikes and enforce API usage quotas.

## Introduction

Rate limiting protects your services from being overwhelmed by too many requests, whether from legitimate traffic spikes or malicious activity. In Rancher with Istio, rate limiting can be applied at the ingress gateway, between services, or at individual service endpoints. This guide covers local rate limiting (per Envoy instance) and global rate limiting (using a central rate limit service).

## Prerequisites

- Rancher with Istio installed
- The target namespace/workloads are part of the mesh (Istio sidecar injected)
- kubectl with cluster-admin access
- Redis deployed (for global rate limiting)

## Method 1: Local Rate Limiting

Local rate limiting applies per Envoy proxy instance. Simple to configure but doesn't account for multiple replicas:

```yaml
# local-rate-limit.yaml - Per-instance rate limiting

apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: filter-local-ratelimit
  namespace: production
spec:
  workloadSelector:
    labels:
      app: api-service
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
          name: envoy.filters.http.local_ratelimit
          typed_config:
            "@type": type.googleapis.com/udpa.type.v1.TypedStruct
            type_url: type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
            value:
              stat_prefix: http_local_rate_limiter
              token_bucket:
                # Allow 100 requests per minute per Envoy instance
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
                - append: false
                  header:
                    key: x-local-rate-limit
                    value: 'true'
```

## Method 2: Global Rate Limiting with Envoy Rate Limit Service

### Deploy Redis for Rate Limit State

```yaml
# redis-deployment.yaml - Redis for rate limit counters
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-rate-limit
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis-rate-limit
  template:
    metadata:
      labels:
        app: redis-rate-limit
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
          resources:
            requests:
              memory: 64Mi
              cpu: 50m
---
apiVersion: v1
kind: Service
metadata:
  name: redis-rate-limit
  namespace: production
spec:
  selector:
    app: redis-rate-limit
  ports:
    - port: 6379
```

### Deploy the Envoy Rate Limit Service

```yaml
# ratelimit-service.yaml - Envoy rate limit service
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: production
data:
  config.yaml: |
    domain: production-api
    descriptors:
      # Global API rate limit: 1000 requests per minute
      - key: generic_key
        value: default
        rate_limit:
          unit: minute
          requests_per_unit: 1000

      # Per-user rate limit: 100 requests per minute (based on x-user-id)
      - key: user_id
        rate_limit:
          unit: minute
          requests_per_unit: 100

      # Strict limit for payment endpoint
      - key: path
        value: /api/payment
        rate_limit:
          unit: minute
          requests_per_unit: 10
---
apiVersion: v1
kind: Service
metadata:
  name: ratelimit
  namespace: production
spec:
  selector:
    app: ratelimit
  ports:
    - name: http-port
      port: 8080
      targetPort: 8080
    - name: grpc-port
      port: 8081
      targetPort: 8081
    - name: http-debug
      port: 6070
      targetPort: 6070
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ratelimit
  namespace: production
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
          command:
            - /bin/ratelimit
          env:
            - name: LOG_LEVEL
              value: debug
            - name: REDIS_SOCKET_TYPE
              value: tcp
            - name: REDIS_URL
              value: redis-rate-limit:6379
            - name: USE_STATSD
              value: "false"
            - name: RUNTIME_ROOT
              value: /data
            - name: RUNTIME_SUBDIRECTORY
              value: ratelimit
            - name: RUNTIME_WATCH_ROOT
              value: "false"
            - name: RUNTIME_IGNOREDOTFILES
              value: "true"
            - name: HOST
              value: "::"
            - name: GRPC_HOST
              value: "::"
          ports:
            - containerPort: 8080
            - containerPort: 8081
            - containerPort: 6070
          volumeMounts:
            - name: config
              mountPath: /data/ratelimit/config
      volumes:
        - name: config
          configMap:
            name: ratelimit-config
```

### Configure Istio to Use the Rate Limit Service

```yaml
# envoy-filter-ratelimit.yaml - Integrate rate limit service with Istio
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ratelimit-filter
  namespace: production
spec:
  workloadSelector:
    labels:
      app: api-service
  configPatches:
    # Add rate limit filter
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
            domain: production-api
            failure_mode_deny: true
            timeout: 0.25s
            rate_limit_service:
              grpc_service:
                envoy_grpc:
                  cluster_name: outbound|8081||ratelimit.production.svc.cluster.local
                  authority: ratelimit.production.svc.cluster.local
              transport_api_version: V3
            rate_limits:
              # Default limit for all requests
              - actions:
                  - generic_key:
                      descriptor_value: default
              # Per-user limit based on the x-user-id header
              - actions:
                  - request_headers:
                      header_name: x-user-id
                      descriptor_key: user_id
              # Path-specific limit for exact matches like /api/payment
              - actions:
                  - request_headers:
                      header_name: ":path"
                      descriptor_key: path
```

## Method 3: Rate Limiting at Ingress Gateway

Apply rate limiting at the ingress level for all external traffic:

```yaml
# ingress-ratelimit.yaml - Rate limiting at the gateway
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-ratelimit
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
          name: envoy.filters.http.local_ratelimit
          typed_config:
            "@type": type.googleapis.com/udpa.type.v1.TypedStruct
            type_url: type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
            value:
              stat_prefix: http_local_rate_limiter
              token_bucket:
                # 10,000 requests per minute at the gateway
                max_tokens: 10000
                tokens_per_fill: 10000
                fill_interval: 60s
              filter_enabled:
                runtime_key: gateway_local_rate_limit_enabled
                default_value:
                  numerator: 100
                  denominator: HUNDRED
              filter_enforced:
                runtime_key: gateway_local_rate_limit_enforced
                default_value:
                  numerator: 100
                  denominator: HUNDRED
              response_headers_to_add:
                - append: false
                  header:
                    key: x-local-rate-limit
                    value: 'true'
```

## Step 4: Test Rate Limiting

```bash
# Test rate limiting with Apache Bench
ab -n 200 -c 20 http://api.example.com/api/status

# Test with curl in a loop
for i in {1..150}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://api.example.com/api/status)
  echo "Request $i: HTTP $STATUS"
done | grep "429" | wc -l
# Against a single Envoy instance, you should start seeing 429 responses after the 100-request bucket is exhausted.
# With multiple replicas, the exact number of rejected requests depends on load balancing.
```

## Step 5: Monitor Rate Limiting Metrics

```bash
# Local rate-limit stats are disabled by default in Istio.
# Add proxyStatsMatcher.inclusionRegexps: [".*http_local_rate_limit.*"] to the workload before querying these counters.
kubectl exec -n production -c istio-proxy deployment/api-service -- \
  curl -s localhost:15000/stats | grep -E "http_local_rate_limit|ratelimit"

# Prometheus query for 429 responses generated by rate limiting
curl -s 'http://PROMETHEUS_HOST:9090/api/v1/query?query=sum(rate(istio_requests_total{reporter="destination",destination_service_name="api-service",destination_service_namespace="production",response_code="429"}[5m]))' | \
  jq '.data.result'
```

## Conclusion

Rate limiting is a critical protection mechanism for production APIs and microservices. Istio's Envoy filters enable both local and global rate limiting without application code changes. Local rate limiting is simpler but scales proportionally with pod count; global rate limiting with Redis ensures consistent limits regardless of replica count. Start with local rate limiting for simple use cases, and graduate to global rate limiting when you need precise, cluster-wide enforcement of API quotas.
