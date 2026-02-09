# How to Configure Ambassador Mapping CRD for Path-Based API Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ambassador, Kubernetes, API Gateway

Description: Learn how to use Ambassador's Mapping CRD to configure advanced path-based routing with rewrites, headers, and traffic splitting for sophisticated API traffic management in Kubernetes.

---

Ambassador's Mapping Custom Resource Definition provides declarative routing configuration for APIs in Kubernetes. Unlike basic Ingress resources, Mappings offer fine-grained control over request routing, header manipulation, path rewrites, and traffic splitting, enabling sophisticated API gateway behaviors through simple YAML manifests.

## Understanding Ambassador Mapping CRD

The Mapping CRD defines how requests are routed from the gateway to backend services. Each Mapping specifies matching criteria (host, path, headers) and routing destinations (services, weights, rewrites).

Key capabilities include:
- Prefix and exact path matching
- Header-based routing
- Query parameter routing
- Path rewriting and regex transforms
- Traffic splitting across multiple backends
- Request and response header manipulation

## Basic Path-Based Routing

Create a simple mapping that routes requests to a backend service:

```yaml
# basic-mapping.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: api-backend
  namespace: default
spec:
  prefix: /api/
  service: backend-service:8080
```

This routes all requests with `/api/` prefix to `backend-service` on port 8080.

Apply the mapping:

```bash
kubectl apply -f basic-mapping.yaml
```

## Multiple Path Mappings

Route different paths to different services:

```yaml
# multi-path-mappings.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: users-api
  namespace: default
spec:
  prefix: /api/users
  service: users-service:8080
---
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: orders-api
  namespace: default
spec:
  prefix: /api/orders
  service: orders-service:8080
---
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: products-api
  namespace: default
spec:
  prefix: /api/products
  service: products-service:8080
```

Ambassador matches the longest matching prefix, so `/api/users/123` goes to users-service while `/api/orders/456` goes to orders-service.

## Host-Based Routing

Route based on hostname:

```yaml
# host-based-routing.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: api-domain
  namespace: default
spec:
  prefix: /
  host: api.example.com
  service: api-backend:8080
---
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: admin-domain
  namespace: default
spec:
  prefix: /
  host: admin.example.com
  service: admin-backend:8080
```

## Path Rewriting

Modify request paths before forwarding to backends:

```yaml
# path-rewrite-mapping.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: api-v2-rewrite
  namespace: default
spec:
  prefix: /v2/
  rewrite: /api/
  service: backend-service:8080
```

Requests to `/v2/users` are rewritten to `/api/users` before reaching the backend.

Advanced regex rewriting:

```yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: regex-rewrite
  namespace: default
spec:
  prefix: /old-api/
  prefix_regex: true
  regex_rewrite:
    pattern: /old-api/(.*)
    substitution: /new-api/\1
  service: backend-service:8080
```

## Header-Based Routing

Route based on request headers:

```yaml
# header-routing.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: mobile-api
  namespace: default
spec:
  prefix: /api/
  service: mobile-backend:8080
  headers:
    X-Client-Type: mobile
---
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: web-api
  namespace: default
spec:
  prefix: /api/
  service: web-backend:8080
  headers:
    X-Client-Type: web
---
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: default-api
  namespace: default
spec:
  prefix: /api/
  service: default-backend:8080
  precedence: 1  # Lower precedence, used as fallback
```

## Query Parameter Routing

Route based on query parameters:

```yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: beta-features
  namespace: default
spec:
  prefix: /api/
  service: beta-backend:8080
  query_parameters:
    beta: "true"
---
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: stable-features
  namespace: default
spec:
  prefix: /api/
  service: stable-backend:8080
```

## Traffic Splitting for Canary Deployments

Split traffic between multiple backend versions:

```yaml
# canary-traffic-split.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: api-canary-v1
  namespace: default
spec:
  prefix: /api/
  service: backend-v1:8080
  weight: 90  # 90% of traffic
---
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: api-canary-v2
  namespace: default
spec:
  prefix: /api/
  service: backend-v2:8080
  weight: 10  # 10% of traffic
```

Gradually shift traffic to v2:

```bash
# Update weights to shift more traffic
kubectl patch mapping api-canary-v1 --type=merge -p '{"spec":{"weight":70}}'
kubectl patch mapping api-canary-v2 --type=merge -p '{"spec":{"weight":30}}'
```

## Header Manipulation

Add, remove, or modify headers:

```yaml
# header-manipulation.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: api-with-headers
  namespace: default
spec:
  prefix: /api/
  service: backend-service:8080
  add_request_headers:
    X-Custom-Header:
      value: custom-value
    X-Request-ID:
      value: "%REQ(X-REQUEST-ID)%"  # Copy from incoming request
  add_response_headers:
    X-API-Version:
      value: "2.0"
    X-Response-Time:
      value: "%DOWNSTREAM_REMOTE_ADDRESS%"
  remove_request_headers:
  - X-Internal-Debug
  - Cookie
  remove_response_headers:
  - Server
  - X-Powered-By
```

