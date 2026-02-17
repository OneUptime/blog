# How to Set Up URL Rewrite Rules on GCP External Application Load Balancer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Load Balancer, URL Rewrite, URL Maps, Traffic Management

Description: Learn how to configure URL rewrite rules on GCP External Application Load Balancer to modify request paths and hosts before they reach your backend services.

---

URL rewriting lets you modify the request path or host before the load balancer forwards it to your backend. This is useful when you are migrating services, consolidating multiple backends behind a single domain, or translating user-friendly URLs to backend-specific paths. On GCP's External Application Load Balancer, URL rewrites are configured through URL map route rules and require no changes to your backend applications.

In this post, I will cover path prefix rewrites, full path rewrites, and host rewrites with practical examples.

## How URL Rewrites Work on GCP

When you add a URL rewrite to a route rule, the load balancer modifies the request before sending it to the backend. The original URL is what the client sees, and the rewritten URL is what the backend receives.

```mermaid
flowchart LR
    A[Client] -->|GET /app/v2/users| B[Load Balancer]
    B -->|URL Rewrite| C[GET /users]
    C --> D[Backend Service]
```

The client requests `/app/v2/users`, but the backend receives `/users`. The client never knows about the rewrite.

## Setting Up the Basics

Assuming you already have backend services and a load balancer set up, the URL rewrite configuration goes in the URL map.

```bash
# Create backend services (if not already created)
gcloud compute health-checks create http app-hc --port=8080

gcloud compute backend-services create api-backend \
    --global \
    --protocol=HTTP \
    --health-checks=app-hc \
    --port-name=http

gcloud compute backend-services create legacy-backend \
    --global \
    --protocol=HTTP \
    --health-checks=app-hc \
    --port-name=http

gcloud compute backend-services create docs-backend \
    --global \
    --protocol=HTTP \
    --health-checks=app-hc \
    --port-name=http
```

## Path Prefix Rewrite

The most common use case is stripping a prefix from the URL path. If your load balancer routes `/api/v2/*` to the API backend, but the backend expects paths starting at `/`, you need to strip the `/api/v2` prefix.

```bash
gcloud compute url-maps import app-url-map --source=- <<'EOF'
name: app-url-map
defaultService: projects/my-project/global/backendServices/api-backend
hostRules:
  - hosts:
      - "*"
    pathMatcher: rewrite-routes
pathMatchers:
  - name: rewrite-routes
    defaultService: projects/my-project/global/backendServices/api-backend
    routeRules:
      # Strip /api/v2 prefix: /api/v2/users -> /users
      - priority: 1
        matchRules:
          - prefixMatch: "/api/v2/"
        routeAction:
          urlRewrite:
            pathPrefixRewrite: "/"
          weightedBackendServices:
            - backendService: projects/my-project/global/backendServices/api-backend
              weight: 100
      # Strip /docs prefix: /docs/getting-started -> /getting-started
      - priority: 2
        matchRules:
          - prefixMatch: "/docs/"
        routeAction:
          urlRewrite:
            pathPrefixRewrite: "/"
          weightedBackendServices:
            - backendService: projects/my-project/global/backendServices/docs-backend
              weight: 100
EOF
```

With this configuration:
- `/api/v2/users` becomes `/users` when it reaches the API backend
- `/api/v2/orders/123` becomes `/orders/123`
- `/docs/getting-started` becomes `/getting-started`
- `/docs/api/reference` becomes `/api/reference`

## Replacing the Prefix with a Different Path

Instead of stripping the prefix entirely, you can replace it with a different path.

```bash
gcloud compute url-maps import app-url-map --source=- <<'EOF'
name: app-url-map
defaultService: projects/my-project/global/backendServices/api-backend
hostRules:
  - hosts:
      - "*"
    pathMatcher: prefix-replace
pathMatchers:
  - name: prefix-replace
    defaultService: projects/my-project/global/backendServices/api-backend
    routeRules:
      # Replace /v2/ with /api/: /v2/users -> /api/users
      - priority: 1
        matchRules:
          - prefixMatch: "/v2/"
        routeAction:
          urlRewrite:
            pathPrefixRewrite: "/api/"
          weightedBackendServices:
            - backendService: projects/my-project/global/backendServices/api-backend
              weight: 100
      # Replace /legacy/ with /compat/: /legacy/endpoint -> /compat/endpoint
      - priority: 2
        matchRules:
          - prefixMatch: "/legacy/"
        routeAction:
          urlRewrite:
            pathPrefixRewrite: "/compat/"
          weightedBackendServices:
            - backendService: projects/my-project/global/backendServices/legacy-backend
              weight: 100
EOF
```

## Host Rewrite

Host rewrites change the Host header before forwarding to the backend. This is useful when your backend expects a specific hostname that is different from what the client sends.

