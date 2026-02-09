# How to Use Envoy with Gateway API for Unified Ingress

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Envoy, Gateway API, Kubernetes, Ingress, Networking

Description: Learn how to deploy Envoy as a Gateway API implementation for standardized, role-oriented ingress management in Kubernetes with advanced traffic routing and policy features.

---

The Kubernetes Gateway API represents the next generation of ingress management, providing a more expressive, role-oriented, and portable alternative to traditional Ingress resources. Envoy Gateway implements this API, giving you standardized ways to configure traffic routing, TLS, and advanced features like request mirroring, header manipulation, and weighted traffic splits.

Unlike the Ingress API, Gateway API separates concerns between infrastructure providers (who manage Gateways) and application developers (who define HTTPRoutes). This separation enables better multi-tenancy, clearer ownership boundaries, and more sophisticated routing policies. Envoy Gateway translates Gateway API resources into Envoy configuration automatically, giving you the full power of Envoy through Kubernetes-native APIs.

## Installing Envoy Gateway

Start by installing Envoy Gateway in your Kubernetes cluster:

```bash
# Install Envoy Gateway using Helm
helm repo add envoy-gateway https://gateway.envoyproxy.io
helm repo update

helm install envoy-gateway envoy-gateway/gateway \
  --namespace envoy-gateway-system \
  --create-namespace \
  --set config.envoyGateway.gateway.controllerName=gateway.envoyproxy.io/gatewayclass-controller

# Verify installation
kubectl get pods -n envoy-gateway-system
kubectl get gatewayclass
```

## Creating a Gateway

Define a Gateway resource that Envoy Gateway will manage:

```yaml
# gateway.yaml
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
  name: example-gateway
  namespace: default
spec:
  gatewayClassName: envoy
  listeners:
  # HTTP listener
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: All
  # HTTPS listener with TLS
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: example-tls-cert
    allowedRoutes:
      namespaces:
        from: All
---
# TLS certificate secret
apiVersion: v1
kind: Secret
metadata:
  name: example-tls-cert
  namespace: default
type: kubernetes.io/tls
data:
  tls.crt: LS0tLS1CRUdJTi... # base64 encoded certificate
  tls.key: LS0tLS1CRUdJTi... # base64 encoded key
```

Apply the configuration:

```bash
kubectl apply -f gateway.yaml

# Check Gateway status
kubectl get gateway example-gateway
kubectl describe gateway example-gateway
```

## Configuring HTTPRoute

Create HTTPRoute resources to define traffic routing:

```yaml
# httproute.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: example-route
  namespace: default
spec:
  parentRefs:
  - name: example-gateway
  hostnames:
  - "example.com"
  - "www.example.com"
  rules:
  # Route /api to API service
  - matches:
    - path:
        type: PathPrefix
        value: /api
    backendRefs:
    - name: api-service
      port: 8080
    filters:
    - type: RequestHeaderModifier
      requestHeaderModifier:
        add:
        - name: X-Backend
          value: api
        remove:
        - X-Internal-Header
  # Route /app with header-based routing
  - matches:
    - path:
        type: PathPrefix
        value: /app
      headers:
      - name: X-Version
        value: v2
    backendRefs:
    - name: app-service-v2
      port: 8080
  # Default route
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: default-service
      port: 80
---
# Example backend services
apiVersion: v1
kind: Service
metadata:
  name: api-service
  namespace: default
spec:
  selector:
    app: api
  ports:
  - port: 8080
    targetPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: app-service-v2
  namespace: default
spec:
  selector:
    app: app
    version: v2
  ports:
  - port: 8080
    targetPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: default-service
  namespace: default
spec:
  selector:
    app: default
  ports:
  - port: 80
    targetPort: 8080
```

Apply the HTTPRoute:

```bash
kubectl apply -f httproute.yaml

# Verify route
kubectl get httproute example-route
kubectl describe httproute example-route
```

## Traffic Splitting and Canary Deployments

Implement canary deployments with weighted traffic distribution:

```yaml
# canary-route.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: canary-route
  namespace: default
spec:
  parentRefs:
  - name: example-gateway
  hostnames:
  - "app.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    # 90% traffic to stable version
    - name: app-stable
      port: 8080
      weight: 90
    # 10% traffic to canary version
    - name: app-canary
      port: 8080
      weight: 10
```

## Request Mirroring

Mirror production traffic to a test environment:

```yaml
# mirror-route.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: mirror-route
  namespace: default
spec:
  parentRefs:
  - name: example-gateway
  hostnames:
  - "api.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api
    # Primary backend
    backendRefs:
    - name: api-production
      port: 8080
    # Mirror to test environment
    filters:
    - type: RequestMirror
      requestMirror:
        backendRef:
          name: api-test
          port: 8080
```

## URL Rewriting

Rewrite paths and hostnames:

