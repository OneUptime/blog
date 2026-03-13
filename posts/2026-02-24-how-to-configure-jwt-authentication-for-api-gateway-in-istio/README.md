# How to Configure JWT Authentication for API Gateway in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, JWT, API Gateway, RequestAuthentication, Ingresses

Description: How to set up JWT authentication at the Istio ingress gateway to validate tokens before traffic enters your mesh services.

---

Validating JWTs at the API gateway level means tokens are checked before traffic even reaches your backend services. This reduces load on backends, provides a single enforcement point, and simplifies your security architecture. In Istio, the ingress gateway is just another Envoy proxy, so you can apply RequestAuthentication directly to it.

## Why Validate at the Gateway?

Validating JWTs at individual services works, but it has drawbacks:

- Every service needs its own RequestAuthentication policy.
- Invalid requests consume bandwidth and processing reaching backend services.
- A misconfigured service might skip validation entirely.

Moving validation to the gateway gives you:

- A single point of JWT validation for all incoming traffic.
- Bad tokens are rejected at the edge, saving backend resources.
- Easier to audit and manage one policy instead of dozens.

You can still add service-level JWT validation for defense in depth, but the gateway handles the first line of defense.

## Identifying the Gateway Workload

Istio's ingress gateway runs as a deployment in the `istio-system` namespace (or wherever your gateway is installed). Find it:

```bash
kubectl get pods -n istio-system -l istio=ingressgateway
```

Check the labels:

```bash
kubectl get pods -n istio-system -l istio=ingressgateway --show-labels
```

The key label is usually `istio: ingressgateway`. You'll use this in the selector.

## Setting Up RequestAuthentication on the Gateway

Apply the RequestAuthentication to the gateway namespace with the gateway's labels:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: gateway-jwt-auth
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      audiences:
        - "https://api.example.com"
      forwardOriginalToken: true
```

The `forwardOriginalToken: true` setting passes the validated token to backend services, so they can extract claims if needed.

## Requiring JWT at the Gateway

Add an AuthorizationPolicy to block requests without valid tokens:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: gateway-require-jwt
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

## Allowing Public Routes

Not every route through the gateway needs authentication. Allow public paths:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: gateway-public-routes
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
    - to:
        - operation:
            paths:
              - "/health"
              - "/public/*"
              - "/docs/*"
              - "/swagger/*"
              - "/.well-known/*"
```

## Route-Specific Authentication

Different routes might need different authentication. Use the `to` field in AuthorizationPolicy:

```yaml
# JWT required for API routes
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: api-routes-require-jwt
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
      to:
        - operation:
            paths: ["/api/*"]
```

This only requires JWT for paths starting with `/api/`. Other routes are unaffected by this policy.

## Multiple JWT Providers at the Gateway

If your API serves different types of clients (web app users via Auth0, mobile via Firebase, services via Keycloak):

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: gateway-multi-jwt
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  jwtRules:
    # Auth0 for web app users
    - issuer: "https://myapp.auth0.com/"
      jwksUri: "https://myapp.auth0.com/.well-known/jwks.json"
      audiences:
        - "https://api.example.com"
      forwardOriginalToken: true

    # Firebase for mobile users
    - issuer: "https://securetoken.google.com/my-project"
      jwksUri: "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
      audiences:
        - "my-project"
      forwardOriginalToken: true

    # Keycloak for internal services
    - issuer: "https://keycloak.example.com/realms/services"
      jwksUri: "https://keycloak.example.com/realms/services/protocol/openid-connect/certs"
      forwardOriginalToken: true
```

## Gateway with Virtual Services

The RequestAuthentication and AuthorizationPolicy on the gateway work alongside your VirtualService routing. The flow is:

1. Request arrives at the gateway.
2. JWT validation (RequestAuthentication) runs.
3. Authorization check (AuthorizationPolicy) runs.
4. If both pass, VirtualService routing kicks in.
5. Request is forwarded to the backend service.

```yaml
# VirtualService for routing
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-routes
  namespace: backend
spec:
  hosts:
    - "api.example.com"
  gateways:
    - istio-system/main-gateway
  http:
    - match:
        - uri:
            prefix: /api/users
      route:
        - destination:
            host: user-service
            port:
              number: 8080
    - match:
        - uri:
            prefix: /api/orders
      route:
        - destination:
            host: order-service
            port:
              number: 8080
```

## Host-Based JWT Rules

If your gateway serves multiple domains, you can combine AuthorizationPolicy with host-based rules:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: gateway-host-auth
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
      to:
        - operation:
            hosts: ["api.example.com"]
            paths: ["/api/*"]
```

This requires JWT only for API paths on `api.example.com`. Requests to other hosts pass through.

## Complete Gateway JWT Setup

Here's a full production-like configuration:

```yaml
# Gateway definition
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
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
---
# RequestAuthentication
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
      audiences:
        - "https://api.example.com"
      forwardOriginalToken: true
---
# Allow public endpoints
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: gateway-allow-public
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
    - to:
        - operation:
            paths: ["/health", "/public/*"]
---
# Require JWT for protected endpoints
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: gateway-require-jwt
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
      to:
        - operation:
            paths: ["/api/*"]
```

## Testing

```bash
GATEWAY_URL=$(kubectl -n istio-system get svc istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Public endpoint - no token needed
curl -s -o /dev/null -w "%{http_code}" https://api.example.com/health --resolve "api.example.com:443:$GATEWAY_URL"

# Protected endpoint without token - should get 403
curl -s -o /dev/null -w "%{http_code}" https://api.example.com/api/users --resolve "api.example.com:443:$GATEWAY_URL"

# Protected endpoint with token - should get 200
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/users --resolve "api.example.com:443:$GATEWAY_URL"
```

## Debugging Gateway JWT Issues

```bash
# Check gateway proxy logs
kubectl logs -n istio-system deploy/istio-ingressgateway --tail=100 | grep -i jwt

# Check Envoy stats on the gateway
kubectl exec -n istio-system deploy/istio-ingressgateway -- curl -s localhost:15000/stats | grep jwt

# Describe the gateway pod
istioctl x describe pod <gateway-pod> -n istio-system
```

Setting up JWT validation at the Istio gateway is the most efficient way to secure your APIs. It catches bad tokens at the edge, works with multiple identity providers, and lets you define route-specific authentication rules. Combine it with per-service validation for defense in depth.
