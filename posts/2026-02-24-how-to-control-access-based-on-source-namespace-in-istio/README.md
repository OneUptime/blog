# How to Control Access Based on Source Namespace in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, Namespace, Security, Kubernetes

Description: Practical guide to using Istio authorization policies for namespace-based access control to isolate services across team and environment boundaries.

---

Namespace-based access control is one of the most practical patterns in Istio. It maps naturally to how most teams organize their Kubernetes clusters - services grouped by team, environment, or domain into separate namespaces. With Istio's AuthorizationPolicy, you can enforce that only services in approved namespaces can talk to each other.

This is simpler than service-account-based policies and provides a strong security boundary without requiring every team to manage individual service identities.

## How Namespace Identity Works in Istio

When Istio's mTLS is enabled (which is the default in most installations), every sidecar gets a certificate that encodes the pod's identity. This identity includes the namespace. When service A in namespace `frontend` calls service B in namespace `backend`, the sidecar for service B can verify that the call came from the `frontend` namespace.

The identity looks like this in SPIFFE format:

```text
spiffe://cluster.local/ns/frontend/sa/web-app
```

The namespace is the second segment after `ns/`. Istio extracts this and makes it available for authorization policy evaluation.

## Basic Namespace ALLOW Policy

Allow traffic to a service only from specific namespaces:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-from-frontend
  namespace: backend
spec:
  selector:
    matchLabels:
      app: api-server
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ["frontend"]
```

Only traffic from the `frontend` namespace can reach the `api-server` workload in the `backend` namespace. Everything else gets a 403.

## Allowing Multiple Namespaces

List multiple namespaces to allow traffic from several sources:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-trusted-namespaces
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
              - "frontend"
              - "mobile-bff"
              - "admin-panel"
              - "monitoring"
```

The namespaces list is OR-ed. Traffic from any of these namespaces is allowed.

## Namespace-Wide Protection

Apply a policy to all services in a namespace by omitting the selector:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: namespace-isolation
  namespace: production
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces:
              - "production"
              - "istio-system"
```

Every service in the `production` namespace can only be reached from within `production` itself or from `istio-system` (where the ingress gateway usually lives). This creates strong namespace isolation with a single policy.

## Using notNamespaces for Exclusion

Sometimes it's easier to block specific namespaces than to list all allowed ones:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-sandbox
  namespace: production
spec:
  action: DENY
  rules:
    - from:
        - source:
            namespaces:
              - "sandbox"
              - "dev"
              - "testing"
```

This denies traffic from development namespaces while allowing everything else. It's a good safety net for production environments.

You can also use `notNamespaces` within an ALLOW rule:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-non-sandbox
  namespace: staging
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            notNamespaces: ["sandbox"]
```

This allows traffic from every namespace except `sandbox`.

## Combining Namespace with Other Conditions

Namespace checks combine naturally with method and path restrictions:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: namespace-plus-operation
  namespace: backend
spec:
  selector:
    matchLabels:
      app: user-service
  action: ALLOW
  rules:
    # Frontend can only read
    - from:
        - source:
            namespaces: ["frontend"]
      to:
        - operation:
            methods: ["GET"]
    # Backend services can read and write
    - from:
        - source:
            namespaces: ["backend", "worker"]
      to:
        - operation:
            methods: ["GET", "POST", "PUT", "DELETE"]
    # Monitoring can access metrics
    - from:
        - source:
            namespaces: ["monitoring"]
      to:
        - operation:
            paths: ["/metrics"]
            methods: ["GET"]
```

This gives different levels of access based on which namespace the caller is in.

## Environment Isolation Pattern

A common cluster setup has multiple environments (dev, staging, production) in the same cluster, each in its own namespace. Namespace policies ensure they're properly isolated:

```yaml
# Production namespace - strict isolation
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: prod-isolation
  namespace: production
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ["production", "istio-system"]
---
# Staging namespace - allows production to call it for integration testing
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: staging-isolation
  namespace: staging
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ["staging", "production", "istio-system"]
---
# Dev namespace - open to everything
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: dev-open
  namespace: dev
spec:
  action: ALLOW
  rules:
    - {}
```

Production is locked down tight, staging is slightly more open, and dev is fully open.

## Team-Based Isolation

When different teams own different namespaces, you can set up policies that reflect your org structure:

```yaml
# Team A's namespace
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: team-a-access
  namespace: team-a-services
spec:
  action: ALLOW
  rules:
    # Internal team traffic
    - from:
        - source:
            namespaces: ["team-a-services"]
    # Shared API gateway
    - from:
        - source:
            namespaces: ["shared-gateway"]
    # Specific cross-team dependencies
    - from:
        - source:
            namespaces: ["team-b-services"]
      to:
        - operation:
            paths: ["/api/shared/*"]
```

Team A's services are accessible internally, through the shared gateway, and Team B can access only the shared API endpoints. This prevents accidental coupling between teams while allowing intentional dependencies.

## Ingress Gateway and Namespaces

Traffic from the Istio ingress gateway comes from the `istio-system` namespace (or wherever your gateway is deployed). Make sure to include it in your allowed namespaces:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-ingress
  namespace: my-app
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ["istio-system"]
    - from:
        - source:
            namespaces: ["my-app"]
```

Forgetting to include the ingress gateway's namespace is a very common mistake that causes all external traffic to be blocked.

## Verifying Namespace-Based Policies

Test that your policies work correctly:

```bash
# Deploy test pods in different namespaces
kubectl run test-pod --image=curlimages/curl -n frontend -- sleep 3600
kubectl run test-pod --image=curlimages/curl -n backend -- sleep 3600
kubectl run test-pod --image=curlimages/curl -n sandbox -- sleep 3600

# Test from allowed namespace
kubectl exec -n frontend test-pod -- curl -s -o /dev/null -w "%{http_code}" http://api-server.backend:8080/api/data

# Test from blocked namespace
kubectl exec -n sandbox test-pod -- curl -s -o /dev/null -w "%{http_code}" http://api-server.backend:8080/api/data
```

## Important Considerations

**mTLS must be enabled.** Namespace-based policies rely on the identity information in mTLS certificates. If mTLS is disabled or in permissive mode, namespace verification won't work for plaintext connections. Use `PeerAuthentication` to enforce strict mTLS:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: backend
spec:
  mtls:
    mode: STRICT
```

**External traffic has no namespace.** Traffic coming from outside the mesh (not through the ingress gateway) doesn't have a namespace identity. It won't match any `namespaces` condition, so it will be denied by ALLOW policies that require specific namespaces.

**Gateway namespace matters.** If you deploy your ingress gateway in a custom namespace instead of `istio-system`, update your policies accordingly.

Namespace-based access control gives you meaningful security boundaries that align with how you already organize your Kubernetes resources. It's the right starting point for most teams before moving to more granular service-account-based policies.
