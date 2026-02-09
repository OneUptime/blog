# How to use HTTPRoute for HTTP traffic routing rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Gateway API, HTTPRoute

Description: Learn how to create HTTPRoute resources to define sophisticated HTTP traffic routing rules including path-based routing, header matching, and traffic splitting.

---

HTTPRoute is the workhorse of Gateway API traffic routing. It defines how HTTP requests map to backend services based on hostnames, paths, headers, query parameters, and more. Unlike Ingress resources with limited matching capabilities, HTTPRoute provides rich, expressive routing rules that cover complex real-world scenarios without requiring controller-specific annotations.

## Understanding HTTPRoute

HTTPRoute attaches to Gateway listeners and defines rules for routing HTTP traffic to backend services. Each rule can include multiple matches and actions, giving you fine-grained control over traffic flow. Routes support advanced features like header manipulation, request mirroring, and weighted traffic splitting.

Routes are namespaced resources, allowing teams to manage their own routing independently while sharing common Gateway infrastructure.

## Creating a Basic HTTPRoute

Start with simple hostname and path-based routing.

```yaml
# httproute-basic.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: basic-route
  namespace: default
spec:
  parentRefs:
    - name: http-gateway
      namespace: default
  hostnames:
    - "example.com"
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: "/"
      backendRefs:
        - name: web-service
          port: 80
```

This routes all traffic for example.com to the web-service backend.

## Implementing Path-Based Routing

Route different paths to different services.

```yaml
# httproute-paths.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: path-routing
  namespace: default
spec:
  parentRefs:
    - name: http-gateway
  hostnames:
    - "example.com"
  rules:
    # API requests go to API service
    - matches:
        - path:
            type: PathPrefix
            value: "/api"
      backendRefs:
        - name: api-service
          port: 8080

    # Admin requests go to admin service
    - matches:
        - path:
            type: PathPrefix
            value: "/admin"
      backendRefs:
        - name: admin-service
          port: 9000

    # Everything else goes to frontend
    - matches:
        - path:
            type: PathPrefix
            value: "/"
      backendRefs:
        - name: frontend-service
          port: 80
```

Rules are evaluated in order, so more specific paths should come first.

## Using Exact and Regex Path Matching

Implement precise path matching beyond simple prefixes.

```yaml
# httproute-exact-paths.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: exact-path-routing
  namespace: default
spec:
  parentRefs:
    - name: http-gateway
  hostnames:
    - "api.example.com"
  rules:
    # Exact match for health check
    - matches:
        - path:
            type: Exact
            value: "/health"
      backendRefs:
        - name: health-service
          port: 8080

    # Exact match for metrics
    - matches:
        - path:
            type: Exact
            value: "/metrics"
      backendRefs:
        - name: metrics-service
          port: 9090

    # Regex match for versioned API paths
    - matches:
        - path:
            type: RegularExpression
            value: "/api/v[0-9]+/.*"
      backendRefs:
        - name: api-service
          port: 8080
```

Use Exact for specific endpoints and RegularExpression for pattern-based matching.

## Implementing Header-Based Routing

Route based on HTTP headers like user agent or custom headers.

```yaml
# httproute-headers.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: header-routing
  namespace: default
spec:
  parentRefs:
    - name: http-gateway
  hostnames:
    - "example.com"
  rules:
    # Route mobile users to mobile backend
    - matches:
        - headers:
            - name: User-Agent
              type: RegularExpression
              value: ".*(Mobile|Android|iPhone).*"
      backendRefs:
        - name: mobile-service
          port: 8080

    # Route beta users to canary backend
    - matches:
        - headers:
            - name: X-Beta-User
              type: Exact
              value: "true"
      backendRefs:
        - name: canary-service
          port: 8080

    # Default backend
    - matches:
        - path:
            type: PathPrefix
            value: "/"
      backendRefs:
        - name: stable-service
          port: 8080
```

Header matching enables A/B testing and canary deployments.

## Implementing Query Parameter Routing

Route based on query string parameters.

```yaml
# httproute-query-params.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: query-routing
  namespace: default
spec:
  parentRefs:
    - name: http-gateway
  hostnames:
    - "example.com"
  rules:
    # Route debug requests to debug backend
    - matches:
        - queryParams:
            - name: debug
              type: Exact
              value: "true"
      backendRefs:
        - name: debug-service
          port: 8080

    # Route specific API versions
    - matches:
        - queryParams:
            - name: api_version
              type: Exact
              value: "2.0"
      backendRefs:
        - name: api-v2-service
          port: 8080

    # Default routing
    - backendRefs:
        - name: api-v1-service
          port: 8080
```

Query parameter routing works well for feature flags and version selection.

## Implementing Traffic Splitting

Distribute traffic across multiple backends with weights.

```yaml
# httproute-traffic-split.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: canary-deployment
  namespace: default
spec:
  parentRefs:
    - name: http-gateway
  hostnames:
    - "example.com"
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: "/"
      backendRefs:
        # 90% of traffic to stable version
        - name: stable-service
          port: 80
          weight: 90

        # 10% of traffic to canary version
        - name: canary-service
          port: 80
          weight: 10
```

Weights are relative, so 90:10 gives 90% to stable and 10% to canary.

## Adding Request Header Manipulation

Modify request headers before forwarding to backends.

