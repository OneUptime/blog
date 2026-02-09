# How to Implement Namespace-Based Traffic Routing with Service Mesh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Service Mesh, Networking

Description: Learn how to implement namespace-based traffic routing using service mesh technologies to enable sophisticated traffic management, canary deployments, and multi-tenant isolation.

---

Service meshes provide advanced traffic management capabilities that go far beyond basic Kubernetes networking. When combined with namespace-based routing, you can implement sophisticated patterns like canary deployments per namespace, A/B testing across tenant namespaces, traffic shaping based on namespace origin, and complete isolation between namespace boundaries.

This approach is particularly powerful in multi-tenant environments where different teams or customers occupy separate namespaces and require independent traffic management policies.

## Understanding Namespace-Based Traffic Routing

In a service mesh, traffic routing decisions can be made based on various factors including namespace labels, service identity, request headers, and more. Namespace-based routing allows you to apply different traffic policies to services depending on which namespace initiated the request.

## Setting Up Istio for Namespace Routing

Install Istio with namespace-aware configuration:

```bash
# Install Istio CLI
curl -L https://istio.io/downloadIstio | sh -
cd istio-*
export PATH=$PWD/bin:$PATH

# Install Istio with sidecar injection
istioctl install --set profile=default -y

# Enable sidecar injection for specific namespaces
kubectl create namespace prod
kubectl create namespace staging
kubectl create namespace dev

kubectl label namespace prod istio-injection=enabled
kubectl label namespace staging istio-injection=enabled
kubectl label namespace dev istio-injection=enabled
```

## Implementing Cross-Namespace Traffic Policies

Create a VirtualService that routes traffic differently based on the source namespace:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: backend-routing
  namespace: shared-services
spec:
  hosts:
  - backend.shared-services.svc.cluster.local
  http:
  # Route from production namespace to stable backend
  - match:
    - sourceNamespace: prod
    route:
    - destination:
        host: backend.shared-services.svc.cluster.local
        subset: stable
      weight: 100
  # Route from staging to canary backend (90/10 split)
  - match:
    - sourceNamespace: staging
    route:
    - destination:
        host: backend.shared-services.svc.cluster.local
        subset: stable
      weight: 90
    - destination:
        host: backend.shared-services.svc.cluster.local
        subset: canary
      weight: 10
  # Route from dev namespace to experimental version
  - match:
    - sourceNamespace: dev
    route:
    - destination:
        host: backend.shared-services.svc.cluster.local
        subset: experimental
      weight: 100
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: backend-subsets
  namespace: shared-services
spec:
  host: backend.shared-services.svc.cluster.local
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
  subsets:
  - name: stable
    labels:
      version: stable
  - name: canary
    labels:
      version: canary
  - name: experimental
    labels:
      version: experimental
```

## Namespace-Aware Rate Limiting

Implement different rate limits based on the source namespace:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: EnvoyFilter
metadata:
  name: namespace-rate-limit
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      app: backend
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
---
# Rate limit config per namespace
apiVersion: v1
kind: ConfigMap
metadata:
  name: ratelimit-config
  namespace: istio-system
data:
  config.yaml: |
    domain: backend-ratelimit
    descriptors:
      # Production namespace - 1000 req/min
      - key: source_namespace
        value: "prod"
        rate_limit:
          unit: minute
          requests_per_unit: 1000
      # Staging namespace - 500 req/min
      - key: source_namespace
        value: "staging"
        rate_limit:
          unit: minute
          requests_per_unit: 500
      # Dev namespace - 100 req/min
      - key: source_namespace
        value: "dev"
        rate_limit:
          unit: minute
          requests_per_unit: 100
```

## Implementing Namespace-Based Circuit Breaking

Apply different circuit breaker settings per namespace:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: namespace-circuit-breaker
  namespace: shared-services
spec:
  host: backend.shared-services.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
    outlierDetection:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
  # Override for production namespace
  exportTo:
  - "prod"
  subsets:
  - name: prod-subset
    labels:
      app: backend
    trafficPolicy:
      connectionPool:
        tcp:
          maxConnections: 500
        http:
          http1MaxPendingRequests: 200
          http2MaxRequests: 500
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: namespace-circuit-breaker-dev
  namespace: shared-services
spec:
  host: backend.shared-services.svc.cluster.local
  exportTo:
  - "dev"
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        http1MaxPendingRequests: 20
        http2MaxRequests: 50
