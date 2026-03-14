# How to Configure Istio Authorization Policies with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Istio, Authorization Policy, Service Mesh, Zero Trust, Security

Description: Manage Istio AuthorizationPolicy resources using Flux CD GitOps to enforce zero-trust service-to-service access control declaratively.

---

## Introduction

Istio's AuthorizationPolicy enables zero-trust security at the network level. Instead of relying solely on Kubernetes NetworkPolicies (which operate at L3/L4), Istio AuthorizationPolicy works at L7, allowing you to define access control based on service identity, JWT claims, HTTP methods, paths, and headers.

Managing AuthorizationPolicies through Flux CD ensures your security posture is version-controlled and auditable. Every access rule change goes through a pull request, giving security teams visibility and control over service communication permissions.

This guide covers defining and managing Istio AuthorizationPolicy resources with Flux CD, including namespace-wide defaults, service-specific rules, and JWT-based access control.

## Prerequisites

- Kubernetes cluster with Istio installed and mTLS enabled
- Flux CD v2 bootstrapped to your Git repository
- Services running in Istio-injected namespaces

## Step 1: Create a Deny-All Default Policy

Start with a deny-all baseline and explicitly allow only what is needed:

```yaml
# clusters/my-cluster/istio-policies/deny-all.yaml
# Apply deny-all to the entire production namespace
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec:
  {}  # Empty spec = deny all traffic to this namespace
```

## Step 2: Allow Specific Service-to-Service Communication

```yaml
# clusters/my-cluster/istio-policies/allow-frontend-to-api.yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-to-api
  namespace: production
spec:
  # Target the API service
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    - from:
        # Only allow traffic from the frontend service account
        - source:
            principals:
              - cluster.local/ns/production/sa/frontend-service
      to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/api/*"]
---
# clusters/my-cluster/istio-policies/allow-api-to-db.yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-api-to-db
  namespace: production
spec:
  selector:
    matchLabels:
      app: database-proxy
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/production/sa/api-service
      to:
        - operation:
            ports: ["5432"]
```

## Step 3: Allow Ingress Gateway Access

```yaml
# clusters/my-cluster/istio-policies/allow-ingress.yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-ingress-gateway
  namespace: production
spec:
  selector:
    matchLabels:
      app: frontend-service
  action: ALLOW
  rules:
    - from:
        - source:
            # Allow traffic from the ingress gateway
            principals:
              - cluster.local/ns/istio-system/sa/istio-ingressgateway-service-account
      to:
        - operation:
            methods: ["GET", "POST", "PUT", "DELETE"]
```

## Step 4: JWT-Based Authorization

```yaml
# clusters/my-cluster/istio-policies/jwt-auth-policy.yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: jwt-admin-only
  namespace: production
spec:
  selector:
    matchLabels:
      app: admin-api
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals:
              # Allow any authenticated JWT from our OIDC provider
              - "https://auth.example.com/*"
      when:
        # Require the admin role claim
        - key: request.auth.claims[role]
          values: ["admin", "super-admin"]
      to:
        - operation:
            methods: ["GET", "POST", "PUT", "DELETE"]
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/istio-policies/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deny-all.yaml
  - allow-frontend-to-api.yaml
  - allow-api-to-db.yaml
  - allow-ingress.yaml
  - jwt-auth-policy.yaml
---
# clusters/my-cluster/flux-kustomization-istio-policies.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: istio-authz-policies
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: istio
  path: ./clusters/my-cluster/istio-policies
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 6: Test and Validate Policies

```bash
# Apply policies via Flux
flux reconcile kustomization istio-authz-policies

# Test allowed path
kubectl exec -n production deploy/frontend-service -- \
  curl -sv http://api-service/api/data

# Test denied path (should return 403)
kubectl exec -n production deploy/api-service -- \
  curl -sv http://frontend-service/

# Analyze policy coverage
istioctl analyze -n production

# Check authorization policy status
kubectl get authorizationpolicy -n production
```

## Best Practices

- Start with a `deny-all` AuthorizationPolicy per namespace, then add explicit ALLOW policies - this is the zero-trust model.
- Use Kubernetes ServiceAccounts as the principal identity in `source.principals` - each service should have its own dedicated ServiceAccount for precise control.
- Apply the ALLOW policy for the Istio ingress gateway to allow external traffic into your namespace - without this, no external requests reach your services.
- Use the `AUDIT` action during policy development to log (but not block) traffic, then switch to `ALLOW`/`DENY` once you are confident in the rules.
- Review and rotate policies when service accounts change - keep the AuthorizationPolicy source principals in sync with your service's ServiceAccount.

## Conclusion

Managing Istio AuthorizationPolicies through Flux CD gives your security team a GitOps-controlled, auditable zero-trust network policy framework. Every access control rule is a code review away, with full Git history tracking who authorized which service-to-service communication and when - making security compliance straightforward to demonstrate and enforce.
