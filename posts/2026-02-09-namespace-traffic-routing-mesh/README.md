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
kubectl create namespace prod --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace staging --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace dev --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace shared-services --dry-run=client -o yaml | kubectl apply -f -

kubectl label namespace prod istio-injection=enabled --overwrite
kubectl label namespace staging istio-injection=enabled --overwrite
kubectl label namespace dev istio-injection=enabled --overwrite
kubectl label namespace shared-services istio-injection=enabled --overwrite
```

## Implementing Cross-Namespace Traffic Policies

Create a VirtualService that routes traffic differently based on the source namespace:

```yaml
apiVersion: networking.istio.io/v1
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
    headers:
      request:
        set:
          x-source-namespace: "prod"
    route:
    - destination:
        host: backend.shared-services.svc.cluster.local
        subset: stable
      weight: 100
  # Route from staging to canary backend (90/10 split)
  - match:
    - sourceNamespace: staging
    headers:
      request:
        set:
          x-source-namespace: "staging"
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
    headers:
      request:
        set:
          x-source-namespace: "dev"
    route:
    - destination:
        host: backend.shared-services.svc.cluster.local
        subset: experimental
      weight: 100
---
apiVersion: networking.istio.io/v1
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

Implement different rate limits based on a trusted source-namespace header set by the mesh routing rules and enforced by an Envoy-compatible global rate-limit service:

```yaml
apiVersion: networking.istio.io/v1alpha3
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
        name: envoy.filters.http.ratelimit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.ratelimit.v3.RateLimit
          domain: backend-ratelimit
          failure_mode_deny: true
          timeout: 10s
          rate_limit_service:
            grpc_service:
              envoy_grpc:
                cluster_name: outbound|8081||ratelimit.istio-system.svc.cluster.local
                authority: ratelimit.istio-system.svc.cluster.local
            transport_api_version: V3
  - applyTo: VIRTUAL_HOST
    match:
      context: SIDECAR_INBOUND
      routeConfiguration:
        vhost:
          name: "inbound|http|5678"
    patch:
      operation: MERGE
      value:
        typed_per_filter_config:
          envoy.filters.http.ratelimit:
            "@type": type.googleapis.com/envoy.extensions.filters.http.ratelimit.v3.RateLimitPerRoute
            domain: backend-ratelimit
        rate_limits:
        - actions:
          - request_headers:
              header_name: x-source-namespace
              descriptor_key: source_namespace
---
# Rate limit service config per namespace
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
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: namespace-circuit-breaker
  namespace: prod
spec:
  host: backend.shared-services.svc.cluster.local
  exportTo:
  - "."
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 500
      http:
        http1MaxPendingRequests: 200
        http2MaxRequests: 500
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: namespace-circuit-breaker-dev
  namespace: dev
spec:
  host: backend.shared-services.svc.cluster.local
  exportTo:
  - "."
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        http1MaxPendingRequests: 20
        http2MaxRequests: 50
```

## Multi-Tenant Traffic Isolation

With mTLS enabled, implement strict namespace-based traffic isolation:

```yaml
apiVersion: security.istio.io/v1
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
        serviceAccounts: ["istio-system/istio-ingressgateway"]
---
apiVersion: security.istio.io/v1
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
apiVersion: networking.istio.io/v1
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

Implement canary deployments that progress differently for namespace-scoped workloads:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api-canary
  namespace: staging
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
    webhooks:
    - name: load-test-staging
      url: http://flagger-loadtester.staging/
      timeout: 5s
      metadata:
        type: cmd
        cmd: "hey -z 1m -q 10 -c 2 http://api-canary.staging:8080"
---
# Production gets slower, safer rollout
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api-canary-prod
  namespace: prod
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
  name: backend-experimental
  namespace: shared-services
spec:
  replicas: 1
  selector:
    matchLabels:
      app: backend
      version: experimental
  template:
    metadata:
      labels:
        app: backend
        version: experimental
    spec:
      containers:
      - name: backend
        image: hashicorp/http-echo
        args:
        - "-text=experimental version"
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
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: shared-services
spec:
  selector:
    app: backend
  ports:
  - name: http
    port: 5678
    targetPort: 5678
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
