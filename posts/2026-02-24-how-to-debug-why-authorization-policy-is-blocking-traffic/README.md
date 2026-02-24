# How to Debug Why Authorization Policy is Blocking Traffic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, Security, Debugging, Kubernetes

Description: How to diagnose and fix Istio AuthorizationPolicy issues that are unexpectedly blocking legitimate service traffic.

---

You deployed an AuthorizationPolicy and now legitimate traffic is getting blocked. Or you didn't deploy one, but traffic is still being denied. Authorization policies in Istio are powerful but the evaluation logic has some subtleties that can trip you up. This guide walks through debugging the most common scenarios.

## How Istio Authorization Works

Before debugging, you need to understand the evaluation order:

1. If no AuthorizationPolicy exists for a workload, all traffic is allowed (default allow)
2. If any DENY policy matches, the request is denied (regardless of ALLOW policies)
3. If an ALLOW policy exists but the request doesn't match any rule, it's denied
4. If an ALLOW policy exists and the request matches a rule, it's allowed

The third point is what catches most people. The moment you create an ALLOW policy for a workload, everything not explicitly allowed gets denied.

## Step 1: Identify What's Being Blocked

Check the response code and the Envoy response flags:

```bash
kubectl exec deploy/sleep -n production -c sleep -- \
  curl -v my-service.production:8080/api
```

A 403 Forbidden with the `RBAC: access denied` message is a clear sign of AuthorizationPolicy blocking:

```
< HTTP/1.1 403 Forbidden
< content-length: 19
< content-type: text/plain
< date: ...
<
RBAC: access denied
```

Check the sidecar access logs for more detail:

```bash
kubectl logs deploy/my-service -n production -c istio-proxy --tail=20
```

Look for `RBAC` in the response flags column.

## Step 2: List All Authorization Policies

Find every AuthorizationPolicy that could affect your workload:

```bash
# Namespace-level policies
kubectl get authorizationpolicy -n production

# Mesh-level policies (in root namespace)
kubectl get authorizationpolicy -n istio-system

# Check all namespaces
kubectl get authorizationpolicy --all-namespaces
```

A common mistake is having a mesh-wide DENY policy in `istio-system` that you forgot about. Check for those first.

## Step 3: Check Policy Selector

Each AuthorizationPolicy has an optional `selector` that determines which workloads it applies to. If the selector is empty, it applies to all workloads in the namespace:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-service  # Only applies to pods with this label
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/production/sa/frontend"]
```

Verify the selector matches your pod:

```bash
kubectl get pods -n production -l app=my-service
```

If the selector matches your pod AND the policy is ALLOW, then only traffic matching the rules will be permitted. All other traffic to that pod is denied.

## Step 4: Check the Source Principal

When using mTLS, the source principal is the SPIFFE identity of the calling service. It follows the format `cluster.local/ns/<namespace>/sa/<service-account>`.

Find the source principal:

```bash
# Check what service account the calling pod uses
kubectl get pod -n production -l app=frontend -o jsonpath='{.items[0].spec.serviceAccountName}'
```

If the service account is `frontend`, the principal is `cluster.local/ns/production/sa/frontend`.

A common mistake is using the wrong service account name in the policy:

```yaml
# WRONG - using pod name instead of service account
principals: ["cluster.local/ns/production/sa/frontend-pod-abc123"]

# CORRECT - using the service account name
principals: ["cluster.local/ns/production/sa/frontend"]
```

## Step 5: Enable RBAC Debug Logging

Turn on debug logging for the authorization engine to see exactly why a request was denied:

```bash
istioctl proxy-config log deploy/my-service -n production --level rbac:debug
```

Now send a request and check the logs:

```bash
kubectl logs deploy/my-service -n production -c istio-proxy --tail=30 | grep rbac
```

You'll see messages like:

```
enforced denied, matched policy none
```

or

```
enforced allowed, matched policy ns[production]-policy[allow-frontend]-rule[0]
```

This tells you exactly which policy and rule was evaluated.

Remember to reset the log level after debugging:

```bash
istioctl proxy-config log deploy/my-service -n production --level rbac:info
```

## Step 6: Common Mistake - Creating an ALLOW Policy Without Covering All Traffic

This is the number one cause of unexpected blocks. You create an ALLOW policy for one client but forget that all other clients are now denied:

```yaml
# This allows frontend to access my-service
# But it DENIES all other services from accessing my-service
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-service
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/production/sa/frontend"]
```

If `backend-service` also needs to call `my-service`, add another rule:

```yaml
rules:
  - from:
      - source:
          principals:
            - "cluster.local/ns/production/sa/frontend"
            - "cluster.local/ns/production/sa/backend"
```

Or use a namespace-wide source:

```yaml
rules:
  - from:
      - source:
          namespaces: ["production"]
```

## Step 7: Check for DENY Policies

DENY policies are evaluated before ALLOW policies. A matching DENY always wins:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-external
  namespace: production
spec:
  action: DENY
  rules:
    - from:
        - source:
            notNamespaces: ["production", "istio-system"]
```

This denies all traffic from outside the production and istio-system namespaces. Even if you have a matching ALLOW policy, the DENY takes precedence.

List all DENY policies:

```bash
kubectl get authorizationpolicy -n production -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for item in data['items']:
  action = item['spec'].get('action', 'ALLOW')
  if action == 'DENY':
    print(f\"DENY policy: {item['metadata']['name']}\")
"
```

## Step 8: Verify mTLS is Working

AuthorizationPolicies that use source principals require mTLS. If mTLS isn't working, the principal will be empty and the policy won't match:

```bash
# Check if mTLS is active between services
istioctl proxy-config clusters deploy/frontend -n production \
  --fqdn my-service.production.svc.cluster.local -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for c in data:
  ts = c.get('transportSocket', {})
  name = ts.get('name', 'plaintext')
  print(f'Transport: {name}')
"
```

If it shows `plaintext`, mTLS is not active and principal-based policies won't work.

## Step 9: Test with a Permissive Policy

To confirm the AuthorizationPolicy is the problem, temporarily create a permissive policy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-all-temp
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-service
  rules:
    - {}  # Allow everything
```

If traffic works with this policy, you know the issue is in your other policies. Remove this temporary policy and fix the real one.

```bash
kubectl delete authorizationpolicy allow-all-temp -n production
```

## Step 10: Check Custom Actions

If you're using CUSTOM action (external authorization), the external auth server might be rejecting requests:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ext-auth
  namespace: production
spec:
  action: CUSTOM
  provider:
    name: my-ext-authz
  rules:
    - {}
```

Check the external auth server logs to see why it's denying requests.

## Debugging Checklist

```bash
# 1. What policies exist?
kubectl get authorizationpolicy -n production -o wide
kubectl get authorizationpolicy -n istio-system -o wide

# 2. What action do they have?
kubectl get authorizationpolicy -n production -o jsonpath='{range .items[*]}{.metadata.name}: {.spec.action}{"\n"}{end}'

# 3. What does the RBAC debug log say?
istioctl proxy-config log deploy/my-service -n production --level rbac:debug

# 4. What's the source identity?
kubectl exec deploy/frontend -n production -c istio-proxy -- \
  pilot-agent request GET /certs | head -20

# 5. Is mTLS active?
istioctl proxy-config clusters deploy/frontend -n production --direction outbound | grep my-service
```

Authorization policy debugging comes down to understanding the evaluation logic: DENY always wins, ALLOW policies implicitly deny everything not matched, and no policies means allow all. Use RBAC debug logging to see exactly what's happening, and verify that mTLS is working if you're using principal-based rules.
