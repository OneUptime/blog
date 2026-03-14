# How to Configure Traefik IngressRoute with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Traefik, IngressRoute, API Gateway, Routing

Description: Manage Traefik IngressRoute CRD resources for advanced HTTP routing using Flux CD GitOps, covering path matching, header routing, and service load balancing.

---

## Introduction

Traefik's IngressRoute CRD extends the standard Kubernetes Ingress resource with much richer routing capabilities. While Kubernetes Ingress supports only basic host and path matching, IngressRoute supports complex route expressions using Traefik's routing DSL, header-based matching, query parameter routing, service weighting for canary deployments, and middleware attachment - all in a clean, expressive YAML format.

Managing IngressRoute resources through Flux CD gives your team a GitOps-first approach to API routing. Route changes are pull requests, production routing is the state of your Git repository, and rollbacks are simple git reverts. This guide covers the key IngressRoute patterns you need for production API management.

## Prerequisites

- Traefik deployed in your cluster (see the Traefik Let's Encrypt guide)
- Flux CD bootstrapped and connected to your Git repository
- kubectl with access to your cluster
- Backend services running in the cluster
- TLS certificates provisioned (either via Traefik's ACME or cert-manager)

## Step 1: Basic IngressRoute

Create a basic IngressRoute for HTTP routing to a backend service.

```yaml
# apps/backend/ingressroute.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: api-server-route
  namespace: backend
  labels:
    app.kubernetes.io/managed-by: flux
spec:
  # Listen on the websecure entry point (HTTPS, port 443)
  entryPoints:
    - websecure
  routes:
    - match: Host(`api.example.com`) && PathPrefix(`/api/v1`)
      kind: Rule
      services:
        - name: api-server
          port: 8080
          # Sticky sessions for stateful workloads
          sticky:
            cookie:
              name: traefik_api_session
              httpOnly: true
              secure: true
  tls:
    # Reference the certificate secret or use certResolver
    secretName: api-example-tls
```

## Step 2: Advanced Routing with Multiple Rules

Define multiple routing rules in a single IngressRoute for complex routing scenarios.

```yaml
# apps/backend/ingressroute-advanced.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: backend-routing
  namespace: backend
spec:
  entryPoints:
    - websecure
  routes:
    # Route API v2 requests to the new service
    - match: Host(`api.example.com`) && PathPrefix(`/api/v2`)
      kind: Rule
      priority: 20  # Higher priority rules match first
      services:
        - name: api-server-v2
          port: 8080

    # Route all other API requests to v1
    - match: Host(`api.example.com`) && PathPrefix(`/api`)
      kind: Rule
      priority: 10
      services:
        - name: api-server-v1
          port: 8080

    # Static files served by CDN proxy
    - match: Host(`api.example.com`) && PathPrefix(`/static`)
      kind: Rule
      services:
        - name: cdn-proxy
          port: 80

    # Healthcheck endpoint - no auth required
    - match: Host(`api.example.com`) && Path(`/health`)
      kind: Rule
      priority: 100
      services:
        - name: api-server-v1
          port: 8080
  tls:
    certResolver: letsencrypt
```

## Step 3: Header-Based Routing

Route requests to different backends based on request headers, useful for tenant isolation or feature flags.

```yaml
# apps/backend/ingressroute-headers.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: beta-feature-routing
  namespace: backend
spec:
  entryPoints:
    - websecure
  routes:
    # Route beta users to the new backend
    - match: Host(`api.example.com`) && HeaderRegexp(`X-Beta-User`, `true`)
      kind: Rule
      priority: 50
      services:
        - name: api-server-beta
          port: 8080
      middlewares:
        - name: add-beta-header
          namespace: backend

    # All other users go to stable
    - match: Host(`api.example.com`)
      kind: Rule
      priority: 10
      services:
        - name: api-server-stable
          port: 8080
  tls:
    certResolver: letsencrypt
```

## Step 4: Traffic Weighting for Canary Deployments

Split traffic between service versions using weighted services in IngressRoute.

```yaml
# apps/backend/ingressroute-canary.yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: checkout-canary-route
  namespace: backend
  annotations:
    # Document the canary release progress
    canary/stable-weight: "90"
    canary/canary-weight: "10"
    canary/started: "2026-03-13"
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`api.example.com`) && PathPrefix(`/checkout`)
      kind: Rule
      services:
        # 90% to stable
        - name: checkout-service-v1
          port: 8080
          weight: 90
        # 10% to canary
        - name: checkout-service-v2
          port: 8080
          weight: 10
  tls:
    certResolver: letsencrypt
```

## Step 5: Deploy with Flux and Middleware

Combine IngressRoute with Middleware for authentication and rate limiting.

```yaml
# apps/backend/middleware.yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: add-beta-header
  namespace: backend
spec:
  headers:
    customResponseHeaders:
      X-Served-By: "beta-backend"
---
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: strip-api-prefix
  namespace: backend
spec:
  stripPrefix:
    prefixes:
      - /api/v1
```

```yaml
# clusters/production/routing-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: backend-routing
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/backend
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: traefik
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: api-server-v1
      namespace: backend
```

## Step 6: Validate IngressRoute Configuration

Verify that IngressRoute resources are working correctly.

```bash
# List all IngressRoutes in the cluster
kubectl get ingressroutes -A

# Check Traefik's view of all configured routes
kubectl port-forward -n traefik svc/traefik 9000:9000 &
curl http://localhost:9000/api/rawdata | jq '.routers'

# Test routing rules
curl -H "X-Beta-User: true" https://api.example.com/api/v1/test
curl https://api.example.com/api/v2/test

# Verify canary traffic distribution
for i in {1..10}; do
  curl -s https://api.example.com/checkout/status | jq '.version'
done

# Check Flux reconciliation
flux get kustomization backend-routing
```

## Best Practices

- Use explicit `priority` values on all routes rather than relying on rule complexity for ordering; explicit priorities make routing behavior predictable when multiple rules could match.
- Prefer IngressRoute over the standard Kubernetes Ingress resource when you need header routing, traffic weighting, or middleware composition; these features are not available in standard Ingress.
- Store IngressRoute resources in the same directory as the application they route to rather than in a centralized routing directory - this makes the relationship between services and routes obvious.
- Avoid wildcard host matching (`HostRegexp`) in production unless necessary; explicit host matching is more predictable and easier to audit.
- Use Traefik's `ServersTransport` CRD to configure TLS between Traefik and upstream services when your backends also use HTTPS.
- Monitor route changes through Traefik's API (`/api/rawdata`) when debugging routing issues; it shows the live routing table as Traefik sees it.

## Conclusion

Traefik IngressRoute resources managed through Flux CD provide a powerful, expressive routing layer that goes far beyond what standard Kubernetes Ingress supports. Traffic splitting, header-based routing, and middleware composition are all declarative YAML configurations in your Git repository. This combination gives platform teams the routing flexibility they need while maintaining the auditability and consistency guarantees of GitOps.
