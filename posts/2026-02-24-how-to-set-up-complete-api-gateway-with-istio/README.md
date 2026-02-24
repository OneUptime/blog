# How to Set Up Complete API Gateway with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, API Gateway, Ingress, Rate Limiting, Kubernetes

Description: Build a full-featured API gateway using Istio with routing, rate limiting, authentication, CORS, and TLS termination.

---

Istio's ingress gateway can serve as a fully functional API gateway for your microservices. Instead of deploying a separate API gateway product, you use the same infrastructure that manages your mesh traffic. This means one less component to maintain and a consistent configuration model. Here's how to set up a production-grade API gateway with Istio.

## Gateway Architecture

The Istio Ingress Gateway is an Envoy proxy deployed at the edge of your mesh. It handles:

- TLS termination
- Request routing
- Rate limiting
- Authentication and authorization
- CORS headers
- Request/response transformation
- Load balancing

## Step 1: TLS Termination

First, set up TLS with a proper certificate:

```bash
# Create a TLS secret with your certificate
kubectl create secret tls api-tls-cert \
  -n istio-system \
  --cert=fullchain.pem \
  --key=privkey.pem

# Or if you're using cert-manager
```

```yaml
# Using cert-manager for automatic certificate management
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-cert
  namespace: istio-system
spec:
  secretName: api-tls-cert
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - api.example.com
  - "*.api.example.com"
```

Configure the gateway with TLS:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: api-gateway
  namespace: default
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
      credentialName: api-tls-cert
    hosts:
    - "api.example.com"
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "api.example.com"
    tls:
      httpsRedirect: true  # Redirect HTTP to HTTPS
```

## Step 2: API Routing

Route requests to different backend services based on the URL path:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-routes
  namespace: default
spec:
  hosts:
  - "api.example.com"
  gateways:
  - api-gateway
  http:
  # User service
  - match:
    - uri:
        prefix: /v1/users
    route:
    - destination:
        host: user-service
        port:
          number: 8080
    timeout: 10s
    retries:
      attempts: 3
      perTryTimeout: 3s

  # Product service
  - match:
    - uri:
        prefix: /v1/products
    route:
    - destination:
        host: product-service
        port:
          number: 8080
    timeout: 5s

  # Order service
  - match:
    - uri:
        prefix: /v1/orders
    route:
    - destination:
        host: order-service
        port:
          number: 8080
    timeout: 30s

  # Search service
  - match:
    - uri:
        prefix: /v1/search
    route:
    - destination:
        host: search-service
        port:
          number: 8080
    timeout: 3s

  # Health check endpoint
  - match:
    - uri:
        exact: /health
    directResponse:
      status: 200
      body:
        string: '{"status":"healthy"}'
```

## Step 3: API Versioning

Handle multiple API versions with routing:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: versioned-api
  namespace: default
spec:
  hosts:
  - "api.example.com"
  gateways:
  - api-gateway
  http:
  # V2 API routes to new service versions
  - match:
    - uri:
        prefix: /v2/users
    rewrite:
      uri: /users
    route:
    - destination:
        host: user-service
        subset: v2
        port:
          number: 8080

  # V1 API routes to stable service versions
  - match:
    - uri:
        prefix: /v1/users
    rewrite:
      uri: /users
    route:
    - destination:
        host: user-service
        subset: v1
        port:
          number: 8080
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: user-service
  namespace: default
spec:
  host: user-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

## Step 4: Authentication

Add JWT authentication at the gateway level:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: api-jwt-auth
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
# Require authentication for all API paths except health and public endpoints
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: api-auth-policy
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
  # Allow unauthenticated access to public endpoints
  - to:
    - operation:
        paths: ["/health", "/v1/products", "/v1/search"]
        methods: ["GET"]
  # Require authentication for everything else
  - from:
    - source:
        requestPrincipals: ["*"]
```

## Step 5: CORS Configuration

Add CORS headers for browser-based API clients:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-cors
  namespace: default
spec:
  hosts:
  - "api.example.com"
  gateways:
  - api-gateway
  http:
  - match:
    - uri:
        prefix: /v1/
    corsPolicy:
      allowOrigins:
      - exact: "https://app.example.com"
      - regex: "https://.*\\.example\\.com"
      allowMethods:
      - GET
      - POST
      - PUT
      - DELETE
      - OPTIONS
      allowHeaders:
      - authorization
      - content-type
      - x-request-id
      maxAge: "24h"
      allowCredentials: true
    route:
    - destination:
        host: user-service
        port:
          number: 8080
```

## Step 6: Rate Limiting

Istio supports rate limiting through Envoy's rate limiting features. You can use local rate limiting directly on the gateway:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-rate-limit
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
              max_tokens: 1000
              tokens_per_fill: 1000
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
                key: x-rate-limit
                value: "1000"
```

## Step 7: Request Header Manipulation

Add or modify headers for backend services:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-headers
  namespace: default
spec:
  hosts:
  - "api.example.com"
  gateways:
  - api-gateway
  http:
  - match:
    - uri:
        prefix: /v1/
    headers:
      request:
        add:
          x-forwarded-service: "api-gateway"
          x-request-start: "%START_TIME%"
        remove:
        - x-internal-header
      response:
        add:
          x-powered-by: "istio"
          strict-transport-security: "max-age=31536000; includeSubDomains"
          x-content-type-options: "nosniff"
          x-frame-options: "DENY"
    route:
    - destination:
        host: user-service
        port:
          number: 8080
```

## Step 8: Circuit Breaking and Connection Pooling

Protect your backend services from being overwhelmed:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: api-backends
  namespace: default
spec:
  host: user-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 200
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 15s
      baseEjectionTime: 30s
      maxEjectionPercent: 30
```

## Verification

Test your API gateway setup:

```bash
# Test HTTPS redirect
curl -v http://api.example.com/v1/products
# Should return 301 redirect to HTTPS

# Test TLS
curl -v https://api.example.com/v1/products

# Test authentication (should fail without token)
curl -v https://api.example.com/v1/users
# Should return 403

# Test with valid token
curl -H "Authorization: Bearer $TOKEN" https://api.example.com/v1/users
# Should return 200

# Test CORS
curl -v -X OPTIONS https://api.example.com/v1/users \
  -H "Origin: https://app.example.com" \
  -H "Access-Control-Request-Method: GET"
# Should return CORS headers

# Test rate limiting
for i in $(seq 1 1100); do
  curl -s -o /dev/null -w "%{http_code}" https://api.example.com/health
done
# Should start seeing 429 responses after 1000 requests

# Check the gateway configuration
istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system
istioctl proxy-config listeners deploy/istio-ingressgateway -n istio-system
```

Using Istio as your API gateway means you have one fewer component to deploy, secure, and maintain. All your traffic management, security, and observability uses the same Istio configuration model, which keeps your infrastructure consistent and your team focused on one set of tools.
