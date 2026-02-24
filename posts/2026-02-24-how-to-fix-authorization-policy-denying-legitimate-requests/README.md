# How to Fix Authorization Policy Denying Legitimate Requests

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, Security, Kubernetes, Troubleshooting

Description: Troubleshooting guide for Istio AuthorizationPolicy issues where valid requests are being denied unexpectedly.

---

You've set up an AuthorizationPolicy in Istio and suddenly legitimate traffic is getting blocked. Maybe your frontend can't reach the backend, or health checks are failing. Authorization policies are powerful but they can bite you if you don't understand how Istio evaluates them.

## How Istio Authorization Works

Before jumping into fixes, you need to understand the evaluation order. Istio evaluates authorization policies in this order:

1. If any CUSTOM policy matches, delegate to the external authorizer
2. If any DENY policy matches, deny the request
3. If there are no ALLOW policies for the workload, allow the request
4. If any ALLOW policy matches, allow the request
5. Deny the request

That last point is critical. The moment you create any ALLOW policy for a workload, all requests that don't match an ALLOW rule get denied. This is the most common source of problems.

## The "Allow One Thing, Break Everything Else" Problem

Here's the classic scenario. You create an ALLOW policy to permit traffic from one specific source:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend
  namespace: backend
spec:
  selector:
    matchLabels:
      app: backend-api
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/frontend/sa/frontend-sa"]
```

Now everything except the frontend is blocked. Health checks from kubelet fail. Prometheus can't scrape metrics. Other services that also need access are denied.

The fix is to add rules for everything else that needs access:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-backend-access
  namespace: backend
spec:
  selector:
    matchLabels:
      app: backend-api
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/frontend/sa/frontend-sa"]
  - from:
    - source:
        principals: ["cluster.local/ns/monitoring/sa/prometheus-sa"]
  - to:
    - operation:
        ports: ["15021"]
```

The last rule allows health check traffic on the Istio health port.

## Principal Names Are Wrong

When using source principals in your policy, the format must be exact. The principal comes from the mTLS certificate and follows this pattern:

```
cluster.local/ns/<namespace>/sa/<service-account>
```

If mTLS is not enabled between the services, the principal will be empty and the policy won't match. Verify mTLS status:

```bash
istioctl proxy-config endpoints <pod-name> -n my-namespace | grep my-service
```

Check which service account your source pod is using:

```bash
kubectl get pod <pod-name> -n frontend -o jsonpath='{.spec.serviceAccountName}'
```

Then make sure that service account matches what's in your AuthorizationPolicy.

## Namespace-Level vs Workload-Level Policies

If you create a policy without a `selector`, it applies to all workloads in the namespace:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: my-namespace
spec:
  {}
```

This empty policy with no rules denies everything in the namespace. It's equivalent to a default-deny policy. If someone applied this and you didn't know about it, all traffic gets blocked.

Check all authorization policies in the namespace:

```bash
kubectl get authorizationpolicy -n my-namespace
```

Also check for mesh-wide policies in the root namespace (usually `istio-system`):

```bash
kubectl get authorizationpolicy -n istio-system
```

## IP-Based Rules Not Matching

If you're using IP-based rules, remember that with mTLS enabled, the source IP seen by the sidecar is 127.0.0.1 (because traffic comes through the local proxy). The `ipBlocks` field in ALLOW/DENY rules refers to the original source IP, but there are cases where Istio can't determine it correctly.

```yaml
rules:
- from:
  - source:
      ipBlocks: ["10.0.0.0/8"]
```

If this isn't matching, use `remoteIpBlocks` instead, which uses the X-Forwarded-For header:

```yaml
rules:
- from:
  - source:
      remoteIpBlocks: ["10.0.0.0/8"]
```

Or better yet, use principals or namespaces instead of IPs when possible.

## Check the RBAC Debug Logs

You can enable debug logging on the Envoy proxy to see exactly why requests are being denied:

```bash
istioctl proxy-config log <pod-name> -n my-namespace --level rbac:debug
```

Then send a request and check the logs:

```bash
kubectl logs <pod-name> -c istio-proxy -n my-namespace | grep rbac
```

You'll see messages like:

```
enforced denied, matched policy none
```

or

```
enforced allowed, matched policy ns[my-namespace]-policy[allow-frontend]-rule[0]
```

This tells you exactly which policy matched or if no policy matched.

## Request Headers and Methods Don't Match

If your policy restricts by HTTP method or path, make sure the values match exactly:

```yaml
rules:
- to:
  - operation:
      methods: ["GET"]
      paths: ["/api/v1/*"]
```

The path matching uses glob patterns. `/api/v1/*` matches `/api/v1/users` but not `/api/v1/users/123`. For deeper paths, use `/api/v1/**` or be more explicit:

```yaml
rules:
- to:
  - operation:
      methods: ["GET", "POST"]
      paths: ["/api/*"]
```

Also note that path matching is case-sensitive.

## DENY Policies Take Precedence

If you have both ALLOW and DENY policies, DENY always wins. A common mistake is having a broad DENY policy that overrides a specific ALLOW:

```yaml
# This DENY will block the request even if an ALLOW matches
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-external
  namespace: my-namespace
spec:
  action: DENY
  rules:
  - from:
    - source:
        notNamespaces: ["frontend", "monitoring"]
```

Check for DENY policies:

```bash
kubectl get authorizationpolicy -n my-namespace -o json | jq '.items[] | select(.spec.action == "DENY") | .metadata.name'
```

## Sidecar Not Injected

Authorization policies are enforced by the Envoy sidecar. If the destination pod doesn't have a sidecar, authorization policies have no effect. Conversely, if you expect the source identity to be verified via mTLS but the source pod doesn't have a sidecar, the identity won't be present.

Check both sides:

```bash
kubectl get pod <source-pod> -n source-ns -o jsonpath='{.spec.containers[*].name}'
kubectl get pod <dest-pod> -n dest-ns -o jsonpath='{.spec.containers[*].name}'
```

Both should show `istio-proxy` in the container list.

## Using istioctl analyze

Always run the analyzer as a sanity check:

```bash
istioctl analyze -n my-namespace
```

It catches issues like referencing service accounts that don't exist or policies that conflict with each other.

## Quick Debugging Steps

When you're stuck, here's a fast sequence to narrow down the problem:

1. Check all policies: `kubectl get authorizationpolicy -A`
2. Temporarily delete the suspicious policy and see if traffic flows
3. Enable RBAC debug logs on the target pod
4. Send a test request and check what the logs say
5. Verify mTLS is active between the source and target
6. Make sure the selector labels in the policy match the target workload

Most of the time, the issue is either a missing ALLOW rule (because creating any ALLOW policy triggers default-deny for unmatched requests) or a mismatch in principal names.
