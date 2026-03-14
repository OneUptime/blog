# How to Handle Security Policy Migration to Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, Kubernetes, MTLS, Authorization, Service Mesh

Description: A practical guide to migrating your existing Kubernetes security policies to Istio including mTLS, authorization policies, and network policies.

---

If you are running Kubernetes in production, you probably already have security policies in place. Network policies, RBAC rules, pod security standards, maybe even a service mesh like Linkerd. Migrating these to Istio requires careful planning because you do not want any gap in security coverage during the transition.

Here is how to approach the migration of each security layer.

## Mapping Your Current Security Posture

Before migrating anything, document what you have. Get a complete picture of your current security controls:

```bash
# List all NetworkPolicies
kubectl get networkpolicies --all-namespaces

# List all RBAC roles and bindings
kubectl get clusterroles,clusterrolebindings,roles,rolebindings --all-namespaces

# Check for existing PodSecurityPolicies or PodSecurityStandards
kubectl get podsecuritypolicies 2>/dev/null
kubectl get pods --all-namespaces -o json | \
  jq '.items[] | {name: .metadata.name, namespace: .metadata.namespace, securityContext: .spec.securityContext}'

# Check for any existing service mesh policies
kubectl get peerauthentication,authorizationpolicy,requestauthentication --all-namespaces 2>/dev/null
```

## Migrating Network Policies to Istio Authorization Policies

Kubernetes NetworkPolicies work at L3/L4 (IP addresses and ports). Istio AuthorizationPolicies work at L7 (HTTP methods, paths, headers) and can also do L4. The migration path is to replace NetworkPolicies with more granular Istio policies.

Here is a typical Kubernetes NetworkPolicy:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - port: 8080
      protocol: TCP
```

The equivalent Istio AuthorizationPolicy gives you more control:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  selector:
    matchLabels:
      app: backend
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/production/sa/frontend"]
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/api/*"]
        ports: ["8080"]
```

Notice the improvements. Instead of matching by pod labels, you match by service account identity (which is cryptographically verified through mTLS). And you can restrict not just the port, but also the HTTP method and path.

## Setting Up mTLS Step by Step

mTLS is the foundation of Istio security. Start with PERMISSIVE mode and gradually move to STRICT.

### Phase 1: PERMISSIVE Mode (allows both plaintext and mTLS)

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
```

### Phase 2: Verify mTLS is Working

```bash
# Check mTLS status between services
istioctl proxy-config listeners my-pod -o json | \
  jq '.[].filterChains[].transportSocket'

# Verify traffic is encrypted
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep "ssl"
```

### Phase 3: Switch to STRICT per-namespace

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: production
spec:
  mtls:
    mode: STRICT
```

### Phase 4: Switch to STRICT mesh-wide

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

Verify that nothing breaks after each phase before moving to the next.

## Creating a Default-Deny Policy

In Istio, if no AuthorizationPolicy is applied, all traffic is allowed. For a secure-by-default posture, create a default-deny policy first, then add explicit allow rules.

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: production
spec:
  {}  # Empty spec means deny all
```

Then add allow rules for each legitimate communication path:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend
  namespace: production
spec:
  selector:
    matchLabels:
      app: frontend
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["istio-system"]  # Allow ingress gateway
    to:
    - operation:
        methods: ["GET", "POST"]
        ports: ["8080"]
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-backend
  namespace: production
spec:
  selector:
    matchLabels:
      app: backend
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/production/sa/frontend"]
    to:
    - operation:
        ports: ["8080"]
```

## Adding JWT Authentication

For services that receive external traffic, add JWT validation at the mesh level:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-gateway
  jwtRules:
  - issuer: "https://auth.example.com"
    jwksUri: "https://auth.example.com/.well-known/jwks.json"
    forwardOriginalToken: true
```

Then enforce that requests must have a valid JWT:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-gateway
  action: ALLOW
  rules:
  - from:
    - source:
        requestPrincipals: ["https://auth.example.com/*"]
    when:
    - key: request.auth.claims[iss]
      values: ["https://auth.example.com"]
```

## Keeping NetworkPolicies During Transition

Do not delete your existing NetworkPolicies immediately. Run both Kubernetes NetworkPolicies and Istio AuthorizationPolicies in parallel during the transition.

```bash
# Verify NetworkPolicies are still active
kubectl get networkpolicies -n production

# Verify Istio policies are also active
kubectl get authorizationpolicies -n production
```

NetworkPolicies provide defense-in-depth even after Istio policies are in place. Many teams choose to keep them permanently as a secondary security layer. They operate at different levels (L3/L4 vs L7) and catching traffic at both layers is stronger than either alone.

## Testing Security Policies

Always test your policies before relying on them:

```bash
# Test that allowed traffic works
kubectl exec deploy/frontend -c frontend -- \
  curl -s -o /dev/null -w "%{http_code}" http://backend:8080/api/health

# Test that denied traffic is blocked
kubectl exec deploy/unauthorized-service -c app -- \
  curl -s -o /dev/null -w "%{http_code}" http://backend:8080/api/health
# Should return 403
```

Use `istioctl analyze` to check for policy issues:

```bash
istioctl analyze -n production
```

## Migration Order

Follow this order to minimize risk:

1. Install Istio with PERMISSIVE mTLS
2. Enable sidecar injection and verify services work
3. Create Istio AuthorizationPolicies that mirror existing NetworkPolicies
4. Test that both old and new policies work correctly
5. Switch to STRICT mTLS per-namespace
6. Add default-deny AuthorizationPolicies
7. Add RequestAuthentication for external-facing services
8. After a stabilization period, evaluate whether to keep or remove NetworkPolicies

Each step should have a verification period of at least a few days in production before moving to the next. Security policy migration is not something to rush through.

Document every policy change, test it thoroughly, and keep your rollback plan ready. The worst outcome is a security gap during migration, and the second worst is blocking legitimate traffic. Careful, phased migration avoids both.