```

## Multi-Tenant Traffic Isolation

Implement strict namespace-based traffic isolation:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: namespace-isolation
  namespace: tenant-a
spec:
  selector:
    matchLabels:
      app: tenant-service
  action: ALLOW
  rules:
  # Allow traffic from same namespace
  - from:
    - source:
        namespaces: ["tenant-a"]
  # Allow traffic from ingress
  - from:
    - source:
        namespaces: ["istio-system"]
        principals: ["cluster.local/ns/istio-system/sa/istio-ingressgateway-service-account"]
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-cross-namespace
  namespace: tenant-a
spec:
  action: DENY
  rules:
  - from:
    - source:
        notNamespaces: ["tenant-a", "istio-system"]
```

## Implementing Namespace-Aware Retries

Configure retry policies based on source namespace:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-retries
  namespace: shared-services
spec:
  hosts:
  - api.shared-services.svc.cluster.local
  http:
  # Production: aggressive retries
  - match:
    - sourceNamespace: prod
    retries:
      attempts: 5
      perTryTimeout: 2s
      retryOn: 5xx,reset,connect-failure,refused-stream
    route:
    - destination:
        host: api.shared-services.svc.cluster.local
  # Staging: moderate retries
  - match:
    - sourceNamespace: staging
    retries:
      attempts: 3
      perTryTimeout: 2s
      retryOn: 5xx,reset
    route:
    - destination:
        host: api.shared-services.svc.cluster.local
  # Dev: minimal retries
  - match:
    - sourceNamespace: dev
    retries:
      attempts: 1
      perTryTimeout: 1s
      retryOn: 5xx
    route:
    - destination:
        host: api.shared-services.svc.cluster.local
```

## Progressive Delivery Per Namespace

Implement canary deployments that progress differently per namespace:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api-canary
  namespace: shared-services
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  service:
    port: 8080
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
    - name: request-duration
      thresholdRange:
        max: 500
      interval: 1m
    # Namespace-specific analysis
    match:
    - headers:
        x-source-namespace:
          exact: "staging"
    webhooks:
    - name: load-test-staging
      url: http://flagger-loadtester/
      timeout: 5s
      metadata:
        type: cmd
        cmd: "hey -z 1m -q 10 -c 2 http://api-canary.shared-services:8080"
---
# Production gets slower, safer rollout
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api-canary-prod
  namespace: shared-services
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  service:
    port: 8080
  analysis:
    interval: 5m
    threshold: 10
    maxWeight: 30
    stepWeight: 5
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99.9
      interval: 1m
    match:
    - headers:
        x-source-namespace:
          exact: "prod"
```

## Monitoring Namespace-Based Traffic

Create Grafana dashboards for namespace traffic analysis:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-namespace-traffic
  namespace: monitoring
data:
  namespace-traffic.json: |
    {
      "dashboard": {
        "title": "Namespace Traffic Routing",
        "panels": [
          {
            "title": "Requests by Source Namespace",
            "targets": [
              {
                "expr": "sum(rate(istio_requests_total[5m])) by (source_namespace, destination_service)"
              }
            ]
          },
          {
            "title": "Error Rate by Namespace",
            "targets": [
              {
                "expr": "sum(rate(istio_requests_total{response_code=~\"5..\"}[5m])) by (source_namespace) / sum(rate(istio_requests_total[5m])) by (source_namespace)"
              }
            ]
          },
          {
            "title": "Latency P95 by Namespace",
            "targets": [
              {
                "expr": "histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (source_namespace, le))"
              }
            ]
          }
        ]
      }
    }
```

## Testing Namespace Routing

Deploy test applications across namespaces:

```bash
# Deploy backend with multiple versions
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-stable
  namespace: shared-services
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
      version: stable
  template:
    metadata:
      labels:
        app: backend
        version: stable
    spec:
      containers:
      - name: backend
        image: hashicorp/http-echo
        args:
        - "-text=stable version"
        ports:
        - containerPort: 5678
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-canary
  namespace: shared-services
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backend
      version: canary
  template:
    metadata:
      labels:
        app: backend
        version: canary
    spec:
      containers:
      - name: backend
        image: hashicorp/http-echo
        args:
        - "-text=canary version"
        ports:
        - containerPort: 5678
EOF

# Test from different namespaces
kubectl run test-prod -n prod --image=curlimages/curl --rm -it -- \
  curl http://backend.shared-services:5678

kubectl run test-staging -n staging --image=curlimages/curl --rm -it -- \
  curl http://backend.shared-services:5678

kubectl run test-dev -n dev --image=curlimages/curl --rm -it -- \
  curl http://backend.shared-services:5678
```

Namespace-based traffic routing with service mesh provides powerful capabilities for managing multi-tenant environments, implementing progressive delivery strategies, and ensuring proper isolation between different teams and applications.