```yaml
# rewrite-route.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: rewrite-route
  namespace: default
spec:
  parentRefs:
  - name: example-gateway
  hostnames:
  - "legacy.example.com"
  rules:
  # Rewrite /old-api/* to /v2/*
  - matches:
    - path:
        type: PathPrefix
        value: /old-api
    filters:
    - type: URLRewrite
      urlRewrite:
        path:
          type: ReplacePrefixMatch
          replacePrefixMatch: /v2
        hostname: api.example.com
    backendRefs:
    - name: api-v2
      port: 8080
```

## Cross-Namespace Routing with ReferenceGrant

Allow routes in one namespace to reference services in another:

```yaml
# reference-grant.yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-team-routes
  namespace: backend-services
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    namespace: team-a
  to:
  - group: ""
    kind: Service
---
# HTTPRoute in team-a namespace
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: cross-namespace-route
  namespace: team-a
spec:
  parentRefs:
  - name: example-gateway
    namespace: default
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /service
    backendRefs:
    # Reference service in different namespace
    - name: backend-service
      namespace: backend-services
      port: 8080
```

## Timeout and Retry Policies

Configure request timeouts and retry behavior:

```yaml
# timeout-route.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: timeout-route
  namespace: default
  annotations:
    # Envoy-specific timeout configuration
    gateway.envoyproxy.io/timeout: "30s"
    gateway.envoyproxy.io/idle-timeout: "300s"
spec:
  parentRefs:
  - name: example-gateway
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api
    backendRefs:
    - name: api-service
      port: 8080
    # Use BackendRef timeout policy when available
    timeouts:
      request: 30s
      backendRequest: 25s
```

## Rate Limiting with Gateway API

Apply rate limiting policies:

```yaml
# ratelimit-policy.yaml (using Envoy Gateway extension)
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: RateLimitPolicy
metadata:
  name: api-ratelimit
  namespace: default
spec:
  targetRef:
    group: gateway.networking.k8s.io
    kind: HTTPRoute
    name: example-route
  rateLimits:
  - clientSelectors:
    - headers:
      - name: X-API-Key
        type: Distinct
    limits:
      global:
        requests: 100
        unit: Minute
```

## Observability and Metrics

Monitor Envoy Gateway:

```bash
# View Gateway metrics
kubectl port-forward -n envoy-gateway-system \
  deployment/envoy-gateway 19000:19000

# Access Envoy admin interface
curl http://localhost:19000/stats

# View Gateway logs
kubectl logs -n envoy-gateway-system \
  -l control-plane=envoy-gateway \
  -f

# Check HTTPRoute status
kubectl get httproute example-route -o yaml | grep -A 10 status
```

## Advanced Configuration with EnvoyProxy

Customize Envoy behavior with EnvoyProxy resources:

```yaml
# envoyproxy-config.yaml
apiVersion: gateway.envoyproxy.io/v1alpha1
kind: EnvoyProxy
metadata:
  name: custom-proxy-config
  namespace: envoy-gateway-system
spec:
  logging:
    level:
      default: info
  telemetry:
    accessLog:
      settings:
      - format:
          type: JSON
          json:
            start_time: "%START_TIME%"
            method: "%REQ(:METHOD)%"
            path: "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%"
            response_code: "%RESPONSE_CODE%"
            duration: "%DURATION%"
        sinks:
        - type: File
          file:
            path: /dev/stdout
  bootstrap:
    type: Replace
    value: |
      admin:
        address:
          socket_address:
            address: 127.0.0.1
            port_value: 19000
---
# Reference from GatewayClass
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: envoy-custom
spec:
  controllerName: gateway.envoyproxy.io/gatewayclass-controller
  parametersRef:
    group: gateway.envoyproxy.io
    kind: EnvoyProxy
    name: custom-proxy-config
    namespace: envoy-gateway-system
```

## Migrating from Ingress to Gateway API

Convert existing Ingress resources:

```yaml
# Old Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: example-ingress
spec:
  rules:
  - host: example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080

---
# New Gateway API equivalent
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: example-route
spec:
  parentRefs:
  - name: example-gateway
  hostnames:
  - example.com
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /api
    backendRefs:
    - name: api-service
      port: 8080
```

## Best Practices

1. **Use GatewayClass for environment separation**: Different classes for dev, staging, production
2. **Leverage HTTPRoute for routing logic**: Keep Gateway focused on infrastructure
3. **Apply ReferenceGrant judiciously**: Grant minimum required cross-namespace access
4. **Monitor Gateway status**: Check conditions for configuration errors
5. **Use filters for transformation**: Avoid backend code changes for header manipulation
6. **Implement progressive rollouts**: Use traffic splitting for safe deployments
7. **Document route ownership**: Clear boundaries between platform and application teams

Envoy Gateway with Gateway API provides a future-proof, standardized way to manage ingress traffic in Kubernetes, combining Envoy's power with Kubernetes-native configuration.