```yaml
# httproute-header-manipulation.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: header-manipulation
  namespace: default
spec:
  parentRefs:
    - name: http-gateway
  hostnames:
    - "example.com"
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: "/api"
      filters:
        - type: RequestHeaderModifier
          requestHeaderModifier:
            # Add headers
            add:
              - name: X-Request-Source
                value: "gateway"
              - name: X-Environment
                value: "production"
            # Set headers (overwrite if exists)
            set:
              - name: X-Forwarded-Proto
                value: "https"
            # Remove headers
            remove:
              - "X-Internal-Token"
      backendRefs:
        - name: api-service
          port: 8080
```

Header manipulation enables authentication, debugging, and protocol handling.

## Implementing URL Rewriting

Rewrite request paths before forwarding to backends.

```yaml
# httproute-url-rewrite.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: url-rewrite
  namespace: default
spec:
  parentRefs:
    - name: http-gateway
  hostnames:
    - "example.com"
  rules:
    # Rewrite /v1/api/* to /api/*
    - matches:
        - path:
            type: PathPrefix
            value: "/v1/api"
      filters:
        - type: URLRewrite
          urlRewrite:
            path:
              type: ReplacePrefixMatch
              replacePrefixMatch: "/api"
      backendRefs:
        - name: api-service
          port: 8080

    # Rewrite /old-path to /new-path
    - matches:
        - path:
            type: PathPrefix
            value: "/old-path"
      filters:
        - type: URLRewrite
          urlRewrite:
            path:
              type: ReplaceFullPath
              replaceFullPath: "/new-path"
      backendRefs:
        - name: new-service
          port: 8080
```

URL rewriting supports API versioning and legacy path migration.

## Implementing Request Redirects

Redirect requests to different URLs or hostnames.

```yaml
# httproute-redirects.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: redirects
  namespace: default
spec:
  parentRefs:
    - name: http-gateway
  hostnames:
    - "example.com"
  rules:
    # Redirect HTTP to HTTPS
    - matches:
        - path:
            type: PathPrefix
            value: "/"
      filters:
        - type: RequestRedirect
          requestRedirect:
            scheme: "https"
            statusCode: 301

    # Redirect old domain to new domain
    - matches:
        - path:
            type: PathPrefix
            value: "/"
          headers:
            - name: Host
              value: "old.example.com"
      filters:
        - type: RequestRedirect
          requestRedirect:
            hostname: "new.example.com"
            statusCode: 301
```

Redirects handle HTTP to HTTPS upgrades and domain migrations.

## Implementing Request Mirroring

Mirror requests to multiple backends for testing.

```yaml
# httproute-mirroring.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: traffic-mirroring
  namespace: default
spec:
  parentRefs:
    - name: http-gateway
  hostnames:
    - "example.com"
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: "/api"
      backendRefs:
        # Primary backend
        - name: production-service
          port: 8080

      filters:
        # Mirror to test backend
        - type: RequestMirror
          requestMirror:
            backendRef:
              name: test-service
              port: 8080
```

Mirroring sends a copy of traffic to test backends without impacting users.

## Implementing Cross-Namespace Backend References

Route to services in different namespaces.

```yaml
# httproute-cross-namespace.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: cross-namespace-route
  namespace: frontend-namespace
spec:
  parentRefs:
    - name: shared-gateway
      namespace: gateway-namespace
  hostnames:
    - "example.com"
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: "/api"
      backendRefs:
        - name: api-service
          namespace: backend-namespace
          port: 8080

---
# ReferenceGrant allowing cross-namespace reference
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-frontend-to-backend
  namespace: backend-namespace
spec:
  from:
    - group: gateway.networking.k8s.io
      kind: HTTPRoute
      namespace: frontend-namespace
  to:
    - group: ""
      kind: Service
      name: api-service
```

## Implementing Timeout Configuration

Set request and backend timeouts for routes.

```yaml
# httproute-timeouts.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: timeout-configuration
  namespace: default
spec:
  parentRefs:
    - name: http-gateway
  hostnames:
    - "example.com"
  rules:
    # Fast endpoints with short timeout
    - matches:
        - path:
            type: PathPrefix
            value: "/health"
      timeouts:
        request: "5s"
        backendRequest: "3s"
      backendRefs:
        - name: health-service
          port: 8080

    # Slow endpoints with longer timeout
    - matches:
        - path:
            type: PathPrefix
            value: "/reports"
      timeouts:
        request: "60s"
        backendRequest: "55s"
      backendRefs:
        - name: report-service
          port: 8080
```

## Best Practices for HTTPRoute Configuration

Order rules from most specific to least specific. More specific matches should come first to prevent generic rules from catching traffic.

Use path prefixes rather than exact matches when possible for flexibility in API design.

Leverage header matching for A/B testing and canary deployments rather than creating multiple routes.

Keep traffic split weights simple. Use 50/50, 90/10, or 95/5 rather than arbitrary percentages.

Use URL rewriting to maintain clean external APIs while supporting different internal path structures.

Apply header manipulation at the route level rather than in application code for consistency.

Document routing decisions in route annotations to help future maintainers understand the logic.

Test route changes in non-production environments, especially when using regex matching or complex filters.

Monitor route attachment status to ensure routes successfully attach to gateways.

Use meaningful route names that indicate purpose, like `api-canary-route` or `mobile-user-route`.

HTTPRoute provides the sophisticated traffic routing capabilities that modern applications need. Its rich matching and transformation features enable complex deployment patterns, A/B testing, and gradual rollouts without requiring custom controller configurations or annotations.
