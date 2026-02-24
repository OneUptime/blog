# How to Write AuthorizationPolicy YAML (Cheat Sheet)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, AuthorizationPolicy, YAML, Cheat Sheet, Security, RBAC

Description: Complete cheat sheet for writing Istio AuthorizationPolicy YAML covering allow, deny, and custom actions with practical examples.

---

AuthorizationPolicy is how you implement access control in Istio. It lets you specify which services can talk to which other services, what methods and paths are allowed, and under what conditions. Think of it as a firewall for your service mesh, but one that understands application-level concepts like HTTP methods, paths, and headers.

Here is a thorough reference with YAML examples for every common scenario.

## Basic Structure

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: my-policy
  namespace: default
spec:
  selector:          # Which workloads this policy targets
    matchLabels:
      app: my-app
  action: ALLOW      # ALLOW, DENY, AUDIT, or CUSTOM
  rules:
    - from: []       # Source conditions
      to: []         # Destination conditions
      when: []       # Additional conditions
```

## Default Deny All

An empty spec with no rules denies all traffic to workloads in the namespace:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: default
spec:
  {}
```

This is the foundation of a zero-trust setup. Apply it first, then add specific ALLOW rules.

## Allow All

Allow all traffic to workloads in the namespace (effectively disabling authorization):

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-all
  namespace: default
spec:
  rules:
    - {}
```

## Allow from Specific Service Accounts

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/frontend/sa/frontend-sa"
```

The `principals` field uses the SPIFFE identity format: `cluster.local/ns/<namespace>/sa/<service-account>`.

## Allow from Specific Namespaces

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-from-namespaces
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces:
              - frontend
              - monitoring
```

## Allow Specific HTTP Methods and Paths

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-read-only
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/frontend/sa/frontend-sa"
      to:
        - operation:
            methods: ["GET", "HEAD"]
            paths: ["/api/*", "/health"]
```

### Path Matching

```yaml
# Exact path
paths: ["/api/v1/users"]

# Prefix (use wildcard)
paths: ["/api/*"]

# Suffix match
paths: ["*/info"]

# All paths
paths: ["*"]
```

### Method Matching

```yaml
# Specific methods
methods: ["GET", "POST"]

# All methods
methods: ["*"]
```

## Allow Based on Request Headers

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-with-header
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - to:
        - operation:
            methods: ["GET"]
      when:
        - key: request.headers[x-api-key]
          values: ["my-secret-key-123"]
```

## Allow Based on JWT Claims

If you have RequestAuthentication set up, you can authorize based on JWT claims:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-admin
  namespace: default
spec:
  selector:
    matchLabels:
      app: admin-panel
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["https://auth.example.com/*"]
      when:
        - key: request.auth.claims[role]
          values: ["admin"]
```

## Allow from Specific IP Ranges

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-internal
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - from:
        - source:
            ipBlocks:
              - "10.0.0.0/8"
              - "172.16.0.0/12"
```

## Deny Specific Traffic

DENY rules take precedence over ALLOW rules:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-admin-path
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-server
  action: DENY
  rules:
    - to:
        - operation:
            paths: ["/admin/*"]
      from:
        - source:
            notNamespaces: ["admin"]
```

This denies access to `/admin/*` from any namespace except `admin`.

## Deny Using Negation

Use `not*` fields to invert matching:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-external
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-server
  action: DENY
  rules:
    - from:
        - source:
            notPrincipals:
              - "cluster.local/ns/frontend/sa/frontend-sa"
              - "cluster.local/ns/backend/sa/backend-sa"
      to:
        - operation:
            paths: ["/internal/*"]
```

## Available Negation Fields

In the `source` section:

```yaml
from:
  - source:
      notPrincipals: []
      notNamespaces: []
      notIpBlocks: []
      notRequestPrincipals: []
```

In the `operation` section:

```yaml
to:
  - operation:
      notMethods: []
      notPaths: []
      notPorts: []
      notHosts: []
```

## Port-Based Authorization

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-port
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  action: ALLOW
  rules:
    - to:
        - operation:
            ports: ["8080", "8443"]
```

## Host-Based Authorization

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-host
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  action: ALLOW
  rules:
    - to:
        - operation:
            hosts: ["app.example.com"]
```

## Audit Action (Dry Run)

AUDIT policies log matches without enforcing them:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: audit-external
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-server
  action: AUDIT
  rules:
    - from:
        - source:
            notNamespaces: ["default"]
```

## Custom Action (External Authorization)

Delegate authorization to an external service:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ext-authz
  namespace: default
spec:
  selector:
    matchLabels:
      app: api-server
  action: CUSTOM
  provider:
    name: my-ext-authz
  rules:
    - to:
        - operation:
            paths: ["/api/*"]
```

The provider must be configured in the mesh config:

```yaml
meshConfig:
  extensionProviders:
    - name: my-ext-authz
      envoyExtAuthzHttp:
        service: ext-authz.auth.svc.cluster.local
        port: 8080
        includeRequestHeadersInCheck:
          - authorization
          - x-custom-header
```

## Mesh-Wide Policy

Apply to all workloads in the mesh by placing it in `istio-system` with no selector:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: mesh-wide-policy
  namespace: istio-system
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces:
              - default
              - backend
              - frontend
```

## Combining Multiple Conditions

### AND Logic (within a single rule)

All conditions in a single rule must match:

```yaml
  rules:
    - from:
        - source:
            namespaces: ["frontend"]       # AND
      to:
        - operation:
            methods: ["GET"]               # AND
            paths: ["/api/*"]              # AND
      when:
        - key: request.headers[x-env]
          values: ["production"]           # AND
```

### OR Logic (multiple rules or multiple entries)

Multiple rules are OR-ed:

```yaml
  rules:
    - from:                                # Rule 1
        - source:
            namespaces: ["frontend"]
    - from:                                # OR Rule 2
        - source:
            namespaces: ["monitoring"]
```

Multiple entries within `from` or `to` are also OR-ed:

```yaml
  rules:
    - from:
        - source:                          # Source option 1
            namespaces: ["frontend"]
        - source:                          # OR Source option 2
            principals: ["cluster.local/ns/admin/sa/admin-sa"]
```

## Full Production Example

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: api-server-authz
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    # Frontend can read data
    - from:
        - source:
            principals:
              - "cluster.local/ns/frontend/sa/frontend-sa"
      to:
        - operation:
            methods: ["GET"]
            paths: ["/api/*"]
    # Backend services have full access
    - from:
        - source:
            namespaces: ["backend"]
      to:
        - operation:
            methods: ["GET", "POST", "PUT", "DELETE"]
            paths: ["/api/*", "/internal/*"]
    # Monitoring can access health endpoints
    - from:
        - source:
            namespaces: ["monitoring"]
      to:
        - operation:
            methods: ["GET"]
            paths: ["/health", "/metrics"]
```

This example shows a realistic authorization setup where different callers get different levels of access to the API server. Adjust the principals, namespaces, methods, and paths to match your application's requirements.
