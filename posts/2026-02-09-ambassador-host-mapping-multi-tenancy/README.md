# How to Use Ambassador Ingress Controller Host and Mapping CRDs for Multi-Tenancy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Ambassador, Multi-Tenancy

Description: Learn how to implement multi-tenant architectures using Ambassador's Host and Mapping CRDs to isolate traffic, manage separate configurations, and provide dedicated hostnames for each tenant in Kubernetes.

---

Multi-tenancy requires isolating traffic and configuration for different tenants while sharing underlying infrastructure. Ambassador Edge Stack provides powerful Host and Mapping CRDs that enable sophisticated multi-tenant routing patterns. This guide shows you how to build secure, scalable multi-tenant systems with Ambassador.

## Understanding Multi-Tenant Routing

Multi-tenant routing in Ambassador typically follows these patterns:
- Subdomain-based tenants (tenant1.app.com, tenant2.app.com)
- Path-based tenants (app.com/tenant1, app.com/tenant2)
- Header-based tenants (using X-Tenant-ID headers)
- Mixed patterns combining multiple strategies

Ambassador's Host CRD manages hostname-specific configuration, while Mapping CRD handles routing rules. Together, they provide fine-grained control over multi-tenant traffic.

## Basic Multi-Tenant Setup

Create separate hosts for each tenant.

### Subdomain-Based Multi-Tenancy

```yaml
# tenant-hosts.yaml
# Tenant 1 Host
apiVersion: getambassador.io/v3alpha1
kind: Host
metadata:
  name: tenant1-host
  namespace: default
spec:
  hostname: tenant1.app.example.com
  tlsSecret:
    name: tenant1-tls
  requestPolicy:
    insecure:
      action: Redirect
---
# Tenant 2 Host
apiVersion: getambassador.io/v3alpha1
kind: Host
metadata:
  name: tenant2-host
  namespace: default
spec:
  hostname: tenant2.app.example.com
  tlsSecret:
    name: tenant2-tls
---
# Tenant 1 Mapping
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: tenant1-service
  namespace: default
spec:
  hostname: tenant1.app.example.com
  prefix: /
  service: tenant1-backend:80
  add_request_headers:
    x-tenant-id:
      value: tenant1
---
# Tenant 2 Mapping
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: tenant2-service
  namespace: default
spec:
  hostname: tenant2.app.example.com
  prefix: /
  service: tenant2-backend:80
  add_request_headers:
    x-tenant-id:
      value: tenant2
```

## Wildcard Host for Dynamic Tenants

Support unlimited tenants with wildcard routing.

### Wildcard Host Configuration

```yaml
# wildcard-tenant.yaml
apiVersion: getambassador.io/v3alpha1
kind: Host
metadata:
  name: wildcard-tenants
  namespace: default
spec:
  hostname: "*.tenants.example.com"
  tlsSecret:
    name: wildcard-tls
---
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: tenant-router
  namespace: default
spec:
  hostname: "*.tenants.example.com"
  prefix: /
  service: tenant-router-service:80
  # Extract tenant ID from hostname
  add_request_headers:
    x-tenant-host:
      value: "%REQ(:authority)%"
```

Backend service extracts tenant from header:

```python
# tenant-router.py
from flask import Flask, request
import re

app = Flask(__name__)

@app.route('/<path:path>')
def route_tenant(path):
    host = request.headers.get('x-tenant-host', '')

    # Extract tenant ID from subdomain
    match = re.match(r'([^.]+)\.tenants\.example\.com', host)
    if match:
        tenant_id = match.group(1)
        # Route to tenant-specific backend
        return forward_to_tenant(tenant_id, path)

    return "Invalid tenant", 404
```

## Tenant Isolation and Security

Implement security boundaries between tenants.

### Per-Tenant Authentication

```yaml
# tenant-auth.yaml
# Tenant 1 with OAuth2
apiVersion: getambassador.io/v3alpha1
kind: Filter
metadata:
  name: tenant1-oauth
  namespace: default
spec:
  OAuth2:
    authorizationURL: https://tenant1-auth.example.com/oauth/authorize
    clientID: tenant1-client-id
    secret: tenant1-oauth-secret
---
apiVersion: getambassador.io/v3alpha1
kind: FilterPolicy
metadata:
  name: tenant1-auth-policy
  namespace: default
spec:
  rules:
  - host: tenant1.app.example.com
    path: "*"
    filters:
    - name: tenant1-oauth
---
# Tenant 2 with JWT
apiVersion: getambassador.io/v3alpha1
kind: Filter
metadata:
  name: tenant2-jwt
  namespace: default
spec:
  JWT:
    jwksURI: https://tenant2-auth.example.com/.well-known/jwks.json
    issuer: https://tenant2-auth.example.com
    audience: tenant2-api
---
apiVersion: getambassador.io/v3alpha1
kind: FilterPolicy
metadata:
  name: tenant2-auth-policy
  namespace: default
spec:
  rules:
  - host: tenant2.app.example.com
    path: "*"
    filters:
    - name: tenant2-jwt
```

### Tenant-Specific Rate Limiting

```yaml
# tenant-rate-limits.yaml
# Premium tenant - high limits
apiVersion: getambassador.io/v3alpha1
kind: RateLimitService
metadata:
  name: premium-rate-limit
  namespace: default
spec:
  service: ratelimit:8081
---
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: premium-tenant
  namespace: default
  labels:
    ratelimit-domain: premium
spec:
  hostname: premium.app.example.com
  prefix: /
  service: premium-backend:80
  labels:
    ratelimit:
      requests_per_unit: 10000
      unit: hour
---
# Basic tenant - standard limits
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: basic-tenant
  namespace: default
  labels:
    ratelimit-domain: basic
spec:
  hostname: basic.app.example.com
  prefix: /
  service: basic-backend:80
  labels:
    ratelimit:
      requests_per_unit: 1000
      unit: hour
```

