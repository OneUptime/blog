# How to Migrate from API Gateway to Istio Ingress

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, API Gateway, Ingress, Migration, Traffic Management

Description: Replace your existing API gateway like Kong, Ambassador, or NGINX Ingress with Istio's ingress gateway for unified traffic management across your service mesh.

---

Running a separate API gateway alongside Istio creates overlap. Both handle routing, TLS termination, rate limiting, and traffic policies. You end up managing two systems that do similar things, with traffic policies split between them. Migrating your API gateway functionality to Istio's ingress gateway simplifies the architecture and gives you a single control plane for all traffic management.

Here is how to migrate from common API gateways to Istio ingress.

## What the API Gateway Does vs What Istio Does

Most API gateways handle:

- **Routing**: Path-based routing to backend services
- **TLS termination**: Handling HTTPS at the edge
- **Authentication**: JWT validation, API key checking
- **Rate limiting**: Throttling requests per client
- **Header manipulation**: Adding, removing, or rewriting headers
- **CORS**: Cross-origin resource sharing headers
- **Load balancing**: Distributing traffic across backends

Istio can handle all of these. The approach is different (YAML resources instead of gateway-specific configuration), but the capabilities are there.

## Migration from NGINX Ingress Controller

NGINX Ingress uses Kubernetes Ingress resources with annotations:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /api/orders
            pathType: Prefix
            backend:
              service:
                name: order-service
                port:
                  number: 8080
          - path: /api/users
            pathType: Prefix
            backend:
              service:
                name: user-service
                port:
                  number: 8080
```

The Istio equivalent:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: api-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: api-tls  # Secret must be in istio-system namespace
      hosts:
        - "api.example.com"
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "api.example.com"
      tls:
        httpsRedirect: true
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-routes
spec:
  hosts:
    - "api.example.com"
  gateways:
    - api-gateway
  http:
    - match:
        - uri:
            prefix: /api/orders
      route:
        - destination:
            host: order-service
            port:
              number: 8080
    - match:
        - uri:
            prefix: /api/users
      route:
        - destination:
            host: user-service
            port:
              number: 8080
```

Note: The TLS secret must be in the `istio-system` namespace (where the ingress gateway runs), not in the application namespace.

```bash
# Copy the secret to istio-system
kubectl get secret api-tls -n default -o yaml | \
  sed 's/namespace: default/namespace: istio-system/' | \
  kubectl apply -f -
```

## Migration from Kong

Kong uses custom resources or its admin API:

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongIngress
metadata:
  name: api-config
route:
  strip_path: true
  protocols:
    - https
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-api
  annotations:
    konghq.com/override: api-config
    konghq.com/plugins: rate-limiting,jwt-auth
spec:
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /api/orders
            pathType: Prefix
            backend:
              service:
                name: order-service
                port:
                  number: 8080
```

For Istio, routing translates directly to VirtualService. Kong plugins need different Istio resources:

### Rate Limiting

Kong plugin:

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: rate-limiting
plugin: rate-limiting
config:
  minute: 100
  policy: local
```

Istio equivalent using EnvoyFilter for local rate limiting:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: rate-limit
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
```

### JWT Authentication

Kong JWT plugin becomes Istio RequestAuthentication + AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      forwardOriginalToken: true
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: DENY
  rules:
    - from:
        - source:
            notRequestPrincipals: ["*"]
```

## Migration from Ambassador / Emissary

Ambassador uses Mapping resources:

```yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: order-mapping
spec:
  hostname: api.example.com
  prefix: /api/orders/
  service: order-service:8080
  timeout_ms: 10000
  retry_policy:
    retry_on: 5xx
    num_retries: 3
```

The Istio equivalent:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-routes
spec:
  hosts:
    - "api.example.com"
  gateways:
    - api-gateway
  http:
    - match:
        - uri:
            prefix: /api/orders
      route:
        - destination:
            host: order-service
            port:
              number: 8080
      timeout: 10s
      retries:
        attempts: 3
        retryOn: 5xx
```

## Step-by-Step Migration Process

### Step 1: Inventory Your Gateway Configuration

List all routes, plugins, and policies on your current gateway:

```bash
# For Kong
kubectl get KongPlugin,KongConsumer,KongIngress --all-namespaces

# For NGINX Ingress
kubectl get ingress --all-namespaces -o yaml | grep "annotations" -A 20

# For Ambassador
kubectl get Mapping,TLSContext,Module --all-namespaces
```

### Step 2: Create Istio Gateway and VirtualService Resources

Translate each route from your gateway to Istio resources. Start with the simplest routes and work up to the complex ones.

### Step 3: Run Both Gateways in Parallel

Deploy the Istio ingress gateway configuration alongside your existing gateway. Use DNS or load balancer settings to direct a small percentage of traffic to the Istio ingress:

```bash
# Get the Istio ingress external IP
kubectl get svc istio-ingressgateway -n istio-system
```

Test with curl:

```bash
ISTIO_IP=$(kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl -v https://api.example.com/api/orders --resolve "api.example.com:443:$ISTIO_IP"
```

### Step 4: Switch DNS

After verifying the Istio ingress works correctly, update your DNS to point to the Istio ingress gateway external IP.

### Step 5: Decommission the Old Gateway

After DNS propagation and verification:

```bash
# Remove NGINX Ingress
helm uninstall ingress-nginx -n ingress-nginx

# Remove Kong
helm uninstall kong -n kong

# Remove Ambassador
helm uninstall ambassador -n ambassador
```

Remove the old Ingress resources:

```bash
kubectl delete ingress --all -n default
```

## Features That Need Special Handling

### URL Rewriting

NGINX annotation `rewrite-target` becomes VirtualService `rewrite`:

```yaml
  http:
    - match:
        - uri:
            prefix: /api/v1/orders
      rewrite:
        uri: /orders
      route:
        - destination:
            host: order-service
```

### CORS

```yaml
  http:
    - match:
        - uri:
            prefix: /api
      corsPolicy:
        allowOrigins:
          - exact: "https://www.example.com"
        allowMethods:
          - GET
          - POST
          - PUT
          - DELETE
        allowHeaders:
          - Authorization
          - Content-Type
        maxAge: "24h"
      route:
        - destination:
            host: api-service
```

### Header Manipulation

```yaml
  http:
    - match:
        - uri:
            prefix: /api
      headers:
        request:
          set:
            x-forwarded-proto: https
          add:
            x-custom-header: "my-value"
        response:
          remove:
            - x-internal-header
      route:
        - destination:
            host: api-service
```

Migrating from a standalone API gateway to Istio ingress unifies your traffic management under one system. You lose the gateway-specific plugin ecosystem, but you gain a consistent configuration model that works for both ingress and internal mesh traffic.
