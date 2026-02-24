# How to Configure Authorization Based on HTTP Headers in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, HTTP Headers, Security, Kubernetes

Description: How to write Istio authorization policies that match on HTTP request headers to implement fine-grained access control based on custom headers.

---

HTTP headers carry a lot of useful context about a request. Things like user roles, API keys, content types, and custom application metadata all travel in headers. Istio lets you write authorization policies that match on these headers, giving you a way to make access control decisions based on request-level context rather than just network identity.

## Where Header Matching Fits In

Header-based authorization sits on top of the identity layer. You might already have mTLS verifying the caller's service identity, but sometimes you need finer control. For example, maybe the API gateway sets a `X-User-Role` header after authenticating the user, and you want the downstream service to only accept requests with certain role values.

This is not a replacement for proper authentication. Headers can be spoofed by anyone who can send traffic to your service. The idea is that you trust the header because it was set by a trusted upstream service (like your API gateway) and mTLS ensures the traffic actually came from that gateway.

## Basic Header Matching with the when Field

Istio's authorization policies support header matching through the `when` condition using the `request.headers` key:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-admin-header
  namespace: default
spec:
  selector:
    matchLabels:
      app: admin-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/gateway/sa/api-gateway"
    when:
    - key: request.headers[x-user-role]
      values:
      - "admin"
```

This policy allows requests to the admin service only when they come from the API gateway AND have the `x-user-role` header set to `admin`. Both conditions must be true.

## Matching Multiple Header Values

You can match against multiple possible values for a header. The values are ORed:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-editors-and-admins
  namespace: default
spec:
  selector:
    matchLabels:
      app: content-service
  action: ALLOW
  rules:
  - when:
    - key: request.headers[x-user-role]
      values:
      - "admin"
      - "editor"
    to:
    - operation:
        methods:
        - "POST"
        - "PUT"
        - "DELETE"
```

This allows POST, PUT, and DELETE requests from anyone with a role of either `admin` or `editor`.

## Excluding Specific Header Values

Use `notValues` to deny requests with specific header values:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-guest-writes
  namespace: default
spec:
  selector:
    matchLabels:
      app: content-service
  action: DENY
  rules:
  - when:
    - key: request.headers[x-user-role]
      notValues:
      - "admin"
      - "editor"
    to:
    - operation:
        methods:
        - "POST"
        - "PUT"
        - "DELETE"
```

This denies write operations from anyone whose role is NOT admin or editor. Be aware that `notValues` also matches when the header is absent entirely. If the `x-user-role` header is missing, it counts as "not admin and not editor," so the DENY rule would trigger.

## Matching on Multiple Headers

You can check multiple headers in the same rule. Multiple `when` conditions are ANDed together:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: multi-header-check
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
  - when:
    - key: request.headers[x-user-role]
      values:
      - "admin"
    - key: request.headers[x-tenant-id]
      values:
      - "tenant-a"
      - "tenant-b"
    to:
    - operation:
        paths:
        - "/api/*"
```

This requires BOTH the role to be `admin` AND the tenant ID to be either `tenant-a` or `tenant-b`. The request must satisfy all when conditions.

## Combining Header Matching with Source Identity

The most secure pattern combines header checks with source identity verification:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: secure-header-policy
  namespace: default
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/gateway/sa/api-gateway"
    when:
    - key: request.headers[x-user-role]
      values:
      - "admin"
      - "operator"
    to:
    - operation:
        paths:
        - "/orders/*"
        methods:
        - "GET"
        - "POST"
```

This is the safe way to do header-based authorization. The mTLS identity check ensures the request actually came from the API gateway (which is the component you trust to set the header correctly). Without the source check, any service could set the `x-user-role` header and pretend to be an admin.

## Matching on Standard HTTP Headers

You are not limited to custom headers. You can match on standard HTTP headers too:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: content-type-check
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: DENY
  rules:
  - when:
    - key: request.headers[content-type]
      notValues:
      - "application/json"
      - "application/json; charset=utf-8"
    to:
    - operation:
        methods:
        - "POST"
        - "PUT"
```

This denies POST and PUT requests that do not have a JSON content type.

## Using JWT Claims Instead of Headers

If you are using JWT authentication, you can match on JWT claims directly instead of relying on headers. This is more secure because the claims are cryptographically signed:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: jwt-claim-matching
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
  - when:
    - key: request.auth.claims[role]
      values:
      - "admin"
    to:
    - operation:
        paths:
        - "/admin/*"
```

The `request.auth.claims` key accesses claims from a validated JWT token. This requires a `RequestAuthentication` resource to be configured for JWT validation.

For nested claims, use bracket notation:

```yaml
when:
- key: request.auth.claims[realm_access][roles]
  values:
  - "admin"
```

## Real-World Example: API Key Routing

Here is a practical example where different API key tiers get access to different endpoints:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: api-tier-routing
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
  # Free tier - read only
  - when:
    - key: request.headers[x-api-tier]
      values:
      - "free"
    to:
    - operation:
        paths:
        - "/api/v1/read/*"
        methods:
        - "GET"
  # Premium tier - read and write
  - when:
    - key: request.headers[x-api-tier]
      values:
      - "premium"
    to:
    - operation:
        paths:
        - "/api/v1/*"
        methods:
        - "GET"
        - "POST"
        - "PUT"
        - "DELETE"
```

## Debugging Header-Based Policies

If your header-based policy is not matching as expected, first verify the header is actually reaching the sidecar proxy. Headers might be stripped by intermediate proxies or load balancers.

Check the access logs:

```bash
kubectl logs <pod-name> -c istio-proxy | grep "rbac"
```

Enable debug logging:

```bash
istioctl proxy-config log <pod-name> --level rbac:debug
```

Also verify the header name is lowercase in your policy. HTTP/2 (which Envoy uses internally) normalizes header names to lowercase, so `X-User-Role` becomes `x-user-role`.

## Key Takeaways

Header-based authorization in Istio is a powerful tool for implementing application-level access control decisions at the mesh layer. The most important thing to remember is that headers can be spoofed, so always combine header checks with source identity verification through mTLS. Use the `when` field with `request.headers` for custom headers, and prefer `request.auth.claims` when working with JWT tokens for cryptographically verified claims.
