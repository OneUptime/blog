# How to use Gateway API with service mesh integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Gateway API, Service Mesh

Description: Integrate Kubernetes Gateway API with service meshes like Istio, Linkerd, and Cilium for unified ingress and service-to-service traffic management, combining north-south and east-west routing with mTLS, observability, and advanced traffic control.

---

Service meshes handle service-to-service (east-west) traffic while gateways manage external (north-south) traffic. The Kubernetes Gateway API provides a unified interface that works with service meshes, creating a consistent traffic management approach across your entire cluster. This guide shows you how to integrate the Gateway API with popular service meshes for comprehensive traffic control.

## Understanding Gateway API and Service Mesh Roles

The Gateway API and service meshes serve complementary purposes:

**Gateway API (North-South)**:
- External traffic ingress
- TLS termination
- Request routing to services
- Rate limiting and authentication

**Service Mesh (East-West)**:
- Service-to-service communication
- mTLS between services
- Fine-grained traffic policies
- Observability and tracing

Integrating them provides end-to-end traffic management from external clients through internal services.

## Gateway API with Istio

Istio supports the Gateway API natively, allowing you to use Gateway resources instead of Istio's custom Gateway and VirtualService resources.

Install Istio with Gateway API support:

```bash
# Install Istio with Gateway API experimental features
istioctl install --set profile=default \
  --set values.pilot.env.PILOT_ENABLE_GATEWAY_API=true \
  --set values.pilot.env.PILOT_ENABLE_GATEWAY_API_STATUS=true \
  --set values.pilot.env.PILOT_ENABLE_GATEWAY_API_DEPLOYMENT_CONTROLLER=true
```

Install Gateway API CRDs:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/standard-install.yaml
```

Create a Gateway using Istio:

```yaml
# istio-gateway.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: istio-gateway
  namespace: istio-system
spec:
  gatewayClassName: istio
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: All
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: gateway-tls
    allowedRoutes:
      namespaces:
        from: All
```

Create an HTTPRoute:

```yaml
# app-route.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: app-route
  namespace: default
spec:
  parentRefs:
  - name: istio-gateway
    namespace: istio-system
  hostnames:
  - "app.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: frontend
      port: 8080
```

Label the namespace for Istio injection:

```bash
kubectl label namespace default istio-injection=enabled
```

Deploy application pods:

```yaml
# app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: app
        image: nginx:latest
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
  namespace: default
spec:
  selector:
    app: frontend
  ports:
  - port: 8080
    targetPort: 8080
```

Traffic flows: External client -> Istio Gateway -> HTTPRoute -> Frontend pod (with sidecar) -> Backend services (with sidecars).

## Combining Gateway API and Istio Traffic Policies

Use Istio DestinationRule for service mesh policies while Gateway API handles ingress:

```yaml
# destination-rule.yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: frontend-dr
  namespace: default
spec:
  host: frontend.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
    loadBalancer:
      simple: LEAST_REQUEST
    outlierDetection:
      consecutiveErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

The Gateway API handles external routing while DestinationRule configures service mesh behavior.

## mTLS Between Gateway and Services

Configure Istio PeerAuthentication for strict mTLS:

```yaml
# peer-authentication.yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

This enforces mTLS for all service-to-service communication, including from the Gateway to backend services.

## Gateway API with Linkerd

Linkerd also supports the Gateway API. Install Linkerd:

```bash
# Install Linkerd CLI
curl --proto '=https' --tlsv1.2 -sSfL https://run.linkerd.io/install | sh

# Install Linkerd control plane
linkerd install --crds | kubectl apply -f -
linkerd install | kubectl apply -f -
linkerd check
```

Linkerd doesn't provide a built-in Gateway implementation, so use an external gateway controller like Envoy Gateway or Nginx Gateway:

```bash
# Install Envoy Gateway
helm install eg oci://docker.io/envoyproxy/gateway-helm --version v0.6.0 -n envoy-gateway-system --create-namespace
```

Create a Gateway:

```yaml
# envoy-gateway.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: envoy
spec:
  controllerName: gateway.envoyproxy.io/gatewayclass-controller
---
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: envoy-linkerd-gateway
  namespace: default
  annotations:
    linkerd.io/inject: enabled  # Inject Linkerd sidecar into gateway
spec:
  gatewayClassName: envoy
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: All
```

Annotate namespaces for Linkerd injection:

```bash
kubectl annotate namespace default linkerd.io/inject=enabled
```

Create HTTPRoute:

```yaml
# linkerd-route.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: app-route
  namespace: default
spec:
  parentRefs:
  - name: envoy-linkerd-gateway
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: app-service
      port: 8080
```

The Envoy Gateway pod will have a Linkerd sidecar, enabling mTLS from gateway to services.

## Service Profiles with Gateway API

Use Linkerd ServiceProfile for per-route metrics:

```yaml
# service-profile.yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: app-service.default.svc.cluster.local
  namespace: default
spec:
  routes:
  - name: GET /api/users
    condition:
      method: GET
      pathRegex: /api/users
    responseClasses:
    - condition:
        status:
          min: 200
          max: 299
      isFailure: false
    - condition:
        status:
          min: 500
          max: 599
      isFailure: true
```

This provides detailed metrics for routes defined in your HTTPRoute.

## Gateway API with Cilium Service Mesh

Cilium provides both Gateway and service mesh functionality. Install Cilium with Gateway API support:

```bash
# Install Cilium with Gateway API and service mesh
helm install cilium cilium/cilium --version 1.14.5 \
  --namespace kube-system \
  --set kubeProxyReplacement=strict \
  --set gatewayAPI.enabled=true \
  --set authentication.mutual.spire.enabled=true
