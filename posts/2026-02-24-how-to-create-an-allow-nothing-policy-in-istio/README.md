# How to Create an Allow-Nothing Policy in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, Zero Trust, Security, Kubernetes

Description: How to implement an allow-nothing authorization policy in Istio as the foundation for a zero-trust security model in your service mesh.

---

An allow-nothing policy is the starting point for zero-trust networking in Istio. It blocks all traffic to a workload or namespace by creating an ALLOW policy with no rules. Since ALLOW policies implicitly deny everything that doesn't match, an ALLOW policy with no matching rules denies everything.

This is different from a deny-all policy (which uses `action: DENY`). The allow-nothing approach is the recommended pattern because it works with Istio's default policy evaluation logic.

## How Allow-Nothing Works

When you apply an AuthorizationPolicy with `action: ALLOW` and an empty rules list, Istio's evaluation logic goes like this:

1. Are there any DENY policies that match? No (we didn't create any DENY policies)
2. Are there any ALLOW policies? Yes, there's one
3. Does the request match any ALLOW rule? No, there are no rules to match
4. Result: DENIED

Every request gets denied because there are no rules that could possibly match.

## Basic Allow-Nothing Policy

For a single workload:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-nothing
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-service
  action: ALLOW
  # No rules - nothing is allowed
```

Apply it:

```bash
kubectl apply -f allow-nothing.yaml
```

Verify it blocks everything:

```bash
kubectl exec -n my-app deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://my-service:8080/api/data
# Expected: 403
```

## Namespace-Wide Allow-Nothing

Block all traffic to every service in a namespace:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-nothing
  namespace: production
spec:
  action: ALLOW
  # No selector - applies to all workloads
  # No rules - nothing is allowed
```

This is the "lock down the whole namespace" approach. With no selector and no rules, no traffic can reach any service in the `production` namespace.

## Why Not Rules with Empty Lists?

You might wonder about this format:

```yaml
spec:
  action: ALLOW
  rules: []
```

This is equivalent to having no `rules` field at all. Both result in an allow-nothing policy. Istio treats an empty rules list the same as an absent rules list.

However, this is different from a policy with a single empty rule:

```yaml
spec:
  action: ALLOW
  rules:
    - {}
```

An empty rule `{}` matches everything. This is an allow-all policy, not allow-nothing. Be very careful about this distinction.

## Building Up from Allow-Nothing

The power of allow-nothing comes from how you build on top of it. Start with everything blocked, then add specific ALLOW policies for each legitimate traffic flow:

```yaml
# Step 1: Block everything
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-nothing
  namespace: my-app
spec:
  action: ALLOW
---
# Step 2: Allow specific traffic flows
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-to-api
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/my-app/sa/frontend"]
      to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/api/*"]
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-api-to-database
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: database
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/my-app/sa/api-service"]
```

The namespace-wide allow-nothing policy ensures that any traffic not explicitly allowed by a workload-specific policy is denied.

## How Multiple ALLOW Policies Interact

When you have an allow-nothing policy at the namespace level and workload-specific ALLOW policies, they work together like this:

For a request to `api-service`:
1. The namespace-wide allow-nothing policy matches (no rules, so it would deny)
2. The `allow-frontend-to-api` workload-specific policy also matches
3. Since the request matches the rules in the workload-specific policy, it's allowed

For a request to a service without its own ALLOW policy:
1. Only the namespace-wide allow-nothing policy applies
2. No rules match
3. Request is denied

This is the correct zero-trust pattern: explicit allow for known traffic, implicit deny for everything else.

## Practical Zero-Trust Rollout

Here's a step-by-step process for rolling out allow-nothing across a namespace:

### Phase 1: Audit Current Traffic

Before blocking anything, understand what traffic flows exist:

```bash
# Check current traffic patterns using Kiali or Prometheus
# Or use istioctl to analyze traffic
istioctl experimental describe pod -n my-app deploy/api-service
```

### Phase 2: Deploy Allow-Nothing in Dry-Run

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-nothing
  namespace: my-app
  annotations:
    "istio.io/dry-run": "true"
spec:
  action: ALLOW
```

Monitor what would be denied:

```bash
kubectl logs -n my-app deploy/api-service -c istio-proxy | grep "shadow_denied"
```

### Phase 3: Create Workload ALLOW Policies

Based on your traffic audit and dry-run results, create ALLOW policies for each legitimate flow:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: api-service-access
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/my-app/sa/frontend"]
    - from:
        - source:
            namespaces: ["istio-system"]
    - to:
        - operation:
            paths: ["/healthz", "/ready"]
```

### Phase 4: Enable Enforcement

Remove the dry-run annotation from the allow-nothing policy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-nothing
  namespace: my-app
spec:
  action: ALLOW
```

### Phase 5: Monitor and Adjust

Watch for 403 errors that indicate legitimate traffic being blocked:

```bash
kubectl logs -n my-app -l app=api-service -c istio-proxy | grep " 403 "
```

## Don't Forget Health Checks

A common mistake with allow-nothing policies is forgetting that Kubernetes health probes also get blocked. Add health check paths to every workload's ALLOW policy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-health-checks
  namespace: my-app
spec:
  action: ALLOW
  rules:
    - to:
        - operation:
            paths:
              - "/healthz"
              - "/ready"
              - "/livez"
```

This namespace-wide policy allows health checks on all workloads without needing to add health paths to every individual policy.

## Allow-Nothing vs Deny-All

Both achieve the same result (block all traffic), but they use different mechanisms:

**Allow-nothing:**
```yaml
spec:
  action: ALLOW
  # No rules
```

**Deny-all:**
```yaml
spec:
  action: DENY
  rules:
    - {}
```

The allow-nothing approach is preferred because:
- It naturally works with additional ALLOW policies (you just add more ALLOW rules)
- The deny-all approach blocks everything even if you add ALLOW policies (DENY wins over ALLOW)
- It's the pattern recommended in Istio's documentation

## Verifying the Policy

```bash
# Check that the policy exists
kubectl get authorizationpolicies -n my-app

# Verify it's blocking traffic
kubectl exec -n my-app deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://any-service:8080/
# Expected: 403

# Run Istio analysis
istioctl analyze -n my-app

# Check for RBAC denied logs
kubectl logs -n my-app deploy/any-service -c istio-proxy | grep "rbac"
```

## Common Pitfalls

1. **Confusing empty rules with empty rule.** `rules: []` (or no rules field) = allow nothing. `rules: [{}]` = allow everything. This is the most dangerous mistake.

2. **Forgetting the ingress gateway.** If traffic comes through the istio ingress gateway, your workload policies need to allow traffic from `istio-system` namespace.

3. **Health check failures.** Kubernetes probes get blocked too. Always include health check paths in your policies.

4. **Metrics endpoints.** Prometheus scraping `/metrics` will fail. Add an ALLOW rule for your monitoring namespace.

The allow-nothing policy is the foundation of zero-trust networking in Istio. It forces you to explicitly define every communication path, which is more work upfront but gives you complete visibility and control over your mesh's traffic patterns.
