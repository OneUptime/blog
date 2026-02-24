# How to Create an Allow-All Policy in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, Allow All, Security, Kubernetes

Description: How to create an allow-all authorization policy in Istio for development environments, gradual rollouts, and temporary overrides with full examples.

---

An allow-all policy in Istio permits every request to reach a workload or namespace without any restrictions. This is the opposite of the allow-nothing and deny-all patterns. While it sounds counterintuitive to explicitly allow everything (since Istio allows all traffic by default when no policies exist), there are practical reasons to create an explicit allow-all policy.

## When You Need an Explicit Allow-All

By default, if no authorization policies exist for a workload, all traffic is allowed. So why create an explicit allow-all? Several situations:

1. **Overriding a namespace-level restriction.** If a namespace has an allow-nothing policy, you might want one specific service to remain open.
2. **Development environments.** Explicitly marking a namespace as "no restrictions" makes the intent clear.
3. **Gradual rollout.** When adding authorization to a mesh, you might start with allow-all on most services while locking down one at a time.
4. **Temporary debugging.** When troubleshooting, temporarily allowing all traffic to a service to rule out authorization as the cause.

## Basic Allow-All Policy

For a single workload:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-all
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-service
  action: ALLOW
  rules:
    - {}
```

The key is the single empty rule `{}`. An empty rule has no conditions, so it matches every request. Since the action is ALLOW, every request is permitted.

Apply it:

```bash
kubectl apply -f allow-all.yaml
```

## Namespace-Wide Allow-All

Open up an entire namespace:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-all
  namespace: development
spec:
  action: ALLOW
  rules:
    - {}
```

No selector means it applies to all workloads in the namespace. The empty rule matches everything.

## Understanding the Empty Rule

Let's be very clear about the syntax because this is where people make mistakes:

```yaml
# Allow-all: single empty rule that matches everything
rules:
  - {}

# Allow-nothing: no rules at all (or empty list)
rules: []
# or simply omit the rules field entirely
```

The difference between `[{}]` (one empty rule) and `[]` (zero rules) is the difference between allowing everything and blocking everything. Always double-check this when working with these policies.

## Override a Namespace Allow-Nothing

A common pattern is having an allow-nothing policy at the namespace level and then adding workload-specific policies. If you want one service to be open while the rest are locked down:

```yaml
# Namespace-level: block everything
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: default-deny
  namespace: my-app
spec:
  action: ALLOW
  # No rules = allow nothing
---
# Specific service: allow everything
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-all-to-public-api
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: public-api
  action: ALLOW
  rules:
    - {}
```

The namespace-level allow-nothing policy blocks everything by default. The workload-specific allow-all policy opens up the public-api service. Other services remain locked down.

This works because Istio evaluates ALLOW policies together - if ANY ALLOW policy matches, the request is permitted.

## Allow-All for Specific Sources

You might want to allow all traffic from a specific source rather than from everywhere:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-all-from-frontend
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: backend-api
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ["frontend"]
```

This allows all traffic from the `frontend` namespace to `backend-api`, regardless of method, path, or identity. It's an "allow-all from a specific source" pattern.

## Gradual Lockdown Strategy

Here's a practical rollout strategy for adding authorization to an existing mesh:

### Phase 1: Explicit Allow-All on Everything

Start by making the current "everything is allowed" state explicit:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-all
  namespace: production
spec:
  action: ALLOW
  rules:
    - {}
```

This doesn't change any behavior, but it makes the policy explicit and visible.

### Phase 2: Lock Down Services One at a Time

Remove the namespace-wide allow-all and replace it with an allow-nothing plus workload-specific policies:

```yaml
# Replace allow-all with allow-nothing
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: default-policy
  namespace: production
spec:
  action: ALLOW
  # No rules - allow nothing by default
---
# Keep specific services open temporarily
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-all-service-a
  namespace: production
spec:
  selector:
    matchLabels:
      app: service-a
  action: ALLOW
  rules:
    - {}
---
# Lock down service-b with specific rules
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: service-b-access
  namespace: production
spec:
  selector:
    matchLabels:
      app: service-b
  action: ALLOW
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/production/sa/service-a"]
```

Service-b has specific access rules. Service-a is still allow-all while you work on its policies. Over time, replace each allow-all with specific rules.

### Phase 3: Remove All Allow-All Policies

Once every service has its own policies, remove all allow-all overrides:

```bash
kubectl delete authorizationpolicy allow-all-service-a -n production
```

## Allow-All with DENY Override

Remember that DENY policies override ALLOW. You can have an allow-all base with DENY policies for specific blocks:

```yaml
# Allow everything by default
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-all
  namespace: my-app
spec:
  action: ALLOW
  rules:
    - {}
---
# But block specific patterns
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-sensitive
  namespace: my-app
spec:
  action: DENY
  rules:
    - to:
        - operation:
            paths: ["/admin/*", "/internal/*"]
    - from:
        - source:
            namespaces: ["untrusted"]
```

Everything is allowed except admin/internal paths and traffic from the untrusted namespace. This is a useful pattern when you want a mostly-open environment with specific blocks.

## Development Environment Setup

For development namespaces where you want minimal friction:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: dev-allow-all
  namespace: development
  labels:
    environment: development
    security: open
spec:
  action: ALLOW
  rules:
    - {}
```

Adding labels makes it easy to find and audit these policies:

```bash
# Find all allow-all policies across namespaces
kubectl get authorizationpolicies -A -l security=open
```

## Temporary Debugging

When you're troubleshooting whether an authorization policy is causing issues, temporarily apply an allow-all:

```bash
# Save current policies
kubectl get authorizationpolicies -n my-app -o yaml > backup-policies.yaml

# Apply allow-all
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: debug-allow-all
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: problematic-service
  action: ALLOW
  rules:
    - {}
EOF

# Test if the issue is authorization-related
kubectl exec -n my-app deploy/sleep -- curl -s http://problematic-service:8080/api/data

# Remove the debug policy when done
kubectl delete authorizationpolicy debug-allow-all -n my-app
```

## Verifying Allow-All

```bash
# Check that the policy exists
kubectl get authorizationpolicies -n my-app

# Test from various sources
kubectl exec -n my-app deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://my-service:8080/api/data
# Expected: 200

kubectl exec -n other-ns deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://my-service.my-app:8080/api/data
# Expected: 200

# Verify with istioctl
istioctl analyze -n my-app
```

## Security Considerations

Allow-all policies should be treated as temporary or development-only in most environments. In production:

- Document why the allow-all exists
- Set a reminder to replace it with specific policies
- Use labels to track allow-all policies across your cluster
- Include allow-all policies in your security audit checklist
- Consider using admission webhooks to prevent allow-all policies in production namespaces

An allow-all policy is a useful tool during development, gradual rollouts, and debugging. But the goal should always be to replace it with specific, targeted ALLOW policies that follow the principle of least privilege.
