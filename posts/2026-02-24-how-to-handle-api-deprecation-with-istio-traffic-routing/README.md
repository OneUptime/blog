# How to Handle API Deprecation with Istio Traffic Routing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, API Deprecation, Traffic Routing, Sunset Headers, Migration

Description: A practical guide to gracefully deprecating APIs using Istio traffic routing with deprecation headers, traffic shifting, and sunset enforcement.

---

Deprecating an API is never fun, but it is inevitable. Services evolve, contracts change, and old versions need to go away. The challenge is doing it without breaking clients who depend on the old version. Istio's traffic routing capabilities make this process much smoother by giving you fine-grained control over how traffic flows during the deprecation period.

## The Deprecation Timeline

A good deprecation process has clear phases:

1. **Announcement** - Add deprecation headers, no functional changes
2. **Migration window** - Both versions run side by side
3. **Soft sunset** - Old version returns warnings
4. **Hard sunset** - Old version returns errors
5. **Removal** - Old version infrastructure is deleted

Istio helps enforce each phase through traffic routing configuration.

## Phase 1: Adding Deprecation Headers

Start by adding standard deprecation headers to the old API version. This signals to clients that they should begin planning their migration:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: user-api
spec:
  hosts:
    - api.example.com
  gateways:
    - api-gateway
  http:
    # New version - current and recommended
    - match:
        - uri:
            prefix: /api/v2/users
      route:
        - destination:
            host: user-service
            subset: v2
          headers:
            response:
              add:
                x-api-version: "v2"
                x-api-status: "current"
    # Old version - now deprecated
    - match:
        - uri:
            prefix: /api/v1/users
      route:
        - destination:
            host: user-service
            subset: v1
          headers:
            response:
              add:
                deprecation: "true"
                sunset: "Wed, 01 Jul 2026 00:00:00 GMT"
                link: '</api/v2/users>; rel="successor-version"'
                x-api-version: "v1"
                x-api-status: "deprecated"
                x-deprecation-notice: "This API version will be removed on July 1, 2026. Please migrate to /api/v2/users."
```

The `Deprecation` header (RFC 8594) and `Sunset` header (RFC 8594) are standards that well-behaved API clients can parse automatically. The `Link` header with `rel="successor-version"` tells the client exactly where to go.

## Phase 2: Monitoring Deprecated API Usage

Before making any disruptive changes, understand who is still using the old version. Use Istio's metrics to track this.

First, add custom telemetry to track deprecated API usage by client:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: deprecation-tracking
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
          tagOverrides:
            client_id:
              operation: UPSERT
              value: request.headers["x-client-id"]
            api_version:
              operation: UPSERT
              value: request.headers["x-api-version"]
```

Query Prometheus to find clients still using v1:

```
# Total v1 requests per client
sum(increase(istio_requests_total{api_version="v1", request_url_path=~"/api/v1/users.*"}[7d])) by (client_id)

# v1 request trend over time
sum(rate(istio_requests_total{request_url_path=~"/api/v1/users.*"}[1h]))
```

## Phase 3: Gradual Traffic Migration

If you want to force-migrate clients from v1 to v2, start redirecting a small percentage of v1 traffic to v2:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: user-api-migration
spec:
  hosts:
    - api.example.com
  gateways:
    - api-gateway
  http:
    - match:
        - uri:
            prefix: /api/v2/users
      route:
        - destination:
            host: user-service
            subset: v2
    # Migrate 10% of v1 traffic to v2
    - match:
        - uri:
            prefix: /api/v1/users
      route:
        - destination:
            host: user-service
            subset: v1
          weight: 90
          headers:
            response:
              add:
                deprecation: "true"
                sunset: "Wed, 01 Jul 2026 00:00:00 GMT"
        - destination:
            host: user-service
            subset: v2
          weight: 10
          headers:
            request:
              set:
                x-migration-active: "true"
            response:
              add:
                x-api-migration: "You were served by v2. Please update your base URL to /api/v2/users."