```bash
gcloud compute url-maps import app-url-map --source=- <<'EOF'
name: app-url-map
defaultService: projects/my-project/global/backendServices/api-backend
hostRules:
  - hosts:
      - "app.example.com"
    pathMatcher: host-rewrite-routes
pathMatchers:
  - name: host-rewrite-routes
    defaultService: projects/my-project/global/backendServices/api-backend
    routeRules:
      # Rewrite the host header for API requests
      - priority: 1
        matchRules:
          - prefixMatch: "/api/"
        routeAction:
          urlRewrite:
            hostRewrite: "api.internal.example.com"
            pathPrefixRewrite: "/"
          weightedBackendServices:
            - backendService: projects/my-project/global/backendServices/api-backend
              weight: 100
      # Rewrite host for docs requests
      - priority: 2
        matchRules:
          - prefixMatch: "/docs/"
        routeAction:
          urlRewrite:
            hostRewrite: "docs.internal.example.com"
            pathPrefixRewrite: "/"
          weightedBackendServices:
            - backendService: projects/my-project/global/backendServices/docs-backend
              weight: 100
EOF
```

When a client requests `https://app.example.com/api/users`, the backend receives a request for `https://api.internal.example.com/users`.

## Full Path Rewrite with Template

For cases where you need to rewrite the entire path (not just a prefix), combine regex path matching with a template rewrite.

```bash
gcloud compute url-maps import app-url-map --source=- <<'EOF'
name: app-url-map
defaultService: projects/my-project/global/backendServices/api-backend
hostRules:
  - hosts:
      - "*"
    pathMatcher: full-rewrite
pathMatchers:
  - name: full-rewrite
    defaultService: projects/my-project/global/backendServices/api-backend
    routeRules:
      # Rewrite a specific path completely
      - priority: 1
        matchRules:
          - fullPathMatch: "/health"
        routeAction:
          urlRewrite:
            pathPrefixRewrite: "/internal/healthcheck"
          weightedBackendServices:
            - backendService: projects/my-project/global/backendServices/api-backend
              weight: 100
      # Redirect old path structure to new
      - priority: 2
        matchRules:
          - prefixMatch: "/products/category/"
        routeAction:
          urlRewrite:
            pathPrefixRewrite: "/catalog/browse/"
          weightedBackendServices:
            - backendService: projects/my-project/global/backendServices/api-backend
              weight: 100
EOF
```

## Combining Rewrites with Other Features

URL rewrites work alongside other URL map features like header-based routing and weighted backends.

```bash
gcloud compute url-maps import app-url-map --source=- <<'EOF'
name: app-url-map
defaultService: projects/my-project/global/backendServices/api-backend
hostRules:
  - hosts:
      - "*"
    pathMatcher: combined-features
pathMatchers:
  - name: combined-features
    defaultService: projects/my-project/global/backendServices/api-backend
    routeRules:
      # Canary with URL rewrite: /api/v2/* -> /* on canary backend (10%)
      - priority: 1
        matchRules:
          - prefixMatch: "/api/v2/"
        routeAction:
          urlRewrite:
            pathPrefixRewrite: "/"
          weightedBackendServices:
            - backendService: projects/my-project/global/backendServices/api-backend
              weight: 90
              headerAction:
                requestHeadersToAdd:
                  - headerName: "x-version"
                    headerValue: "stable"
                    replace: true
            - backendService: projects/my-project/global/backendServices/api-canary-backend
              weight: 10
              headerAction:
                requestHeadersToAdd:
                  - headerName: "x-version"
                    headerValue: "canary"
                    replace: true
EOF
```

## Testing URL Rewrites

Verify that rewrites are working correctly by checking the request path your backend receives.

```bash
# Deploy a simple echo server that returns request details
# Then test with curl

# Test prefix rewrite
curl -v https://app.example.com/api/v2/users
# Backend should receive: GET /users

# Test host rewrite
curl -v https://app.example.com/docs/getting-started
# Backend should receive request with Host: docs.internal.example.com

# Check that query strings are preserved
curl -v "https://app.example.com/api/v2/users?page=2&limit=10"
# Backend should receive: GET /users?page=2&limit=10
```

One important thing to note: URL rewrites only modify the path and host. Query strings are preserved as-is, and the request method and body are not affected.

## Common Patterns

Here are patterns I use regularly:

**Microservice routing**: Route `/service-a/*`, `/service-b/*`, etc. to different backends, stripping the service prefix so each backend receives clean paths.

**API versioning**: Route `/api/v1/*` and `/api/v2/*` to different backend services, with the prefix stripped so the backend code does not need to know about versioning.

**Legacy migration**: Rewrite old URL patterns to new ones while keeping the same backend, avoiding a flag day migration.

**Multi-region serving**: Rewrite the host header based on the client's region to route to region-specific backend instances.

## Wrapping Up

URL rewrite rules on GCP's External Application Load Balancer let you transform request paths and hosts before they reach your backends. This decouples your public URL structure from your internal service architecture. Path prefix rewrites are the most common, but host rewrites and full path rewrites give you additional flexibility. Since rewrites are configured in the URL map, you can update them without touching your application code or redeploying anything - just update the URL map and the change takes effect within seconds.
