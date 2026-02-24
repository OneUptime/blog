# How to Configure All AuthorizationPolicy Fields in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, AuthorizationPolicy, Security, RBAC, Kubernetes

Description: Complete guide to every AuthorizationPolicy field in Istio including rules, conditions, ALLOW and DENY actions, CUSTOM providers, and source/operation matching.

---

AuthorizationPolicy is how you control who can access what in your Istio mesh. It acts as a layer 7 firewall that can match on source identity, HTTP methods, paths, headers, and more. It is one of the most powerful security tools in Istio, and understanding every field gives you very precise access control.

## How Authorization Works

Istio evaluates authorization policies in a specific order:

1. CUSTOM policies are evaluated first
2. DENY policies are evaluated next
3. ALLOW policies are evaluated last

If any DENY policy matches, the request is denied. If there are ALLOW policies and none match, the request is denied. If there are no ALLOW policies at all, the request is allowed (unless a DENY matched). This is important to keep in mind when designing your policies.

## Top-Level Structure

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: my-policy
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  targetRef:
    kind: Service
    group: ""
    name: my-service
  action: ALLOW
  provider:
    name: my-ext-authz
  rules:
    - from:
        - source: {}
      to:
        - operation: {}
      when:
        - key: ""
          values: []
```

## Selector and Target Ref

```yaml
spec:
  selector:
    matchLabels:
      app: my-service
```

The `selector` matches pods by labels. If omitted, the policy applies to all workloads in the namespace. A policy in `istio-system` without a selector applies mesh-wide.

```yaml
spec:
  targetRef:
    kind: Gateway
    group: gateway.networking.k8s.io
    name: my-gateway
```

The `targetRef` is for Kubernetes Gateway API integration. It targets a specific Gateway or Service resource. `selector` and `targetRef` are mutually exclusive.

## Action

```yaml
spec:
  action: ALLOW
```

The `action` field determines what happens when the rules match:

- `ALLOW` - allow the request if rules match
- `DENY` - deny the request if rules match
- `AUDIT` - audit the request (log it) if rules match, but do not block it
- `CUSTOM` - delegate the authorization decision to an external provider

### ALLOW

The most common action. When a request matches the rules, it is allowed. If ALLOW policies exist and no rule matches, the request is denied.

### DENY

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-admin-from-outside
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  action: DENY
  rules:
    - to:
        - operation:
            paths: ["/admin*"]
      when:
        - key: source.namespace
          notValues: ["admin-tools"]
```

DENY rules are evaluated before ALLOW rules. Use them for blocklists.

### AUDIT

```yaml
spec:
  action: AUDIT
  rules:
    - to:
        - operation:
            paths: ["/api/sensitive/*"]
```

AUDIT logs the request but does not block it. Useful for monitoring access patterns before enforcing restrictions.

### CUSTOM

```yaml
spec:
  action: CUSTOM
  provider:
    name: my-ext-authz-provider
  rules:
    - to:
        - operation:
            paths: ["/api/*"]
```

CUSTOM delegates to an external authorization service configured in the mesh config. The `provider.name` references an `extensionProviders` entry in the MeshConfig.

## Provider

```yaml
spec:
  action: CUSTOM
  provider:
    name: my-ext-authz
```

The `provider` field is only used with `action: CUSTOM`. The `name` references an extension provider configured in the MeshConfig:

```yaml
# In MeshConfig
extensionProviders:
  - name: my-ext-authz
    envoyExtAuthzGrpc:
      service: ext-authz.auth.svc.cluster.local
      port: 9000
```

## Rules

Rules have three sections: `from`, `to`, and `when`. All sections within a single rule are ANDed together. Multiple rules are ORed.

### Empty Rules

A few special cases:

```yaml
# No rules at all - action applies to everything
spec:
  action: ALLOW
  # no rules field

# Empty rules array - deny all (for ALLOW action)
spec:
  action: ALLOW
  rules: []
```

A policy with `action: ALLOW` and no `rules` field allows all traffic to matching workloads. A policy with `action: ALLOW` and an empty `rules: []` effectively denies everything because no rule can match.

### From (Source)