```

Cilium creates a GatewayClass automatically:

```yaml
# cilium-gateway.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: cilium-gateway
  namespace: default
spec:
  gatewayClassName: cilium
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: All
```

Create HTTPRoute:

```yaml
# cilium-route.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: app-route
spec:
  parentRefs:
  - name: cilium-gateway
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: app-service
      port: 8080
```

Enable mTLS with Cilium NetworkPolicy:

```yaml
# cilium-mtls-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: mtls-policy
spec:
  endpointSelector:
    matchLabels:
      app: app-service
  ingress:
  - fromEndpoints:
    - matchLabels:
        io.cilium.k8s.policy.serviceaccount: gateway
    authentication:
      mode: required
```

Cilium handles both ingress (Gateway API) and service mesh (eBPF-based) in a single platform.

## Unified Observability

Configure distributed tracing across Gateway and service mesh.

For Istio with Jaeger:

```yaml
# istio-telemetry.yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: tracing
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: jaeger
    randomSamplingPercentage: 100.0
```

Deploy Jaeger:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/jaeger.yaml
```

Access Jaeger:

```bash
kubectl port-forward -n istio-system svc/tracing 16686:16686
# Visit http://localhost:16686
```

Traces will show the complete path: Gateway -> Frontend -> Backend services.

## Traffic Splitting Across Gateway and Mesh

Implement canary deployment spanning Gateway and service mesh:

```yaml
# canary-httproute.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: canary-route
spec:
  parentRefs:
  - name: istio-gateway
    namespace: istio-system
  hostnames:
  - "app.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: frontend-stable
      port: 8080
      weight: 90
    - name: frontend-canary
      port: 8080
      weight: 10
```

Combine with Istio VirtualService for east-west canary:

```yaml
# istio-canary-vs.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: backend-canary
spec:
  hosts:
  - backend.default.svc.cluster.local
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: backend.default.svc.cluster.local
        subset: canary
  - route:
    - destination:
        host: backend.default.svc.cluster.local
        subset: stable
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: backend-dr
spec:
  host: backend.default.svc.cluster.local
  subsets:
  - name: stable
    labels:
      version: stable
  - name: canary
    labels:
      version: canary
```

This provides canary control at both ingress and service mesh levels.

## Rate Limiting with Gateway and Mesh

Configure rate limiting at the gateway:

```yaml
# envoy-ratelimit-policy.yaml
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: BackendTrafficPolicy
metadata:
  name: rate-limit-policy
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: app-route
  rateLimit:
    type: Global
    global:
      rules:
      - clientSelectors:
        - headers:
          - name: x-user-id
            type: Distinct
        limit:
          requests: 100
          unit: Minute
```

Add service mesh rate limiting with Istio:

```yaml
# istio-ratelimit.yaml
apiVersion: networking.istio.io/v1beta1
kind: EnvoyFilter
metadata:
  name: service-ratelimit
  namespace: default
spec:
  workloadSelector:
    labels:
      app: backend
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: SIDECAR_INBOUND
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.local_ratelimit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
          stat_prefix: http_local_rate_limiter
          token_bucket:
            max_tokens: 500
            tokens_per_fill: 500
            fill_interval: 1s
```

This provides defense in depth with rate limiting at both ingress and service levels.

## Authentication and Authorization

Configure authentication at the Gateway:

```yaml
# gateway-authn.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: authenticated-route
spec:
  parentRefs:
  - name: istio-gateway
    namespace: istio-system
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api
    filters:
    - type: RequestHeaderModifier
      requestHeaderModifier:
        add:
        - name: X-Forwarded-User
          value: "${jwt.sub}"  # Extract from JWT
    backendRefs:
    - name: api-service
      port: 8080
```

Add authorization in the service mesh:

```yaml
# istio-authz.yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: api-authz
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/default/sa/frontend"]
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/api/*"]
```

This provides authentication at ingress and authorization in the mesh.

## Monitoring Gateway and Mesh Together

Deploy Prometheus and Grafana:

```bash
# Install kube-prometheus-stack
helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace
```

Configure ServiceMonitor for Gateway:

```yaml
# gateway-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: gateway-metrics
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: istio-ingressgateway
  endpoints:
  - port: http-envoy-prom
    interval: 30s
```

View unified metrics in Grafana:

```bash
kubectl port-forward -n monitoring svc/monitoring-grafana 3000:80
# Visit http://localhost:3000
```

Import Istio dashboards for both Gateway and service mesh metrics.

## Troubleshooting Gateway-Mesh Integration

Debug traffic flow:

```bash
# Check Gateway status
kubectl describe gateway istio-gateway -n istio-system

# Check HTTPRoute status
kubectl describe httproute app-route

# Verify sidecar injection
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].name}{"\n"}{end}'

# Check mTLS status (Istio)
istioctl authn tls-check frontend-pod.default backend.default.svc.cluster.local

# View Envoy config in gateway
kubectl exec -n istio-system deploy/istio-ingressgateway -- pilot-agent request GET config_dump

# Check service mesh connectivity
linkerd viz stat deploy  # For Linkerd
```

Common issues:

1. **Gateway can't reach services**: Check network policies and mTLS settings
2. **Certificate errors**: Verify TLS configuration matches mesh requirements
3. **Routing not working**: Check HTTPRoute and service mesh VirtualService conflicts
4. **High latency**: Monitor sidecar overhead and tune resource limits

The Gateway API and service mesh integration provides unified traffic management across ingress and service-to-service communication. Use Gateway API for consistent external traffic routing while leveraging service mesh features like mTLS, observability, and fine-grained policies for internal traffic. This combination delivers comprehensive traffic control with consistent configuration patterns across your entire cluster.
