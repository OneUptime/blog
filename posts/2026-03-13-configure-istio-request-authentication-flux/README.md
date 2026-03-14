# How to Configure Istio Request Authentication with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Istio, RequestAuthentication, JWT, Service Mesh, Security

Description: Manage Istio RequestAuthentication resources for JWT validation using Flux CD to enforce token-based authentication at the service mesh layer.

---

## Introduction

Istio's RequestAuthentication resource configures JSON Web Token (JWT) validation at the proxy level, offloading authentication from your application code to the service mesh. When a request arrives with a JWT, Istio validates the signature against the configured JWKS URI before forwarding the request to your service.

Managing RequestAuthentication resources through Flux CD ensures your JWT issuer configuration, JWKS endpoints, and token location settings are version-controlled. Changes to authentication configuration - such as adding a new identity provider - go through the same pull request process as application code.

This guide covers configuring Istio RequestAuthentication for multiple JWT providers using Flux CD.

## Prerequisites

- Kubernetes cluster with Istio installed
- Flux CD v2 bootstrapped to your Git repository
- An OIDC identity provider (Auth0, Keycloak, Cognito, Google, etc.)
- Services running in Istio-injected namespaces

## Step 1: Create a RequestAuthentication Resource

```yaml
# clusters/my-cluster/istio-auth/request-authentication.yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: production
spec:
  # Apply to all services in the production namespace (no selector = all pods)
  selector:
    matchLabels:
      require-auth: "true"
  jwtRules:
    # Primary OIDC provider (Auth0)
    - issuer: "https://myapp.auth0.com/"
      jwksUri: "https://myapp.auth0.com/.well-known/jwks.json"
      # Where to look for the JWT token
      forwardOriginalToken: true
      # Extract JWT from Authorization: Bearer header
      fromHeaders:
        - name: Authorization
          prefix: "Bearer "
      # Also check cookie (for browser clients)
      fromCookies:
        - "access_token"
    # Secondary provider (internal service accounts via Google)
    - issuer: "https://accounts.google.com"
      jwksUri: "https://www.googleapis.com/oauth2/v3/certs"
      audiences:
        - "my-app-client-id"
      forwardOriginalToken: true
```

## Step 2: Apply to the Ingress Gateway

```yaml
# clusters/my-cluster/istio-auth/gateway-jwt-auth.yaml
# Validate JWTs at the ingress gateway for all incoming traffic
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
    - issuer: "https://myapp.auth0.com/"
      jwksUri: "https://myapp.auth0.com/.well-known/jwks.json"
      forwardOriginalToken: true
      fromHeaders:
        - name: Authorization
          prefix: "Bearer "
```

## Step 3: Combine with AuthorizationPolicy for Enforcement

RequestAuthentication alone does not reject unauthenticated requests - it only validates tokens when present. Pair with AuthorizationPolicy to enforce authentication:

```yaml
# clusters/my-cluster/istio-auth/require-jwt-policy.yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: production
spec:
  selector:
    matchLabels:
      require-auth: "true"
  action: ALLOW
  rules:
    - from:
        - source:
            # Only allow requests with a valid JWT principal
            requestPrincipals:
              - "https://myapp.auth0.com//*"
              - "https://accounts.google.com/*"
```

## Step 4: Allow Unauthenticated Health Check Endpoints

```yaml
# clusters/my-cluster/istio-auth/allow-health-checks.yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-health-checks
  namespace: production
spec:
  selector:
    matchLabels:
      require-auth: "true"
  action: ALLOW
  rules:
    - to:
        # Allow unauthenticated access to health/readiness endpoints
        - operation:
            methods: ["GET"]
            paths: ["/health", "/ready", "/metrics"]
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/istio-auth/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - request-authentication.yaml
  - gateway-jwt-auth.yaml
  - require-jwt-policy.yaml
  - allow-health-checks.yaml
---
# clusters/my-cluster/flux-kustomization-istio-request-auth.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: istio-request-auth
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: istio
  path: ./clusters/my-cluster/istio-auth
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 6: Test JWT Validation

```bash
# Get a valid JWT from your provider
TOKEN=$(curl -X POST https://myapp.auth0.com/oauth/token \
  -H "Content-Type: application/json" \
  -d '{"grant_type":"client_credentials","client_id":"...","client_secret":"...","audience":"..."}' \
  | jq -r .access_token)

# Test with valid token (should succeed)
GATEWAY_IP=$(kubectl get svc istio-ingressgateway -n istio-system \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

curl -H "Authorization: Bearer $TOKEN" \
     -H "Host: api.example.com" \
     http://$GATEWAY_IP/api/data

# Test without token (should return 403)
curl -H "Host: api.example.com" http://$GATEWAY_IP/api/data

# Check Istio proxy logs for JWT validation results
kubectl logs -n production deploy/api-service -c istio-proxy \
  | grep "jwt"
```

## Best Practices

- Use `forwardOriginalToken: true` to pass the validated JWT to your application so it can extract claims without re-validating the signature.
- Always pair `RequestAuthentication` with `AuthorizationPolicy` - the former validates tokens, but only the latter rejects requests without valid tokens.
- Create a separate `AuthorizationPolicy` to allow unauthenticated access to health check endpoints, preventing liveness probe failures on authenticated services.
- Cache the JWKS response by placing a caching proxy in front of your JWKS URI if your OIDC provider has rate limits on the JWKS endpoint.
- Rotate OIDC provider configurations by adding a new `jwtRules` entry, deploying, then removing the old one - this ensures zero-downtime provider migrations.

## Conclusion

Istio RequestAuthentication managed through Flux CD provides a GitOps-controlled, mesh-level JWT validation layer that eliminates per-service authentication boilerplate. Identity provider changes, audience configurations, and token location settings are all version-controlled pull requests, giving security teams the auditability and control they need over your authentication infrastructure.