```yaml
rules:
  - from:
      - source:
          principals:
            - "cluster.local/ns/bookinfo/sa/productpage"
          notPrincipals:
            - "cluster.local/ns/default/sa/untrusted"
          requestPrincipals:
            - "https://accounts.google.com/*"
          notRequestPrincipals:
            - "https://accounts.google.com/blocked-user"
          namespaces:
            - "bookinfo"
            - "frontend"
          notNamespaces:
            - "test"
          ipBlocks:
            - "10.0.0.0/8"
            - "172.16.0.0/12"
          notIpBlocks:
            - "10.0.0.1/32"
          remoteIpBlocks:
            - "203.0.113.0/24"
          notRemoteIpBlocks:
            - "203.0.113.50/32"
```

Source fields:

- `principals` - the peer identity (from mTLS certificate). Format: `cluster.local/ns/{namespace}/sa/{service-account}`. Supports prefix, suffix, and `*` matching.
- `notPrincipals` - negation of principals
- `requestPrincipals` - the request identity (from JWT). Format: `{issuer}/{subject}`. Supports wildcard.
- `notRequestPrincipals` - negation of request principals
- `namespaces` - source namespace (derived from peer certificate)
- `notNamespaces` - negation of namespaces
- `ipBlocks` - source IP address in CIDR format (as seen by the sidecar, usually the pod IP)
- `notIpBlocks` - negation of ipBlocks
- `remoteIpBlocks` - original client IP (when using X-Forwarded-For)
- `notRemoteIpBlocks` - negation of remoteIpBlocks

### To (Operation)

```yaml
rules:
  - to:
      - operation:
          hosts:
            - "api.example.com"
            - "*.internal.example.com"
          notHosts:
            - "admin.example.com"
          ports:
            - "8080"
            - "443"
          notPorts:
            - "9090"
          methods:
            - "GET"
            - "POST"
          notMethods:
            - "DELETE"
          paths:
            - "/api/v1/*"
            - "/health"
          notPaths:
            - "/api/v1/admin/*"
```

Operation fields:

- `hosts` - the host header value
- `notHosts` - negation of hosts
- `ports` - the destination port (as strings)
- `notPorts` - negation of ports
- `methods` - HTTP methods
- `notMethods` - negation of methods
- `paths` - URL paths. Supports exact match, prefix with `*`, and suffix with `*`
- `notPaths` - negation of paths

### When (Conditions)

```yaml
rules:
  - when:
      - key: request.headers[x-custom-header]
        values: ["allowed-value"]
      - key: source.namespace
        values: ["production"]
        notValues: ["staging"]
      - key: request.auth.claims[groups]
        values: ["admin", "editor"]
```

The `when` section provides additional conditions. Each condition has a `key` and either `values` or `notValues` (or both). Available keys include:

- `request.headers[name]` - request header value
- `source.ip` - source IP
- `remote.ip` - original client IP
- `source.namespace` - source namespace
- `source.principal` - source identity
- `request.auth.principal` - authenticated principal from JWT
- `request.auth.audiences` - JWT audiences
- `request.auth.presenter` - JWT authorized presenter
- `request.auth.claims[name]` - JWT claim values
- `destination.ip` - destination IP
- `destination.port` - destination port
- `connection.sni` - SNI for TLS connections
- `experimental.envoy.filters.*` - Envoy filter metadata

## Practical Examples

### Allow only specific namespaces

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: allow-bookinfo-only
  namespace: backend
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ["bookinfo", "frontend"]
```

### Deny specific paths from external IPs

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: deny-admin-external
  namespace: default
spec:
  selector:
    matchLabels:
      app: web-app
  action: DENY
  rules:
    - to:
        - operation:
            paths: ["/admin/*"]
      from:
        - source:
            notIpBlocks: ["10.0.0.0/8"]
```

### JWT-based authorization

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: require-jwt-admin
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-api
  action: ALLOW
  rules:
    - to:
        - operation:
            paths: ["/api/admin/*"]
      when:
        - key: request.auth.claims[role]
          values: ["admin"]
    - to:
        - operation:
            paths: ["/api/public/*"]
            methods: ["GET"]
```

This allows admin paths only for users with the admin role claim, and public paths for anyone making GET requests.

AuthorizationPolicy gives you the building blocks for sophisticated access control in your mesh. Combine ALLOW and DENY policies carefully, and always test your policies before rolling them out to production.
