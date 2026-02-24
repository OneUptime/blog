# How to Configure Ingress Security in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ingress Security, TLS, Gateway, Kubernetes, Authentication

Description: How to secure Istio ingress gateways with TLS termination, JWT authentication, rate limiting, CORS, and authorization policies.

---

The ingress gateway is the front door to your service mesh. Every request from the outside world passes through it, making it the most critical point for security configuration. A misconfigured ingress gateway can expose internal services, leak sensitive data, or let attackers bypass your mesh security policies.

Securing the ingress gateway involves several layers: TLS termination, authentication, authorization, rate limiting, and request validation. Getting all of these right creates a robust security boundary.

## TLS Configuration

Always terminate TLS at the gateway. Never expose plain HTTP to the internet.

### Simple TLS

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: secure-gateway
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
        credentialName: my-tls-credential
      hosts:
        - "app.example.com"
```

Create the TLS secret in the `istio-system` namespace (where the gateway runs):

```bash
kubectl create secret tls my-tls-credential \
  --cert=cert.pem \
  --key=key.pem \
  -n istio-system
```

### Mutual TLS (Client Certificates)

For APIs that require client certificate authentication:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: mtls-gateway
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
        mode: MUTUAL
        credentialName: my-mtls-credential
      hosts:
        - "api.example.com"
```

The secret for mutual TLS needs the CA certificate in addition to the server cert and key:

```bash
kubectl create secret generic my-mtls-credential \
  --from-file=tls.crt=server-cert.pem \
  --from-file=tls.key=server-key.pem \
  --from-file=ca.crt=ca-cert.pem \
  -n istio-system
```

### Redirect HTTP to HTTPS

Force all HTTP traffic to HTTPS:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: redirect-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      tls:
        httpsRedirect: true
      hosts:
        - "app.example.com"
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: my-tls-credential
      hosts:
        - "app.example.com"
```

## JWT Authentication at the Gateway

Validate JWT tokens at the ingress gateway so that only authenticated requests enter the mesh:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: gateway-jwt
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      fromHeaders:
        - name: Authorization
          prefix: "Bearer "
      forwardOriginalToken: true
```

This validates JWT tokens but still allows requests without tokens. To require authentication:

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
            requestPrincipals:
              - "*"
      to:
        - operation:
            paths:
              - /api/*
    - to:
        - operation:
            paths:
              - /public/*
              - /health
```

This requires a valid JWT for `/api/*` paths but allows unauthenticated access to `/public/*` and `/health`.

## IP-Based Access Control

Restrict access to the gateway based on client IP:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ip-allowlist
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: DENY
  rules:
    - from:
        - source:
            notIpBlocks:
              - 203.0.113.0/24
              - 198.51.100.0/24
      to:
        - operation:
            paths:
              - /admin/*
```

This blocks access to `/admin/*` from any IP not in the allowed ranges.

Note that IP-based filtering depends on the `externalTrafficPolicy` of the gateway Service. If set to `Cluster` (the default), client IPs are lost due to SNAT. Set it to `Local` to preserve client IPs:

```bash
kubectl patch service istio-ingressgateway -n istio-system \
  -p '{"spec":{"externalTrafficPolicy":"Local"}}'
```

## CORS Configuration

Configure Cross-Origin Resource Sharing at the ingress:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: app-ingress
  namespace: default
spec:
  hosts:
    - "app.example.com"
  gateways:
    - secure-gateway
  http:
    - corsPolicy:
        allowOrigins:
          - exact: "https://frontend.example.com"
          - regex: "https://.*\\.example\\.com"
        allowMethods:
          - GET
          - POST
          - PUT
          - DELETE
          - OPTIONS
        allowHeaders:
          - Authorization
          - Content-Type
          - X-Requested-With
        exposeHeaders:
          - X-Request-Id
        maxAge: 86400s
        allowCredentials: true
      route:
        - destination:
            host: app-service.default.svc.cluster.local
            port:
              number: 8080
```

## Security Headers

Add security headers to all responses through the gateway using an EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: security-headers
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
          name: envoy.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            default_source_code:
              inline_string: |
                function envoy_on_response(response_handle)
                  response_handle:headers():add("X-Frame-Options", "DENY")
                  response_handle:headers():add("X-Content-Type-Options", "nosniff")
                  response_handle:headers():add("X-XSS-Protection", "1; mode=block")
                  response_handle:headers():add("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
                  response_handle:headers():add("Referrer-Policy", "strict-origin-when-cross-origin")
                end
```

## Rate Limiting at the Gateway

Protect your services from abuse by limiting request rates. Istio supports local rate limiting through EnvoyFilter:

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
                  key: x-rate-limited
                  value: "true"
```

This limits all traffic through the gateway to 100 requests per 60 seconds per gateway pod.

## Monitoring Ingress Security

Track security-related metrics at the gateway:

```bash
# Check authorization policy denials
kubectl exec -it <gateway-pod> -c istio-proxy -n istio-system -- \
  pilot-agent request GET stats | grep "rbac"

# Check TLS handshake failures
kubectl exec -it <gateway-pod> -c istio-proxy -n istio-system -- \
  pilot-agent request GET stats | grep "ssl.handshake\|ssl.fail"

# Check rate limiting
kubectl exec -it <gateway-pod> -c istio-proxy -n istio-system -- \
  pilot-agent request GET stats | grep "rate_limit"
```

## Testing Ingress Security

Test your security configuration:

```bash
# Test HTTPS
curl -v https://app.example.com/api/data

# Test HTTP redirect
curl -v http://app.example.com/api/data

# Test without JWT (should get 403 on protected paths)
curl -s -o /dev/null -w "%{http_code}" https://app.example.com/api/data

# Test with JWT
curl -H "Authorization: Bearer <token>" https://app.example.com/api/data

# Test IP restriction
curl -s -o /dev/null -w "%{http_code}" https://app.example.com/admin/panel
```

Ingress security in Istio is about stacking multiple layers: TLS for encryption, JWT for authentication, AuthorizationPolicy for access control, rate limiting for abuse prevention, and security headers for browser protection. Each layer catches different threats, and together they create a comprehensive security boundary at the edge of your mesh.