## Method-Based Routing

Route based on HTTP methods:

```yaml
# method-routing.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: read-api
  namespace: default
spec:
  prefix: /api/data
  method: GET
  service: read-service:8080
---
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: write-api
  namespace: default
spec:
  prefix: /api/data
  method_regex: "POST|PUT|DELETE"
  service: write-service:8080
```

## Timeouts and Retries

Configure per-mapping timeouts and retry policies:

```yaml
# timeout-retry-mapping.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: api-with-timeout
  namespace: default
spec:
  prefix: /api/
  service: backend-service:8080
  timeout_ms: 3000  # 3 second timeout
  idle_timeout_ms: 10000  # 10 second idle timeout
  retry_policy:
    retry_on: "5xx"
    num_retries: 3
    per_try_timeout: 1000  # 1 second per retry
```

## Load Balancing Policies

Specify load balancing behavior:

```yaml
# load-balancing.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: api-lb-policy
  namespace: default
spec:
  prefix: /api/
  service: backend-service:8080
  load_balancer:
    policy: round_robin  # Options: round_robin, least_request, ring_hash, maglev
---
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: api-session-affinity
  namespace: default
spec:
  prefix: /sessions/
  service: session-backend:8080
  load_balancer:
    policy: ring_hash
    cookie:
      name: session-id
      ttl: 3600s
```

## CORS Configuration

Enable CORS per mapping:

```yaml
# cors-mapping.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: api-with-cors
  namespace: default
spec:
  prefix: /api/
  service: backend-service:8080
  cors:
    origins:
    - https://example.com
    - https://app.example.com
    methods:
    - GET
    - POST
    - PUT
    - DELETE
    - OPTIONS
    headers:
    - Content-Type
    - Authorization
    - X-Requested-With
    credentials: true
    exposed_headers:
    - X-Custom-Header
    max_age: "86400"
```

## Regex Path Matching

Use regex for complex path matching:

```yaml
# regex-matching.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: uuid-routing
  namespace: default
spec:
  prefix: /api/
  prefix_regex: true
  regex_headers:
    ":path":
      match: "^/api/items/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
  service: items-service:8080
```

## Case Study: Microservices API Gateway

Complete configuration for a microservices architecture:

```yaml
# microservices-gateway.yaml
# Authentication service
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: auth-service
spec:
  prefix: /auth/
  rewrite: /
  service: auth-service:8080
  timeout_ms: 5000
---
# Users microservice with versioning
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: users-v1
spec:
  prefix: /api/v1/users
  service: users-service-v1:8080
  weight: 20
---
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: users-v2
spec:
  prefix: /api/v1/users
  service: users-service-v2:8080
  weight: 80
---
# Products with caching headers
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: products
spec:
  prefix: /api/products
  service: products-service:8080
  add_response_headers:
    Cache-Control:
      value: "public, max-age=300"
---
# Orders with authentication required
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: orders
spec:
  prefix: /api/orders
  service: orders-service:8080
  headers:
    Authorization: ".*"
  timeout_ms: 10000
  retry_policy:
    retry_on: "5xx"
    num_retries: 2
```

## Testing Mappings

Verify mapping configuration:

```bash
# Get Ambassador service
AMBASSADOR=$(kubectl get svc ambassador -n ambassador -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test basic routing
curl -H "Host: api.example.com" http://${AMBASSADOR}/api/users

# Test header-based routing
curl -H "X-Client-Type: mobile" http://${AMBASSADOR}/api/data

# Test traffic splitting
for i in {1..100}; do
  curl -s http://${AMBASSADOR}/api/version | grep version
done | sort | uniq -c

# Test path rewriting
curl -v http://${AMBASSADOR}/v2/test
# Should forward to backend as /api/test
```

## Best Practices

**Use specific prefixes** - More specific prefixes prevent routing conflicts and match before generic ones.

**Set appropriate precedence** - Use the `precedence` field to explicitly control matching order when needed.

**Monitor mapping conflicts** - Check Ambassador diagnostics for overlapping or conflicting mappings.

**Test traffic splits gradually** - Start with small percentages (5-10%) before increasing canary traffic.

**Document rewrite rules** - Path rewrites can be confusing; document the transformation logic.

**Use host-based routing for isolation** - Separate environments or tenants using different hostnames.

**Implement health checks** - Ensure services have proper health endpoints for routing decisions.

## Conclusion

Ambassador's Mapping CRD provides powerful, declarative routing capabilities that go far beyond standard Kubernetes Ingress. With support for path rewrites, header manipulation, traffic splitting, and sophisticated matching logic, Mappings enable complex API gateway patterns through simple YAML configuration. The Kubernetes-native approach integrates seamlessly with GitOps workflows, allowing teams to manage API routing alongside application deployment manifests for consistent, version-controlled infrastructure.
