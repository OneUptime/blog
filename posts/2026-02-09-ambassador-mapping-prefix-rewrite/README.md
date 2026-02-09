# How to Implement Ambassador Ingress Mapping with Prefix Rewrite and Host Routing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Ambassador, Routing

Description: Master Ambassador Mapping resources to implement sophisticated routing patterns including prefix rewriting, host-based routing, regex matching, and advanced traffic management for Kubernetes services.

---

Ambassador Edge Stack uses Mapping resources to define how traffic routes to your services. These Kubernetes-native resources provide powerful routing capabilities including prefix rewriting, host-based routing, header matching, and more. This guide explores how to leverage Mapping resources for complex routing scenarios.

## Understanding Ambassador Mapping

The Mapping resource is Ambassador's fundamental routing primitive. Unlike standard Kubernetes Ingress, Mapping provides fine-grained control over request routing, transformations, and policies. Each Mapping defines:

- How to match incoming requests (by path, host, headers, etc.)
- Which backend service should handle the request
- How to transform the request (path rewriting, header manipulation)
- What policies to apply (rate limiting, authentication, etc.)

Mappings are processed in priority order, allowing you to build sophisticated routing logic.

## Basic Mapping Configuration

Let's start with a simple Mapping:

```yaml
# basic-mapping.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: simple-api
  namespace: default
spec:
  # Match requests to this hostname
  hostname: api.example.com

  # Match requests starting with this prefix
  prefix: /api/v1/

  # Route to this backend service
  service: backend-api:8080

  # Rewrite the path before sending to backend
  rewrite: /
```

This Mapping routes requests from `api.example.com/api/v1/*` to `backend-api:8080/*`.

Apply the mapping:

```bash
kubectl apply -f basic-mapping.yaml
```

## Prefix Rewriting Patterns

Prefix rewriting transforms the request path before forwarding to the backend service.

### Simple Prefix Strip

Remove the matched prefix entirely:

```yaml
# prefix-strip.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: strip-version-prefix
  namespace: default
spec:
  hostname: api.example.com
  prefix: /v2/users/
  service: user-service:80

  # Strip /v2/users/ and send to backend
  rewrite: /
```

Request: `https://api.example.com/v2/users/123`
Backend receives: `http://user-service/123`

### Prefix Replacement

Replace one prefix with another:

```yaml
# prefix-replace.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: api-to-internal
  namespace: default
spec:
  hostname: api.example.com
  prefix: /api/
  service: internal-service:8080

  # Replace /api/ with /internal/v1/
  rewrite: /internal/v1/
```

Request: `https://api.example.com/api/users/list`
Backend receives: `http://internal-service:8080/internal/v1/users/list`

### Preserving Path Segments

Keep specific path segments during rewrite:

```yaml
# preserve-segments.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: preserve-tenant
  namespace: default
spec:
  hostname: api.example.com
  prefix: /tenant/
  prefix_regex: true
  service: multi-tenant-backend:80

  # Preserve everything after /tenant/
  rewrite: /app/
```

### Dynamic Path Rewriting

Use regex groups for dynamic rewriting:

```yaml
# dynamic-rewrite.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: version-router
  namespace: default
spec:
  hostname: api.example.com
  prefix: /api/(v[0-9]+)/(.*)
  prefix_regex: true
  service: api-backend:80

  # Rewrite using captured groups
  rewrite: /\2?version=\1

  # Enable regex matching
  regex_rewrite:
    pattern: /api/(v[0-9]+)/(.*)
    substitution: /\2?version=\1
```

Request: `https://api.example.com/api/v3/users/profile`
Backend receives: `http://api-backend/users/profile?version=v3`

## Host-Based Routing

Route requests based on hostname for multi-tenant or multi-environment scenarios.

### Simple Host Routing

Route different hostnames to different services:

```yaml
# Production API
---
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: prod-api
  namespace: default
spec:
  hostname: api.example.com
  prefix: /
  service: production-backend:80

# Staging API
---
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: staging-api
  namespace: default
spec:
  hostname: staging.api.example.com
  prefix: /
  service: staging-backend:80

# Development API
---
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: dev-api
  namespace: default
spec:
  hostname: dev.api.example.com
  prefix: /
  service: dev-backend:80
```

### Wildcard Host Matching

Match multiple subdomains with wildcards:

```yaml
# wildcard-host.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: tenant-routing
  namespace: default
spec:
  # Match any subdomain
  hostname: "*.app.example.com"
  prefix: /
  service: tenant-router:80

  # Pass original host to backend
  host_rewrite: ""

  # Add hostname as header for backend processing
  add_request_headers:
    x-tenant-host:
      value: "%REQ(:authority)%"
```

### Regex Host Matching

Use regex for complex host patterns:

```yaml
# regex-host.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: region-router
  namespace: default
spec:
  hostname: "^(us|eu|asia)-api\\.example\\.com$"
  host_regex: true
  prefix: /
  service: regional-backend:80

  # Extract region from hostname
  add_request_headers:
    x-region:
      value: "%REQ(:authority)%"
```

## Advanced Routing Patterns

### Header-Based Routing

