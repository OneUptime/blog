# How to Use Kubernetes Ingress Path Types: Exact, Prefix, and ImplementationSpecific

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Ingress, Routing, NGINX, Networking

Description: Master Kubernetes Ingress path types including Exact, Prefix, and ImplementationSpecific to configure precise URL routing rules for your applications and avoid common routing conflicts.

---

Kubernetes Ingress path types determine how URLs match routing rules. Understanding the difference between Exact, Prefix, and ImplementationSpecific paths is crucial for building robust routing configurations. Using the wrong path type leads to unexpected routing behavior, conflicts between rules, and security vulnerabilities.

## Understanding Path Types

Kubernetes defines three path types:

- **Exact**: Matches the URL path exactly, case-sensitive
- **Prefix**: Matches the URL path prefix, with specific matching rules
- **ImplementationSpecific**: Behavior depends on the Ingress controller

Each serves different use cases and has distinct matching semantics.

## Exact Path Type

Exact matches require the path to match exactly, including case.

### Basic Exact Path

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: exact-path-example
  namespace: production
spec:
  ingressClassName: nginx
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /api/v1/users
        pathType: Exact
        backend:
          service:
            name: user-service
            port:
              number: 8080
      - path: /api/v1/posts
        pathType: Exact
        backend:
          service:
            name: post-service
            port:
              number: 8080
```

This configuration:

- `/api/v1/users` matches and routes to user-service
- `/api/v1/users/` does NOT match (trailing slash)
- `/api/v1/users/123` does NOT match (extra path segments)
- `/api/v1/Users` does NOT match (case-sensitive)

### When to Use Exact

Use Exact paths for:

- API endpoints that shouldn't match sub-paths
- Static resources at specific URLs
- Webhooks that expect exact paths
- Security-sensitive endpoints

Example for webhooks:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: webhook-ingress
spec:
  ingressClassName: nginx
  rules:
  - host: webhooks.example.com
    http:
      paths:
      - path: /github/webhook
        pathType: Exact
        backend:
          service:
            name: github-webhook-handler
            port:
              number: 8080
      - path: /stripe/webhook
        pathType: Exact
        backend:
          service:
            name: stripe-webhook-handler
            port:
              number: 8080
```

## Prefix Path Type

Prefix matches paths that start with the specified prefix, following specific rules.

### Basic Prefix Path

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: prefix-path-example
spec:
  ingressClassName: nginx
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
      - path: /static
        pathType: Prefix
        backend:
          service:
            name: static-service
            port:
              number: 80
```

Matching behavior:

- `/api` matches
- `/api/` matches
- `/api/v1/users` matches
- `/api-docs` does NOT match (must have `/` or end-of-string after prefix)
- `/apiv2` does NOT match

### Prefix Matching Rules

Prefix paths match when:

1. The request path starts with the prefix
2. The prefix is followed by `/` or is the end of the path

This prevents partial matches like `/api` matching `/api-docs`.

### Nested Prefixes

When multiple prefixes could match, the longest prefix wins:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nested-prefixes
spec:
  ingressClassName: nginx
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: default-service
            port:
              number: 80
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
      - path: /api/v2
        pathType: Prefix
        backend:
          service:
            name: api-v2-service
            port:
              number: 8080
```

Routing behavior:

- `/api/v2/users` routes to api-v2-service (longest match)
- `/api/v1/users` routes to api-service
- `/other/path` routes to default-service
- `/` routes to default-service

### When to Use Prefix

Use Prefix paths for:

- REST APIs with multiple endpoints under a base path
- Serving entire applications under a path
- Microservices architectures
- Catch-all routing

## ImplementationSpecific Path Type

ImplementationSpecific delegates matching to the Ingress controller. Different controllers may behave differently.

### NGINX Ingress Controller

For NGINX Ingress, ImplementationSpecific uses regex matching:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: regex-path
  annotations:
    nginx.ingress.kubernetes.io/use-regex: "true"
spec:
  ingressClassName: nginx
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /api/v[0-9]+/.*
        pathType: ImplementationSpecific
        backend:
          service:
            name: api-service
            port:
              number: 8080
```

This matches:
- `/api/v1/users`
- `/api/v2/posts`
- `/api/v999/anything`

### Traefik Ingress Controller

Traefik supports PathPrefix and additional matchers:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: traefik-path
  annotations:
    traefik.ingress.kubernetes.io/router.middlewares: default-stripprefix@kubernetescrd
spec:
  ingressClassName: traefik
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /api
        pathType: ImplementationSpecific
        backend:
          service:
            name: api-service
            port:
              number: 8080
```

### When to Use ImplementationSpecific

Use ImplementationSpecific for:

