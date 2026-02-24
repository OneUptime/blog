# How to Configure HTTP Method-Based Authorization in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, HTTP Methods, REST API, Security, Kubernetes

Description: How to restrict access to services based on HTTP methods like GET, POST, PUT, and DELETE using Istio authorization policies.

---

HTTP method-based authorization is one of the most natural ways to control access in a REST API. Read operations (GET) might be open to many consumers, while write operations (POST, PUT, DELETE) should be restricted to specific services or authenticated users. Istio makes this straightforward with the `methods` field in AuthorizationPolicy operations.

## Why Method-Based Authorization Matters

Most REST APIs follow predictable patterns. GET requests read data, POST creates resources, PUT/PATCH updates them, and DELETE removes them. These operations have very different security implications. Letting a service read data is usually low risk. Letting it delete data is a different story.

Without method-based controls, you either allow a service full access or no access at all. That's too coarse for most production environments.

## Basic Method Restriction

Allow only GET requests to a service:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: read-only-access
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: catalog-service
  action: ALLOW
  rules:
    - to:
        - operation:
            methods: ["GET", "HEAD", "OPTIONS"]
```

This makes the catalog service effectively read-only from the mesh's perspective. Any POST, PUT, PATCH, or DELETE request returns 403.

Including HEAD and OPTIONS is good practice. HEAD is often used by load balancers and health checks, and OPTIONS is needed for CORS preflight requests.

## Different Access Levels by Method

Give different service accounts different levels of access based on HTTP method:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: catalog-access-levels
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: catalog-service
  action: ALLOW
  rules:
    # Anyone in the mesh can read
    - from:
        - source:
            namespaces: ["my-app", "frontend"]
      to:
        - operation:
            methods: ["GET", "HEAD", "OPTIONS"]
    # Only the inventory service can update
    - from:
        - source:
            principals: ["cluster.local/ns/my-app/sa/inventory-service"]
      to:
        - operation:
            methods: ["POST", "PUT", "PATCH"]
    # Only the admin service can delete
    - from:
        - source:
            principals: ["cluster.local/ns/my-app/sa/admin-service"]
      to:
        - operation:
            methods: ["DELETE"]
```

This creates a clear hierarchy: everyone reads, specific services write, and only admin can delete.

## Combining Methods with Paths

Method restrictions become even more powerful when combined with path matching:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: user-api-access
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: user-service
  action: ALLOW
  rules:
    # Public endpoint - anyone can POST to create an account
    - to:
        - operation:
            methods: ["POST"]
            paths: ["/api/users/register"]
    # Authenticated users can read their profile
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            methods: ["GET"]
            paths: ["/api/users/me"]
    # Admin can list and manage all users
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            methods: ["GET", "PUT", "DELETE"]
            paths: ["/api/users/*"]
      when:
        - key: request.auth.claims[role]
          values: ["admin"]
```

## Blocking Dangerous Methods

Sometimes it's easier to block specific methods rather than allowlisting others. Use a DENY policy for this:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: block-dangerous-methods
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-service
  action: DENY
  rules:
    - to:
        - operation:
            methods: ["TRACE", "CONNECT"]
```

TRACE and CONNECT can be security risks in certain configurations. Blocking them at the mesh level ensures no service accidentally handles them.

## Method-Based Access with JWT Claims

Combine HTTP methods with JWT token claims for role-based API access:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-service
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: role-method-access
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    # Viewers can only GET
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            methods: ["GET"]
      when:
        - key: request.auth.claims[role]
          values: ["viewer", "editor", "admin"]
    # Editors can GET and POST/PUT
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            methods: ["POST", "PUT", "PATCH"]
      when:
        - key: request.auth.claims[role]
          values: ["editor", "admin"]
    # Only admins can DELETE
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            methods: ["DELETE"]
      when:
        - key: request.auth.claims[role]
          values: ["admin"]
```

## Handling CORS Preflight

When browsers send CORS preflight requests (OPTIONS method), these don't carry authentication tokens. If your policy requires JWT for all requests, preflight requests will fail. Handle this by explicitly allowing OPTIONS:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-cors-preflight
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    # Allow CORS preflight without auth
    - to:
        - operation:
            methods: ["OPTIONS"]
    # Require JWT for everything else
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
```

## Using notMethods

The `notMethods` field matches requests with methods NOT in the list:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-writes-from-outside
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: data-service
  action: DENY
  rules:
    - from:
        - source:
            notNamespaces: ["my-app"]
      to:
        - operation:
            notMethods: ["GET", "HEAD", "OPTIONS"]
```

This denies non-read methods from outside the namespace. It's a double negative that reads as: "deny requests from outside my-app that are NOT read-only methods" - meaning deny write operations from external namespaces.

## Real-World API Gateway Pattern

In a typical microservices architecture, the API gateway is the entry point. Method-based policies at the gateway level provide a first line of defense:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: gateway-method-control
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-gateway
  action: ALLOW
  rules:
    # Public APIs - read only from anyone
    - to:
        - operation:
            methods: ["GET", "HEAD", "OPTIONS"]
            paths: ["/api/v1/public/*"]
    # Authenticated APIs - all methods with JWT
    - from:
        - source:
            requestPrincipals: ["*"]
      to:
        - operation:
            methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
            paths: ["/api/v1/*"]
    # Health checks
    - to:
        - operation:
            methods: ["GET"]
            paths: ["/healthz", "/ready"]
```

## Testing Method-Based Policies

```bash
# Test GET (should be allowed)
kubectl exec -n my-app deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://catalog-service:8080/api/products

# Test POST (might be denied)
kubectl exec -n my-app deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" -X POST -d '{"name":"test"}' http://catalog-service:8080/api/products

# Test DELETE (should be denied for most callers)
kubectl exec -n my-app deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" -X DELETE http://catalog-service:8080/api/products/123

# Check which methods are allowed
for method in GET POST PUT PATCH DELETE OPTIONS HEAD; do
  code=$(kubectl exec -n my-app deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" -X $method http://catalog-service:8080/api/products)
  echo "$method: $code"
done
```

## Common Pitfalls

1. **Forgetting OPTIONS for CORS.** Browser-based clients need OPTIONS requests for preflight. If you block OPTIONS, your frontend will break.

2. **Case sensitivity.** HTTP methods in Istio policies are case-sensitive. Use uppercase: `GET`, not `get`.

3. **Method override headers.** Some APIs use `X-HTTP-Method-Override` headers to tunnel methods through POST. Istio checks the actual HTTP method, not the override header. If your app supports method overrides, you'll need to account for this in your policies.

4. **gRPC is always POST.** All gRPC calls use the POST method at the HTTP/2 level. Method-based restrictions don't work well for gRPC - use path-based policies instead, where the path is the gRPC service/method name.

Method-based authorization is a simple but effective tool. It maps directly to RESTful API semantics and gives you meaningful access control without complex policy configurations.