Route based on request headers:

```yaml
# header-routing.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: beta-users
  namespace: default
spec:
  hostname: api.example.com
  prefix: /api/
  service: beta-backend:80

  # Match requests with beta header
  headers:
    x-beta-user:
      value: "true"

  # Higher priority than standard mapping
  priority: 10

# Standard mapping for non-beta users
---
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: standard-users
  namespace: default
spec:
  hostname: api.example.com
  prefix: /api/
  service: production-backend:80
  priority: 1
```

### Method-Based Routing

Route based on HTTP method:

```yaml
# method-routing.yaml
# Read operations to read-optimized service
---
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: read-api
  namespace: default
spec:
  hostname: api.example.com
  prefix: /data/
  service: read-replica:80
  method: GET
  priority: 10

# Write operations to primary service
---
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: write-api
  namespace: default
spec:
  hostname: api.example.com
  prefix: /data/
  service: primary-db-service:80
  method_regex: true
  method: "POST|PUT|PATCH|DELETE"
  priority: 10
```

### Query Parameter Routing

Route based on query parameters:

```yaml
# query-param-routing.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: experimental-features
  namespace: default
spec:
  hostname: api.example.com
  prefix: /features/
  service: experimental-backend:80

  # Match specific query parameter
  query_parameters:
    experimental:
      value: "enabled"

  priority: 10
```

## Complex Multi-Service Routing

Combine multiple routing criteria for sophisticated scenarios:

```yaml
# multi-criteria-routing.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: premium-api-v2
  namespace: default
spec:
  # Host matching
  hostname: api.example.com

  # Path matching with regex
  prefix: /api/v2/
  prefix_regex: false

  # Header matching
  headers:
    x-subscription-tier:
      value: premium
    authorization:
      value: "Bearer .*"
      regex: true

  # Service routing
  service: premium-backend:80

  # Path rewriting
  rewrite: /

  # Add metadata headers
  add_request_headers:
    x-api-version:
      value: "2.0"
    x-tier:
      value: "premium"

  # High priority
  priority: 100

  # Enable CORS
  cors:
    origins: "*"
    methods: "GET, POST, PUT, DELETE"
    headers: "Content-Type, Authorization"
    credentials: true
    max_age: "86400"
```

## Load Balancing Configuration

Configure load balancing strategies in Mappings:

```yaml
# load-balancing.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: balanced-api
  namespace: default
spec:
  hostname: api.example.com
  prefix: /api/
  service: backend-service:80

  # Load balancing policy
  load_balancer:
    policy: least_request

  # Connection settings
  cluster_idle_timeout_ms: 30000

  # Circuit breaking
  circuit_breakers:
    max_connections: 2048
    max_pending_requests: 2048
    max_requests: 2048
    max_retries: 3
```

## Canary Deployments with Weighted Routing

Implement canary deployments using weight-based routing:

```yaml
# canary-deployment.yaml
# 90% traffic to stable version
---
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: api-stable
  namespace: default
spec:
  hostname: api.example.com
  prefix: /api/
  service: backend-v1:80
  weight: 90

# 10% traffic to canary version
---
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: api-canary
  namespace: default
spec:
  hostname: api.example.com
  prefix: /api/
  service: backend-v2:80
  weight: 10
```

## Testing and Validation

Test your Mapping configurations:

```bash
# Test basic routing
curl -H "Host: api.example.com" http://AMBASSADOR_IP/api/v1/users

# Test with headers
curl -H "Host: api.example.com" \
     -H "x-beta-user: true" \
     http://AMBASSADOR_IP/api/users

# Test prefix rewriting
curl -v -H "Host: api.example.com" \
     http://AMBASSADOR_IP/api/v2/users/123

# Check which mapping matched
curl -H "Host: api.example.com" \
     http://AMBASSADOR_IP/api/users \
     -v 2>&1 | grep x-envoy-
```

View Mapping status:

```bash
# List all Mappings
kubectl get mappings -A

# Describe a specific Mapping
kubectl describe mapping api-stable

# Check Ambassador diagnostics
kubectl port-forward -n ambassador service/edge-stack 8877:8877
# Visit http://localhost:8877/ambassador/v0/diag/
```

## Debugging Mapping Issues

Common issues and solutions:

**Mapping not matching**: Check priority and specificity:
```bash
# View Mapping order
kubectl get mappings --sort-by=.spec.priority
```

**Path not rewriting correctly**: Test the rewrite pattern:
```yaml
# Add debug headers
add_response_headers:
  x-original-path:
    value: "%REQ(:path)%"
  x-rewritten-path:
    value: "%UPSTREAM_REQ_PATH%"
```

**Host routing not working**: Verify hostname configuration:
```bash
# Check Host resources
kubectl get host -A
```

## Conclusion

Ambassador Mapping resources provide powerful, flexible routing capabilities that go far beyond standard Kubernetes Ingress. By mastering prefix rewriting, host-based routing, and advanced matching criteria, you can build sophisticated traffic management solutions that handle complex application architectures. The declarative, Kubernetes-native approach makes these configurations easy to version control and integrate with GitOps workflows.