- Advanced regex-based routing
- Controller-specific features
- Complex path matching requirements
- When migrating from controller-specific annotations

## Combining Path Types

Different path types can coexist in the same Ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mixed-path-types
spec:
  ingressClassName: nginx
  rules:
  - host: app.example.com
    http:
      paths:
      # Exact match for root health check
      - path: /health
        pathType: Exact
        backend:
          service:
            name: health-service
            port:
              number: 8080
      # Prefix for API routes
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
      # Catch-all for the rest
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
```

Processing order:

1. Exact matches are evaluated first
2. Then Prefix matches (longest first)
3. Finally ImplementationSpecific

## Common Patterns and Best Practices

### API Versioning

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-versioning
spec:
  ingressClassName: nginx
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /v1
        pathType: Prefix
        backend:
          service:
            name: api-v1-service
            port:
              number: 8080
      - path: /v2
        pathType: Prefix
        backend:
          service:
            name: api-v2-service
            port:
              number: 8080
```

### Static Assets vs API

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-routing
spec:
  ingressClassName: nginx
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /static
        pathType: Prefix
        backend:
          service:
            name: cdn-service
            port:
              number: 80
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
```

### Microservices Routing

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: microservices
spec:
  ingressClassName: nginx
  rules:
  - host: services.example.com
    http:
      paths:
      - path: /users
        pathType: Prefix
        backend:
          service:
            name: user-service
            port:
              number: 8080
      - path: /orders
        pathType: Prefix
        backend:
          service:
            name: order-service
            port:
              number: 8080
      - path: /inventory
        pathType: Prefix
        backend:
          service:
            name: inventory-service
            port:
              number: 8080
```

## Path Rewriting

Often you need to rewrite paths before sending to the backend:

### NGINX Path Rewriting

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: path-rewrite
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  ingressClassName: nginx
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /api/v1(/|$)(.*)
        pathType: ImplementationSpecific
        backend:
          service:
            name: api-service
            port:
              number: 8080
```

This rewrites:
- `/api/v1/users` to `/users`
- `/api/v1/posts/123` to `/posts/123`

### Without Rewriting

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: no-rewrite
spec:
  ingressClassName: nginx
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
```

This sends the full path to the backend:
- `/api/users` goes to backend as `/api/users`

## Testing Path Matching

Verify your path configuration works as expected:

```bash
# Test exact paths
curl -I http://app.example.com/api/v1/users
curl -I http://app.example.com/api/v1/users/  # Should differ if using Exact

# Test prefix paths
curl -I http://app.example.com/api/v1/users
curl -I http://app.example.com/api/v2/posts
curl -I http://app.example.com/api-docs  # Should NOT match /api prefix

# Check which service handled the request
curl -v http://app.example.com/api/users 2>&1 | grep -i server

# View NGINX configuration
kubectl exec -n ingress-nginx nginx-ingress-controller-xxxxx -- cat /etc/nginx/nginx.conf | grep -A 10 "app.example.com"
```

## Debugging Path Matching Issues

### Enable Debug Logging

```bash
# For NGINX Ingress
kubectl edit configmap nginx-configuration -n ingress-nginx
```

Add:

```yaml
data:
  error-log-level: debug
```

View logs:

```bash
kubectl logs -n ingress-nginx nginx-ingress-controller-xxxxx -f | grep -i "path\|match"
```

### Common Issues

**Issue: Unexpected 404 errors**

Check path type and ensure it matches your intent:

```bash
kubectl describe ingress my-ingress
kubectl get ingress my-ingress -o yaml
```

**Issue: Wrong service handling requests**

List all paths in order of priority:

```bash
kubectl get ingress -A -o custom-columns=NAME:.metadata.name,HOST:.spec.rules[0].host,PATH:.spec.rules[0].http.paths[*].path,TYPE:.spec.rules[0].http.paths[*].pathType
```

**Issue: Regex not working**

Ensure you're using ImplementationSpecific and the right annotation:

```yaml
annotations:
  nginx.ingress.kubernetes.io/use-regex: "true"
```

## Best Practices

When configuring Ingress paths:

- Use Prefix for most routing scenarios
- Reserve Exact for specific endpoints that shouldn't match sub-paths
- Be cautious with ImplementationSpecific as it varies by controller
- Always include a catch-all `/` path as a default
- Order paths from most specific to least specific
- Document why you chose each path type
- Test path matching thoroughly
- Use rewrite rules sparingly to keep configuration simple
- Monitor for unexpected routing behavior in production
- Version your Ingress resources in source control

Understanding path types is fundamental to building reliable Kubernetes Ingress configurations. Choose the right path type for each use case, test thoroughly, and your routing will be predictable and maintainable.
