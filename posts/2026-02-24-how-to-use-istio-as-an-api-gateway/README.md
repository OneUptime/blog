# How to Use Istio as an API Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, API Gateway, Kubernetes, Ingresses, Traffic Management

Description: Configure Istio's ingress gateway to function as a full API gateway with routing, authentication, rate limiting, and request transformation.

---

Many teams run a separate API gateway (Kong, Ambassador, APISIX) in front of Istio's ingress gateway. But for a lot of use cases, Istio itself can serve as your API gateway. It handles TLS termination, request routing, authentication, rate limiting, and more. Using Istio directly eliminates an extra hop, reduces infrastructure complexity, and means you manage everything through Istio's configuration model.

## What an API Gateway Needs to Do

A typical API gateway handles:

- TLS termination
- Request routing based on path, headers, or query parameters
- Authentication (JWT validation)
- Authorization (role-based access)
- Rate limiting
- Request/response transformation
- CORS handling
- Load balancing

Istio's ingress gateway (which is just an Envoy proxy) can do all of these. Some features are native, and a few require EnvoyFilter configurations.

## Setting Up the Gateway

Start with a Gateway resource that terminates TLS:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: api-gateway
  namespace: istio-system
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
    tls:
      httpsRedirect: true
    hosts:
    - "api.example.com"
```

Create the TLS secret:

```bash
kubectl create secret tls api-tls-cert \
  --cert=fullchain.pem \
  --key=privkey.pem \
  -n istio-system
```

## API Routing

Define routing rules with VirtualService. This is the core of the API gateway functionality:

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
  - istio-system/api-gateway
  http:
  # User service routes
  - match:
    - uri:
        prefix: "/v1/users"
    route:
    - destination:
        host: user-service.backend.svc.cluster.local
        port:
          number: 8080

  # Order service routes
  - match:
    - uri:
        prefix: "/v1/orders"
    route:
    - destination:
        host: order-service.backend.svc.cluster.local
        port:
          number: 8080

  # Product service routes
  - match:
    - uri:
        prefix: "/v1/products"
    route:
    - destination:
        host: product-service.backend.svc.cluster.local
        port:
          number: 8080

  # Health check endpoint
  - match:
    - uri:
        exact: "/health"
    route:
    - destination:
        host: health-service.backend.svc.cluster.local
        port:
          number: 8080
```

## Path Rewriting

Sometimes your backend services don't expect the same path prefix. Rewrite paths before forwarding:

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
  - istio-system/api-gateway
  http:
  - match:
    - uri:
        prefix: "/v1/users"
    rewrite:
      uri: "/users"
    route:
    - destination:
        host: user-service.backend.svc.cluster.local
        port:
          number: 8080
```

Requests to `/v1/users/123` get forwarded to the user service as `/users/123`.

## JWT Authentication

Add JWT validation at the gateway so only authenticated requests reach your services:

```yaml
apiVersion: security.istio.io/v1
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
    outputPayloadToHeader: "x-jwt-payload"
```

This validates JWT tokens in the Authorization header. Invalid tokens get a 401 response. The `forwardOriginalToken` setting passes the token to backend services so they can also inspect it.

## Authorization Based on JWT Claims

After validating the JWT, enforce authorization based on claims:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: api-authorization
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
  # Public endpoints - no auth required
  - to:
    - operation:
        paths: ["/health", "/v1/products*"]
        methods: ["GET"]

  # Authenticated user endpoints
  - from:
    - source:
        requestPrincipals: ["https://auth.example.com/*"]
    to:
    - operation:
        paths: ["/v1/users*", "/v1/orders*"]
        methods: ["GET"]

  # Admin-only endpoints
  - from:
    - source:
        requestPrincipals: ["https://auth.example.com/*"]
    to:
    - operation:
        paths: ["/v1/users*"]
        methods: ["POST", "PUT", "DELETE"]
    when:
    - key: request.auth.claims[role]
      values: ["admin"]
```

This creates a tiered access model: public endpoints, authenticated endpoints, and admin-only endpoints.

## CORS Configuration

For browser-based API clients, configure CORS at the VirtualService level:

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
  - istio-system/api-gateway
  http:
  - match:
    - uri:
        prefix: "/v1/"
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
      exposeHeaders:
      - x-request-id
      maxAge: "86400s"
      allowCredentials: true
    route:
    - destination:
        host: api-service.backend.svc.cluster.local
        port:
          number: 8080
```

## Timeouts and Retries

Configure timeouts and retries per route:

```yaml
http:
- match:
  - uri:
      prefix: "/v1/users"
  timeout: 10s
  retries:
    attempts: 3
    perTryTimeout: 3s
    retryOn: "5xx,reset,connect-failure,retriable-4xx"
  route:
  - destination:
      host: user-service.backend.svc.cluster.local
```

Different endpoints can have different timeout and retry configurations based on their characteristics. A fast lookup endpoint gets a 3-second timeout. A report generation endpoint gets 60 seconds.

## Header-Based Routing

Route requests based on headers for A/B testing or canary deployments:

```yaml
http:
- match:
  - headers:
      x-api-version:
        exact: "v2"
    uri:
      prefix: "/v1/orders"
  route:
  - destination:
      host: order-service-v2.backend.svc.cluster.local
      port:
        number: 8080
- match:
  - uri:
      prefix: "/v1/orders"
  route:
  - destination:
      host: order-service.backend.svc.cluster.local
      port:
        number: 8080
```

Requests with the `x-api-version: v2` header go to the v2 service. Everything else goes to the stable version.

## Rate Limiting

Add basic rate limiting at the gateway using Envoy's local rate limiter:

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
            name: "envoy.filters.network.http_connection_manager"
            subFilter:
              name: "envoy.filters.http.router"
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
              max_tokens: 500
              tokens_per_fill: 500
              fill_interval: 60s
```

This limits the gateway to 500 requests per minute. For per-user or per-API-key rate limiting, you'll need an external rate limiting service.

## Monitoring the API Gateway

Use Prometheus to monitor your gateway:

```text
# Request rate by path
sum(rate(istio_requests_total{reporter="destination",destination_service_name="istio-ingressgateway"}[5m])) by (request_url_path)

# Error rate
sum(rate(istio_requests_total{reporter="destination",destination_service_name="istio-ingressgateway",response_code=~"5.."}[5m]))

# Latency P99
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination",destination_service_name="istio-ingressgateway"}[5m])) by (le))
```

Using Istio as an API gateway works well for many use cases and eliminates the need for a separate gateway product. You get native integration with the mesh, consistent configuration, and one less component to manage. For advanced features like API key management, developer portals, or complex rate limiting, you might still want a dedicated API gateway, but for traffic management and security, Istio handles it well.