```

Only do this if v2 is backward compatible with v1 request formats. If the API contract changed, you cannot silently redirect.

## Phase 4: Soft Sunset with Warnings

As the sunset date approaches, start returning warnings in the response body for the deprecated API:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: deprecation-warning
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
          name: envoy.filters.http.lua
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.http.lua.v3.Lua
            inlineCode: |
              function envoy_on_request(request_handle)
                local path = request_handle:headers():get(":path")
                if path and path:find("^/api/v1/") then
                  -- Add a warning header that becomes more urgent as sunset approaches
                  local sunset = 1751328000  -- July 1, 2026
                  local now = os.time()
                  local days_remaining = math.floor((sunset - now) / 86400)

                  if days_remaining <= 0 then
                    request_handle:headers():add("x-deprecation-days-remaining", "0")
                  elseif days_remaining <= 30 then
                    request_handle:headers():add("x-deprecation-urgency", "critical")
                    request_handle:headers():add("x-deprecation-days-remaining", tostring(days_remaining))
                  elseif days_remaining <= 90 then
                    request_handle:headers():add("x-deprecation-urgency", "high")
                    request_handle:headers():add("x-deprecation-days-remaining", tostring(days_remaining))
                  else
                    request_handle:headers():add("x-deprecation-urgency", "normal")
                    request_handle:headers():add("x-deprecation-days-remaining", tostring(days_remaining))
                  end
                end
              end
```

## Phase 5: Hard Sunset

When the sunset date arrives, stop routing traffic to the old service and return an informative error:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: user-api-sunset
spec:
  hosts:
    - api.example.com
  gateways:
    - api-gateway
  http:
    - match:
        - uri:
            prefix: /api/v2/users
      route:
        - destination:
            host: user-service
            subset: v2
    # v1 is now sunset - return 410 Gone
    - match:
        - uri:
            prefix: /api/v1/users
      directResponse:
        status: 410
        body:
          string: |
            {
              "error": "Gone",
              "message": "API v1 has been retired as of July 1, 2026.",
              "migration_guide": "https://docs.example.com/api/migration/v1-to-v2",
              "successor": "https://api.example.com/api/v2/users",
              "support": "https://support.example.com"
            }
```

The 410 Gone status code is the correct HTTP status for permanently removed resources. It tells clients and caches that this URL will never work again.

## Phase 6: Redirect Instead of Error

Alternatively, if v2 is backward compatible, redirect v1 requests:

```yaml
http:
  - match:
      - uri:
          prefix: /api/v1/users
    redirect:
      uri: /api/v2/users
      redirectCode: 308
```

HTTP 308 is a permanent redirect that preserves the request method. So a POST to `/api/v1/users` redirects to a POST to `/api/v2/users`.

## Deprecation Policy for Internal Services

For service-to-service communication within the mesh, deprecation is handled differently. Instead of response headers (which services might not parse), use Istio's AuthorizationPolicy to gradually restrict access:

```yaml
# First, allow only specific services to use v1
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: restrict-v1-access
spec:
  selector:
    matchLabels:
      app: user-service
      version: v1
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/default/sa/order-service"
              - "cluster.local/ns/default/sa/billing-service"
      to:
        - operation:
            paths: ["/*"]
```

This limits v1 access to only the services that have not yet migrated. As each service migrates, remove it from the list.

## Creating a Deprecation Checklist

For each API deprecation, follow this process:

```bash
# 1. Verify the new version is ready
curl -s https://api.example.com/api/v2/users | head -5

# 2. Apply deprecation headers
kubectl apply -f deprecation-headers.yaml

# 3. Monitor v1 usage
kubectl exec -n istio-system deploy/prometheus -- curl -s \
  'localhost:9090/api/v1/query?query=sum(rate(istio_requests_total{request_url_path=~"/api/v1/.*"}[1h]))'

# 4. Check which clients are still using v1
kubectl exec -n istio-system deploy/prometheus -- curl -s \
  'localhost:9090/api/v1/query?query=sum(increase(istio_requests_total{request_url_path=~"/api/v1/.*"}[7d])) by (source_workload)'

# 5. Apply sunset configuration when ready
kubectl apply -f sunset-config.yaml

# 6. After sunset period, verify zero traffic
kubectl exec -n istio-system deploy/prometheus -- curl -s \
  'localhost:9090/api/v1/query?query=sum(rate(istio_requests_total{request_url_path=~"/api/v1/.*"}[24h]))'

# 7. Delete v1 deployment
kubectl delete deployment user-service-v1
```

## Emergency Rollback

If the deprecation causes unexpected issues, you can quickly revert by reapplying the old VirtualService configuration:

```bash
kubectl apply -f user-api-original.yaml
```

This is one of the best things about managing deprecation through Istio. The old service is still running during the migration window. You are just changing routing rules, which take effect in seconds.

API deprecation is a process, not an event. Istio's traffic routing gives you the precise control you need to execute each phase without downtime and without requiring changes to any application code. The key is having clear timelines, good monitoring, and strong communication with your API consumers.