## Path-Based Multi-Tenancy

Route tenants using URL paths instead of subdomains.

### Path Prefix Routing

```yaml
# path-based-tenants.yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: tenant1-path
  namespace: default
spec:
  hostname: app.example.com
  prefix: /tenant1/
  rewrite: /
  service: tenant1-backend:80
  add_request_headers:
    x-tenant-id:
      value: tenant1
---
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: tenant2-path
  namespace: default
spec:
  hostname: app.example.com
  prefix: /tenant2/
  rewrite: /
  service: tenant2-backend:80
  add_request_headers:
    x-tenant-id:
      value: tenant2
```

## Advanced Multi-Tenant Patterns

Implement sophisticated tenant routing.

### Tenant Priority and Load Balancing

```yaml
# tenant-priority.yaml
# High-priority tenant
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: enterprise-tenant
  namespace: default
spec:
  hostname: enterprise.app.example.com
  prefix: /
  service: enterprise-backend:80
  load_balancer:
    policy: least_request
  circuit_breakers:
    max_connections: 10000
---
# Standard tenant
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: standard-tenant
  namespace: default
spec:
  hostname: standard.app.example.com
  prefix: /
  service: standard-backend:80
  load_balancer:
    policy: round_robin
  circuit_breakers:
    max_connections: 1000
```

### Tenant-Specific Timeouts

```yaml
# tenant-timeouts.yaml
# Long-running batch tenant
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: batch-tenant
  namespace: default
spec:
  hostname: batch.app.example.com
  prefix: /
  service: batch-backend:80
  timeout_ms: 300000  # 5 minutes
---
# Real-time tenant
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: realtime-tenant
  namespace: default
spec:
  hostname: realtime.app.example.com
  prefix: /
  service: realtime-backend:80
  timeout_ms: 5000  # 5 seconds
```

## Tenant Onboarding Automation

Automate tenant provisioning.

### Tenant Provisioning Script

```bash
#!/bin/bash
# provision-tenant.sh

TENANT_ID=$1
NAMESPACE="tenants"

echo "Provisioning tenant: $TENANT_ID"

# Create namespace
kubectl create namespace tenant-$TENANT_ID

# Create TLS certificate (using cert-manager)
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: ${TENANT_ID}-tls
  namespace: default
spec:
  secretName: ${TENANT_ID}-tls
  dnsNames:
  - ${TENANT_ID}.app.example.com
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
EOF

# Create Host
kubectl apply -f - <<EOF
apiVersion: getambassador.io/v3alpha1
kind: Host
metadata:
  name: ${TENANT_ID}-host
  namespace: default
spec:
  hostname: ${TENANT_ID}.app.example.com
  tlsSecret:
    name: ${TENANT_ID}-tls
EOF

# Create Mapping
kubectl apply -f - <<EOF
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: ${TENANT_ID}-mapping
  namespace: default
spec:
  hostname: ${TENANT_ID}.app.example.com
  prefix: /
  service: ${TENANT_ID}-backend.tenant-${TENANT_ID}:80
  add_request_headers:
    x-tenant-id:
      value: ${TENANT_ID}
EOF

echo "Tenant $TENANT_ID provisioned successfully"
```

## Monitoring Multi-Tenant Systems

Track tenant-specific metrics.

### Tenant Metrics Collection

```yaml
# tenant-metrics.yaml
apiVersion: getambassador.io/v3alpha1
kind: Module
metadata:
  name: ambassador
  namespace: default
spec:
  config:
    diagnostics:
      enabled: true
    # Add tenant labels to metrics
    add_linkerd_headers: false
    lua_scripts: |
      function envoy_on_response(response_handle)
        local tenant = response_handle:headers():get("x-tenant-id")
        if tenant then
          response_handle:logInfo("tenant=" .. tenant)
        end
      end
```

Query tenant metrics:

```bash
# Get requests per tenant
kubectl exec -n ambassador <ambassador-pod> -- \
  curl localhost:8877/metrics | grep tenant

# Monitor tenant traffic
kubectl logs -n ambassador -l product=aes --follow | grep "tenant="
```

## Testing Multi-Tenant Setup

Verify tenant isolation:

```bash
# Test tenant1
curl https://tenant1.app.example.com/api/test

# Test tenant2
curl https://tenant2.app.example.com/api/test

# Verify tenant ID headers
curl -v https://tenant1.app.example.com/ | grep x-tenant-id

# Test authentication isolation
curl -H "Authorization: Bearer tenant1-token" \
  https://tenant2.app.example.com/
# Should fail

# Load test specific tenant
ab -n 1000 -c 10 https://tenant1.app.example.com/
```

## Troubleshooting

Common multi-tenant issues:

**Cross-tenant access**: Verify FilterPolicy rules are correctly scoped

**Certificate issues**: Check TLS secrets are in correct namespace

**Routing conflicts**: Use priority to resolve mapping conflicts:
```yaml
spec:
  priority: 10
```

## Conclusion

Ambassador's Host and Mapping CRDs provide powerful primitives for building multi-tenant systems in Kubernetes. By combining subdomain routing, tenant-specific authentication, and isolated rate limiting, you can build secure, scalable multi-tenant platforms. Always implement proper tenant isolation, monitor tenant-specific metrics, and automate tenant onboarding for operational efficiency. The declarative nature of Ambassador's CRDs makes multi-tenant configuration manageable and scalable.
