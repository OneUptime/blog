# How to Implement API Gateway Functionality with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, API Gateway, Traffic Management, Rate Limiting, Authentication

Description: How to use Istio as a full-featured API gateway with routing, rate limiting, authentication, and traffic management capabilities.

---

Many teams deploy a dedicated API gateway like Kong or AWS API Gateway alongside Istio, but you can handle most API gateway responsibilities directly through Istio. The ingress gateway combined with VirtualService, DestinationRule, AuthorizationPolicy, and EnvoyFilter covers routing, rate limiting, authentication, request transformation, and more. Here is how to build out API gateway functionality using what Istio already provides.

## Setting Up the Ingress Gateway

The Istio ingress gateway is your entry point. Configure it to handle your API domains:

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

This sets up TLS termination and forces HTTP-to-HTTPS redirect.

## API Routing

Route different API paths to different backend services:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-routes
spec:
  hosts:
    - api.example.com
  gateways:
    - istio-system/api-gateway
  http:
    - match:
        - uri:
            prefix: /api/v1/users
      rewrite:
        uri: /users
      route:
        - destination:
            host: user-service
            port:
              number: 8080
      timeout: 10s
      retries:
        attempts: 3
        perTryTimeout: 3s
        retryOn: 5xx,reset,connect-failure
    - match:
        - uri:
            prefix: /api/v1/orders
      rewrite:
        uri: /orders
      route:
        - destination:
            host: order-service
            port:
              number: 8080
      timeout: 15s
    - match:
        - uri:
            prefix: /api/v1/products
      rewrite:
        uri: /products
      route:
        - destination:
            host: product-service
            port:
              number: 8080
      timeout: 5s
```

Each route can have its own timeout, retry policy, and path rewriting.

## JWT Authentication

Use Istio's RequestAuthentication to validate JWT tokens:

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
    - issuer: "https://auth.example.com/"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      forwardOriginalToken: true
      outputPayloadToHeader: x-jwt-payload
```

Then enforce authentication with AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-auth
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  rules:
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            paths: ["/api/v1/*"]
    - to:
        - operation:
            paths: ["/api/v1/public/*", "/health"]
```

This requires authentication for all `/api/v1/*` paths except `/api/v1/public/*` and `/health`.

## Rate Limiting

Istio supports rate limiting through EnvoyFilter. Here is a local rate limit configuration:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: api-rate-limit
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
            "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
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
                  key: x-rate-limit-limit
                  value: "100"
```

This limits requests to 100 per minute per gateway pod.

## Request/Response Transformation

Add common headers and strip sensitive ones:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-routes
spec:
  hosts:
    - api.example.com
  gateways:
    - istio-system/api-gateway
  http:
    - match:
        - uri:
            prefix: /api/v1
      route:
        - destination:
            host: api-service
            port:
              number: 8080
          headers:
            request:
              add:
                x-gateway-processed: "true"
            response:
              set:
                strict-transport-security: "max-age=31536000"
                x-content-type-options: "nosniff"
              remove:
                - server
                - x-powered-by
```

## Circuit Breaking

Protect your backends from being overwhelmed:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: user-service
spec:
  host: user-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
        maxRequestsPerConnection: 10
        maxRetries: 3
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

## Load Balancing

Configure how traffic is distributed across backend pods:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: product-service
spec:
  host: product-service
  trafficPolicy:
    loadBalancer:
      consistentHashLB:
        httpHeaderName: x-user-id
```

This uses consistent hashing based on the user ID header, ensuring the same user always hits the same backend pod. Useful for caching.

## CORS Configuration

Handle cross-origin requests at the gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-cors
spec:
  hosts:
    - api.example.com
  gateways:
    - istio-system/api-gateway
  http:
    - corsPolicy:
        allowOrigins:
          - exact: "https://app.example.com"
        allowMethods:
          - GET
          - POST
          - PUT
          - DELETE
          - OPTIONS
        allowHeaders:
          - authorization
          - content-type
        maxAge: "24h"
        allowCredentials: true
      route:
        - destination:
            host: api-service
            port:
              number: 8080
```

## Traffic Mirroring

Mirror production traffic to a shadow service for testing:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-mirror
spec:
  hosts:
    - api.example.com
  gateways:
    - istio-system/api-gateway
  http:
    - match:
        - uri:
            prefix: /api/v1
      route:
        - destination:
            host: api-service
            port:
              number: 8080
      mirror:
        host: api-service-shadow
        port:
          number: 8080
      mirrorPercentage:
        value: 10.0
```

This sends 10% of production traffic to the shadow service without affecting the primary response.

## Health Check Endpoint

Expose a health check that does not require authentication:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: gateway-health
spec:
  hosts:
    - api.example.com
  gateways:
    - istio-system/api-gateway
  http:
    - match:
        - uri:
            exact: /health
      directResponse:
        status: 200
        body:
          string: '{"status":"ok"}'
```

The `directResponse` feature lets the gateway respond directly without forwarding to a backend.

## Monitoring the API Gateway

Istio automatically collects metrics for the gateway. Query them with Prometheus:

```bash
# Request rate
istio_requests_total{destination_service_namespace="default",reporter="source"}

# Request duration
istio_request_duration_milliseconds_bucket{destination_service_namespace="default"}

# Error rate
istio_requests_total{response_code=~"5.*",reporter="source"}
```

Set up Grafana dashboards for real-time monitoring:

```bash
istioctl dashboard grafana
```

## Comparing with Dedicated API Gateways

Istio covers most API gateway features, but there are a few things dedicated API gateways do better:

- Developer portal and API documentation hosting
- API key management with self-service signup
- Advanced request/response transformation (body modification)
- Built-in analytics dashboards

If you need these features, consider running a lightweight API gateway like Kusk or using Istio alongside a portal solution. For pure traffic management, routing, security, and observability, Istio handles it well on its own.
