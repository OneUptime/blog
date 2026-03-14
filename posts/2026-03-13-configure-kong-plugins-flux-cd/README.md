# How to Configure Kong Plugins with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Kong Gateway, Kong Plugins, API Gateway, Rate Limiting

Description: Manage Kong gateway plugins as Kubernetes CRDs using Flux CD GitOps to version control rate limiting, authentication, and request transformation plugin configurations.

---

## Introduction

Kong's plugin ecosystem is one of its most powerful features, providing ready-made implementations of rate limiting, authentication, request transformation, logging, and dozens of other API gateway capabilities. In Kubernetes, Kong exposes these plugins as Custom Resource Definitions (CRDs), allowing you to define plugin configurations as Kubernetes objects that can be managed by Flux CD.

Managing Kong plugins through Flux CD transforms plugin configuration from an administrative task into a GitOps workflow. Rate limiting rules, authentication settings, and CORS policies are all committed to Git with timestamps, authors, and meaningful commit messages. When a plugin misconfiguration causes issues, rolling back is as simple as reverting a Git commit.

This guide covers configuring the most commonly needed Kong plugins - rate limiting, key authentication, request transformation, and CORS - as Kubernetes CRDs managed through Flux CD.

## Prerequisites

- Kong Gateway deployed in your cluster (with or without a database)
- Kong Ingress Controller running (required for CRD-based plugin management)
- Flux CD bootstrapped and connected to your Git repository
- kubectl with access to your cluster
- Basic familiarity with Kong plugin concepts

## Step 1: Verify Kong CRDs Are Installed

Kong Ingress Controller installs the plugin CRDs automatically. Verify they are present.

```bash
# Check Kong CRDs are available
kubectl get crd | grep konghq.com

# Expected output includes:
# kongplugins.configuration.konghq.com
# kongclusterplugins.configuration.konghq.com
# kongconsumers.configuration.konghq.com
# kongingresses.configuration.konghq.com
```

## Step 2: Configure Rate Limiting Plugin

Define a rate limiting plugin as a KongPlugin CRD and apply it to specific routes.

```yaml
# apps/backend/kong-plugins/rate-limiting.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: rate-limit-per-ip
  namespace: backend
  labels:
    app.kubernetes.io/managed-by: flux
plugin: rate-limiting
config:
  # Allow 100 requests per minute per IP
  minute: 100
  # Allow 1000 requests per hour per IP
  hour: 1000
  # Use the remote IP as the rate limit key
  policy: local
  limit_by: ip
  # Return headers showing rate limit status
  header_name: X-RateLimit-Limit
  hide_client_headers: false
---
# Stricter rate limit for authentication endpoints
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: rate-limit-auth-strict
  namespace: backend
plugin: rate-limiting
config:
  minute: 10
  hour: 100
  policy: local
  limit_by: ip
```

## Step 3: Configure Key Authentication Plugin

Set up API key authentication for protected routes.

```yaml
# apps/backend/kong-plugins/key-auth.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: api-key-auth
  namespace: backend
plugin: key-auth
config:
  # Look for API key in the X-API-Key header
  key_names:
    - X-API-Key
  # Also accept key as a query parameter (optional)
  key_in_query: false
  key_in_header: true
  # Reject requests without a key
  anonymous: null
  hide_credentials: true  # Remove the key header before forwarding to upstream
```

```yaml
# Create a Kong Consumer with an API key
# apps/backend/kong-plugins/consumers.yaml
apiVersion: configuration.konghq.com/v1
kind: KongConsumer
metadata:
  name: mobile-app-consumer
  namespace: backend
  annotations:
    # Reference the credentials secret
    kubernetes.io/ingress.class: kong
username: mobile-app
# Credentials are stored in a Secret referenced by the consumer
credentials:
  - mobile-app-api-key
---
# The credential secret (manage with Sealed Secrets or ESO)
apiVersion: v1
kind: Secret
metadata:
  name: mobile-app-api-key
  namespace: backend
  labels:
    # Kong uses this label to find credential secrets
    konghq.com/credential: key-auth
type: Opaque
stringData:
  key: "REPLACE_WITH_SECURE_API_KEY"
```

## Step 4: Configure Request Transformation Plugin

Transform requests before they reach your upstream services.

```yaml
# apps/backend/kong-plugins/request-transformer.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: add-internal-headers
  namespace: backend
plugin: request-transformer
config:
  add:
    headers:
      # Add internal headers for backend services
      - "X-Internal-Request: true"
      - "X-Gateway-Version: kong-3.x"
  remove:
    headers:
      # Remove sensitive headers before forwarding
      - "X-Forwarded-For"
  replace:
    headers:
      # Normalize the host header
      - "Host: backend-internal.cluster.local"
```

## Step 5: Apply Plugins to Ingress Resources

Attach plugins to Kubernetes Ingress resources using annotations.

```yaml
# apps/backend/api-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-server
  namespace: backend
  annotations:
    kubernetes.io/ingress.class: kong
    # Apply multiple plugins using comma-separated names
    konghq.com/plugins: rate-limit-per-ip,api-key-auth,add-internal-headers
spec:
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-server
                port:
                  number: 8080
  tls:
    - hosts:
        - api.example.com
      secretName: api-example-tls
```

## Step 6: Configure Cluster-Level Plugins

Use KongClusterPlugin for plugins that should apply globally across all namespaces.

```yaml
# infrastructure/kong/plugins/global-cors.yaml
apiVersion: configuration.konghq.com/v1
kind: KongClusterPlugin
metadata:
  name: global-cors
  annotations:
    # This makes it a global plugin applied to all routes
    kubernetes.io/ingress.class: kong
  labels:
    global: "true"
plugin: cors
config:
  origins:
    - "https://app.example.com"
    - "https://admin.example.com"
  methods:
    - GET
    - POST
    - PUT
    - DELETE
    - OPTIONS
  headers:
    - Authorization
    - Content-Type
    - X-API-Key
  exposed_headers:
    - X-RateLimit-Limit
    - X-RateLimit-Remaining
  max_age: 3600
  credentials: true
```

```yaml
# clusters/production/kong-plugins-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kong-plugins
  namespace: flux-system
spec:
  interval: 5m
  path: ./infrastructure/kong/plugins
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: kong
```

## Best Practices

- Use KongClusterPlugin for organization-wide policies (CORS, logging, security headers) and KongPlugin for service-specific settings (rate limits, authentication).
- Store plugin configuration in separate files per plugin rather than combining multiple plugins in one file; this makes diffs more readable in pull requests.
- Test plugin configurations in a staging environment with Kong's `/debug/config` admin endpoint to verify plugins are loaded correctly before promoting to production.
- Version your plugin configurations with semantic version annotations in the CRD metadata to track breaking changes.
- Avoid storing secrets (API keys, passwords) directly in KongPlugin CRDs; use KongConsumer credential Secrets managed by Sealed Secrets or External Secrets Operator.
- Monitor plugin performance through Kong's Prometheus metrics; some plugins (like rate-limiting with Redis policy) have significant latency impacts when the backing store is slow.

## Conclusion

Managing Kong plugins as Kubernetes CRDs through Flux CD creates a clean, auditable workflow for API gateway configuration. Every rate limit change, authentication update, and request transformation rule is a Git commit that can be reviewed, tested, and rolled back. The combination of Kong's plugin power and Flux's GitOps discipline gives your platform team precise control over how APIs are secured and managed across your entire Kubernetes cluster.
