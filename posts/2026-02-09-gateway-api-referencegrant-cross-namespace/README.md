# How to Use Gateway API ReferenceGrant for Cross-Namespace Resource Sharing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Gateway API, Security

Description: Configure ReferenceGrant resources to enable secure cross-namespace references in the Gateway API, allowing routes to reference services and gateways in different namespaces while maintaining proper security boundaries and tenant isolation.

---

The Kubernetes Gateway API uses ReferenceGrant to enable secure cross-namespace resource references. By default, routes can only reference backends in the same namespace. ReferenceGrant explicitly grants permission for cross-namespace access, maintaining security while enabling shared infrastructure patterns. This guide shows you how to use ReferenceGrant effectively.

## Why Cross-Namespace References Matter

In multi-tenant clusters or complex architectures, you need to reference resources across namespace boundaries:

- Centralized gateway in one namespace serving routes from multiple application namespaces
- Shared services (databases, caches) in a platform namespace accessed by application namespaces
- Development teams deploying routes in their own namespaces connecting to shared infrastructure

Without ReferenceGrant, you'd need to duplicate resources or put everything in one namespace, which creates security and organizational issues.

## Basic ReferenceGrant Example

Allow HTTPRoutes in the `frontend` namespace to reference services in the `backend` namespace:

```yaml
# backend-reference-grant.yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-frontend-to-backend
  namespace: backend  # Grant created in the target namespace
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    namespace: frontend  # Source namespace
  to:
  - group: ""  # Core API group (for Service)
    kind: Service
```

This grant allows any HTTPRoute in `frontend` to reference any Service in `backend`:

```yaml
# frontend-route.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: app-route
  namespace: frontend
spec:
  parentRefs:
  - name: shared-gateway
    namespace: infrastructure
  rules:
  - backendRefs:
    - name: api-service
      namespace: backend  # Cross-namespace reference
      port: 8080
```

Apply both manifests:

```bash
kubectl apply -f backend-reference-grant.yaml
kubectl apply -f frontend-route.yaml
```

## Granting Access to Specific Services

Restrict the grant to specific service names:

```yaml
# specific-service-grant.yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-frontend-to-specific-services
  namespace: backend
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    namespace: frontend
  to:
  - group: ""
    kind: Service
    name: api-service  # Only allow access to this specific service
  - group: ""
    kind: Service
    name: auth-service  # And this one
```

Attempting to reference other services in the `backend` namespace will fail.

## Gateway Cross-Namespace Access

Allow routes in application namespaces to attach to a central gateway:

```yaml
# shared-gateway.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: shared-gateway
  namespace: infrastructure
spec:
  gatewayClassName: kong
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: Selector
        selector:
          matchLabels:
            gateway-access: allowed
---
# Grant access from app namespaces
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-app-namespaces-to-gateway
  namespace: infrastructure
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    namespace: app-team-1
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    namespace: app-team-2
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    namespace: app-team-3
  to:
  - group: gateway.networking.k8s.io
    kind: Gateway
    name: shared-gateway
```

Teams deploy routes in their own namespaces:

```yaml
# team1-route.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: team1-app
  namespace: app-team-1
spec:
  parentRefs:
  - name: shared-gateway
    namespace: infrastructure  # Cross-namespace gateway reference
  hostnames:
  - "team1.example.com"
  rules:
  - backendRefs:
    - name: team1-service
      port: 8080  # Service in same namespace
```

## TLS Certificate Sharing

Share TLS certificates across namespaces:

```yaml
# certificate in certs namespace
apiVersion: v1
kind: Secret
metadata:
  name: wildcard-tls-cert
  namespace: certs
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-cert>
  tls.key: <base64-encoded-key>
---
# Grant access to the certificate
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-gateway-to-certs
  namespace: certs
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: Gateway
    namespace: infrastructure
  to:
  - group: ""
    kind: Secret
    name: wildcard-tls-cert
---
# Gateway references the certificate
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: shared-gateway
  namespace: infrastructure
spec:
  gatewayClassName: kong
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: wildcard-tls-cert
        namespace: certs  # Cross-namespace certificate reference
```

## Multi-Tenancy Pattern

Implement secure multi-tenancy with ReferenceGrant:

```yaml
# Platform provides shared gateway and services
# platform namespace
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: platform-gateway
  namespace: platform
spec:
  gatewayClassName: kong
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
---
apiVersion: v1
kind: Service
metadata:
  name: shared-auth-service
  namespace: platform
spec:
  selector:
    app: auth
  ports:
  - port: 8080
---
# Grant tenant1 access to gateway and shared services
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: tenant1-platform-access
  namespace: platform
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    namespace: tenant1
  to:
  - group: gateway.networking.k8s.io
    kind: Gateway
    name: platform-gateway
  - group: ""
    kind: Service
    name: shared-auth-service
---
# Grant tenant2 access (separate grant for isolation)
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: tenant2-platform-access
  namespace: platform
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    namespace: tenant2
  to:
  - group: gateway.networking.k8s.io
    kind: Gateway
    name: platform-gateway
  - group: ""
    kind: Service
    name: shared-auth-service
```

