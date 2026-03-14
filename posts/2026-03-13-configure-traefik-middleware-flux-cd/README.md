# How to Configure Traefik Middleware with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Traefik, Middleware, Rate Limiting, Authentication

Description: Manage Traefik Middleware resources for request transformation, rate limiting, and authentication using Flux CD GitOps to create reusable, composable API gateway policies.

---

## Introduction

Traefik Middleware is the mechanism for transforming requests and responses as they flow through the gateway. Middleware can add authentication, enforce rate limits, modify headers, compress responses, redirect URLs, and perform dozens of other transformations. The key advantage of Traefik's middleware model is composability: you define each capability as an independent Middleware resource and attach them to routes in any combination.

Managing Middleware through Flux CD creates a library of reusable gateway policies that teams can reference in their IngressRoute definitions. When the security team updates the rate limiting policy, they submit a pull request to the Middleware YAML file, which is reviewed, merged, and automatically applied to all routes that reference it. This centralized policy management eliminates the inconsistency of per-service security configurations.

## Prerequisites

- Traefik deployed in your cluster (see the Traefik Let's Encrypt guide)
- Flux CD bootstrapped and connected to your Git repository
- kubectl with access to your cluster
- Basic understanding of Traefik IngressRoute resources

## Step 1: Security Headers Middleware

Create Middleware that adds security headers to all responses.

```yaml
# infrastructure/traefik/middleware/security-headers.yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: security-headers
  namespace: traefik
  labels:
    app.kubernetes.io/managed-by: flux
    middleware-type: security
spec:
  headers:
    # Prevent clickjacking
    frameDeny: true
    # Enable browser XSS protection
    browserXssFilter: true
    # Prevent MIME type sniffing
    contentTypeNosniff: true
    # Force HTTPS for 1 year
    stsSeconds: 31536000
    stsIncludeSubdomains: true
    stsPreload: true
    # Content Security Policy
    customResponseHeaders:
      X-Permitted-Cross-Domain-Policies: "none"
      Referrer-Policy: "strict-origin-when-cross-origin"
      Permissions-Policy: "camera=(), microphone=(), geolocation=()"
    # Remove server identification headers
    customRequestHeaders:
      X-Powered-By: ""
      Server: ""
```

## Step 2: Rate Limiting Middleware

Define rate limiting policies for different route tiers.

```yaml
# infrastructure/traefik/middleware/rate-limits.yaml
# Standard rate limit for most API endpoints
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: rate-limit-standard
  namespace: traefik
spec:
  rateLimit:
    # 100 requests per second per source IP
    average: 100
    burst: 200
    period: 1s
    sourceCriterion:
      ipStrategy:
        depth: 1  # Trust the first IP in X-Forwarded-For
---
# Strict rate limit for authentication endpoints
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: rate-limit-auth
  namespace: traefik
spec:
  rateLimit:
    # 5 requests per minute for auth endpoints (brute force protection)
    average: 5
    burst: 10
    period: 60s
    sourceCriterion:
      ipStrategy:
        depth: 1
---
# Generous limit for internal services
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: rate-limit-internal
  namespace: traefik
spec:
  rateLimit:
    average: 1000
    burst: 2000
    period: 1s
```

## Step 3: Basic Authentication Middleware

Protect internal endpoints with basic authentication.

```yaml
# infrastructure/traefik/middleware/basic-auth.yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: dashboard-auth
  namespace: traefik
spec:
  basicAuth:
    # Reference a secret containing htpasswd-formatted credentials
    # Create with: htpasswd -nb admin STRONG_PASSWORD | base64
    secret: traefik-dashboard-auth
    # Remove the Authorization header before forwarding to upstream
    removeHeader: true
```

```bash
# Create the auth secret (manage with Sealed Secrets in production)
htpasswd -nb admin STRONG_PASSWORD > auth
kubectl create secret generic traefik-dashboard-auth \
  --from-file=users=auth \
  -n traefik
```

## Step 4: Request Forwarding and Compression

Configure compression and request forwarding Middleware.

```yaml
# infrastructure/traefik/middleware/compression.yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: compress
  namespace: traefik
spec:
  compress:
    # Minimum response size to compress (bytes)
    minResponseBodyBytes: 1024
    # Excluded content types
    excludedContentTypes:
      - image/png
      - image/jpeg
      - image/gif
      - image/webp
---
# Strip path prefix before forwarding to upstream
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: strip-api-prefix
  namespace: traefik
spec:
  stripPrefix:
    prefixes:
      - /api/v1
    forceSlash: true
---
# Redirect HTTP to HTTPS
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: https-redirect
  namespace: traefik
spec:
  redirectScheme:
    scheme: https
    permanent: true
```

## Step 5: Middleware Chain Composition

Compose multiple Middlewares into a named chain for clean IngressRoute references.

```yaml
# infrastructure/traefik/middleware/chains.yaml
# Standard API middleware chain
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: api-standard
  namespace: traefik
spec:
  chain:
    middlewares:
      - name: security-headers
        namespace: traefik
      - name: rate-limit-standard
        namespace: traefik
      - name: compress
        namespace: traefik
---
# Auth endpoint chain with strict rate limiting
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: auth-endpoint
  namespace: traefik
spec:
  chain:
    middlewares:
      - name: security-headers
        namespace: traefik
      - name: rate-limit-auth
        namespace: traefik
```

## Step 6: Apply Middleware to IngressRoutes

Reference Middleware in IngressRoute definitions from application namespaces.

```yaml
# apps/backend/api-ingressroute.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: api-server
  namespace: backend
spec:
  entryPoints:
    - websecure
  routes:
    # Standard API routes
    - match: Host(`api.example.com`) && PathPrefix(`/api`)
      kind: Rule
      services:
        - name: api-server
          port: 8080
      middlewares:
        # Reference the chain from the traefik namespace
        - name: api-standard
          namespace: traefik

    # Auth endpoint with strict rate limiting
    - match: Host(`api.example.com`) && PathPrefix(`/auth`)
      kind: Rule
      priority: 50
      services:
        - name: api-server
          port: 8080
      middlewares:
        - name: auth-endpoint
          namespace: traefik
  tls:
    certResolver: letsencrypt
```

```yaml
# clusters/production/traefik-middleware-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: traefik-middleware
  namespace: flux-system
spec:
  interval: 5m
  path: ./infrastructure/traefik/middleware
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: traefik
```

## Best Practices

- Store shared Middleware resources in the `traefik` namespace so they can be referenced from any application namespace; application-specific Middleware can live in application namespaces.
- Use Middleware chains to compose complex policies from simple building blocks; this makes the policy library easy to understand and reduces duplication.
- Validate Middleware configuration changes against Traefik's `/api/rawdata` endpoint before merging; invalid Middleware silently fails and leaves routes unprotected.
- Apply security headers Middleware globally using Traefik's `http.middlewares` default configuration rather than attaching it to every IngressRoute individually.
- Test rate limiting behavior under load before setting production limits; too-low limits cause legitimate traffic to be rejected; too-high limits provide no protection.
- Document each Middleware's purpose in a label or annotation so IngressRoute authors understand what protection each chain provides.

## Conclusion

Traefik Middleware managed through Flux CD creates a centralized, auditable library of API gateway policies. Security headers, rate limiting, and authentication are defined once, reviewed once, and referenced across all routes - ensuring consistent protection without per-service configuration duplication. The GitOps model means every policy change is traceable, reviewable, and instantly reversible.