Tenants deploy their routes:

```yaml
# tenant1-route.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: tenant1-app
  namespace: tenant1
spec:
  parentRefs:
  - name: platform-gateway
    namespace: platform
  hostnames:
  - "tenant1.example.com"
  rules:
  # Route /auth to shared service
  - matches:
    - path:
        type: PathPrefix
        value: /auth
    backendRefs:
    - name: shared-auth-service
      namespace: platform
      port: 8080
  # Route / to tenant's own service
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: tenant1-app-service
      port: 8080
```

## Granting Access for Different Route Types

Grant access for multiple route types:

```yaml
# multi-route-type-grant.yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-all-route-types
  namespace: backend
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    namespace: frontend
  - group: gateway.networking.k8s.io
    kind: GRPCRoute
    namespace: frontend
  - group: gateway.networking.k8s.io
    kind: TLSRoute
    namespace: frontend
  - group: gateway.networking.k8s.io
    kind: TCPRoute
    namespace: frontend
  to:
  - group: ""
    kind: Service
```

## Auditing Cross-Namespace Access

List all ReferenceGrants in your cluster:

```bash
kubectl get referencegrants -A
```

View details of a grant:

```bash
kubectl describe referencegrant allow-frontend-to-backend -n backend
```

Check which routes use cross-namespace references:

```bash
# Find HTTPRoutes with cross-namespace backend refs
kubectl get httproutes -A -o jsonpath='{range .items[*]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.spec.rules[*].backendRefs[*].namespace}{"\n"}{end}' | grep -v "^$"
```

## Security Best Practices

Follow these security guidelines:

**1. Principle of least privilege**: Grant access only to specific resources when possible:

```yaml
# Good: Specific service
spec:
  to:
  - group: ""
    kind: Service
    name: api-service

# Avoid unless necessary: All services
spec:
  to:
  - group: ""
    kind: Service
```

**2. Document grants**: Add annotations explaining why the grant exists:

```yaml
metadata:
  name: frontend-backend-grant
  annotations:
    description: "Allows frontend team to access backend API services"
    owner: "platform-team"
    created-by: "jane@example.com"
```

**3. Regular audits**: Periodically review grants and remove unused ones:

```bash
# Script to find unused grants
for grant in $(kubectl get referencegrants -A -o json | jq -r '.items[] | "\(.metadata.namespace)/\(.metadata.name)"'); do
  echo "Checking grant: $grant"
  # Add logic to verify if grant is still needed
done
```

**4. Namespace labels**: Use labels to organize granted access:

```yaml
metadata:
  labels:
    access-type: cross-namespace
    source-team: frontend
    target-team: backend
```

## Troubleshooting Reference Errors

When a cross-namespace reference fails, check these areas:

```bash
# 1. Verify ReferenceGrant exists in target namespace
kubectl get referencegrant -n backend

# 2. Check HTTPRoute status for reference errors
kubectl describe httproute app-route -n frontend

# 3. Verify the grant allows the specific source namespace
kubectl get referencegrant -n backend -o yaml

# 4. Check if the grant allows the specific resource kind
kubectl get referencegrant -n backend -o jsonpath='{.items[*].spec.to[*].kind}'
```

Common error in HTTPRoute status:

```yaml
status:
  parents:
  - conditions:
    - type: ResolvedRefs
      status: "False"
      reason: RefNotPermitted
      message: "Backend ref to backend/api-service not permitted by any ReferenceGrant"
```

Fix by creating or updating the ReferenceGrant.

## Automating Grant Management

Use a GitOps approach to manage grants:

```yaml
# argocd-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: reference-grants
spec:
  project: default
  source:
    repoURL: https://github.com/company/k8s-config
    path: reference-grants
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      prune: true
```

Store grants in Git for version control and audit trail.

## Revoking Access

Remove a ReferenceGrant to revoke access:

```bash
kubectl delete referencegrant allow-frontend-to-backend -n backend
```

Routes referencing the now-forbidden resources will fail with `RefNotPermitted` errors.

ReferenceGrant provides secure, explicit cross-namespace resource sharing in the Gateway API. Use it to enable shared infrastructure patterns while maintaining clear security boundaries. Always grant the minimum necessary access, document why grants exist, and regularly audit grants to remove unused permissions. This approach balances operational flexibility with security best practices in multi-tenant environments.
