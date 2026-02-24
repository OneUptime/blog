# How to Block Traffic from Specific Namespaces in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, AuthorizationPolicy, Namespaces, Kubernetes

Description: Block traffic from specific Kubernetes namespaces using Istio AuthorizationPolicy DENY rules for namespace-level isolation and security.

---

In a shared Kubernetes cluster, different teams typically get their own namespaces. But just because teams share a cluster does not mean every namespace should be able to talk to every service. You might have a development namespace that should never reach production services. Or a third-party namespace that should be isolated from your core infrastructure. Istio's AuthorizationPolicy makes it straightforward to block traffic from specific namespaces.

## When to Block by Namespace

Here are common scenarios:

- **Dev/staging isolation.** Prevent development workloads from accidentally calling production APIs.
- **Third-party workload isolation.** If you run third-party or vendor workloads in dedicated namespaces, restrict their access to your services.
- **Compliance requirements.** Some workloads handle sensitive data and should only accept traffic from approved namespaces.
- **Noisy neighbor protection.** A misbehaving namespace flooding your services with requests can be blocked while you investigate.

## Prerequisites

- Kubernetes cluster with Istio installed
- mTLS enabled (at least PERMISSIVE, preferably STRICT)
- Sidecar injection enabled on relevant namespaces

## Blocking a Single Namespace

Use a DENY AuthorizationPolicy to block traffic from a specific namespace:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: block-dev-namespace
  namespace: production
spec:
  action: DENY
  rules:
    - from:
        - source:
            namespaces: ["development"]
```

This blocks all traffic from the `development` namespace to any service in the `production` namespace. Apply it:

```bash
kubectl apply -f block-dev-namespace.yaml
```

## Blocking Multiple Namespaces

You can list multiple namespaces:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: block-non-prod-namespaces
  namespace: production
spec:
  action: DENY
  rules:
    - from:
        - source:
            namespaces: ["development", "staging", "testing", "sandbox"]
```

All four namespaces are blocked from reaching production services. The namespaces list uses OR logic, so traffic from any of these namespaces is denied.

## Blocking at the Service Level

Instead of applying the policy to the entire namespace, target specific services:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: block-dev-from-payments
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  action: DENY
  rules:
    - from:
        - source:
            namespaces: ["development"]
```

Only the `payment-service` in the `production` namespace is affected. Other production services can still receive traffic from the `development` namespace.

## Allow-List Approach (Block Everything Except)

Sometimes it is easier to allow specific namespaces and block everything else. Use an ALLOW policy for this:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-only-approved-namespaces
  namespace: production
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ["production", "monitoring", "istio-system"]
```

With this, only traffic from `production`, `monitoring`, and `istio-system` namespaces is allowed. Everything else is implicitly denied. This is a more secure approach because new namespaces are blocked by default.

## Combining ALLOW and DENY

Istio evaluates policies in a specific order:

1. If any DENY policy matches, the request is denied
2. If there are no ALLOW policies, the request is allowed
3. If any ALLOW policy matches, the request is allowed
4. The request is denied

You can use this to create nuanced rules. For example, allow production namespaces but explicitly deny a specific compromised namespace:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-compromised
  namespace: production
spec:
  action: DENY
  rules:
    - from:
        - source:
            namespaces: ["compromised-namespace"]
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-production
  namespace: production
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ["production", "monitoring"]
```

The DENY rule for `compromised-namespace` takes effect first. Then the ALLOW rule permits `production` and `monitoring`. Everything else is denied by the implicit deny from the ALLOW policy.

## Blocking with Path-Specific Rules

You can be selective about what you block. Maybe the dev namespace should be able to call health check endpoints but nothing else:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: block-dev-except-health
  namespace: production
spec:
  action: DENY
  rules:
    - from:
        - source:
            namespaces: ["development"]
      to:
        - operation:
            notPaths: ["/health", "/healthz", "/ready"]
```

This denies requests from the `development` namespace to any path except health check endpoints. The `notPaths` field excludes those paths from the deny rule.

## Verifying the Block

Test that traffic is properly blocked:

```bash
# From the development namespace (should be blocked)
kubectl exec deploy/test-client -n development -c test-client -- curl -s -o /dev/null -w "%{http_code}" http://payment-service.production.svc.cluster.local/api/charge
# Expected: 403

# From the production namespace (should work)
kubectl exec deploy/test-client -n production -c test-client -- curl -s -o /dev/null -w "%{http_code}" http://payment-service.production.svc.cluster.local/api/charge
# Expected: 200
```

Check the Envoy access logs for the denied request:

```bash
kubectl logs deploy/payment-service -n production -c istio-proxy --tail=20 | grep "403"
```

You should see entries with `response_code=403` and `response_flags` containing `UAEX` (upstream authorization denied).

## Debugging Authorization Issues

If traffic is being blocked when it should not be, or allowed when it should not be:

```bash
# Check what policies apply to a workload
kubectl get authorizationpolicies -n production

# Analyze the configuration
istioctl analyze -n production

# Check the RBAC filter config on the proxy
istioctl proxy-config listener deploy/payment-service -n production -o json | grep -A 20 "rbac"
```

You can also enable debug logging on the proxy:

```bash
istioctl proxy-config log deploy/payment-service -n production --level rbac:debug
```

Then watch the logs for detailed RBAC decision information:

```bash
kubectl logs deploy/payment-service -n production -c istio-proxy -f | grep "rbac"
```

## Handling Edge Cases

**Namespaces without sidecars.** If a namespace does not have Istio sidecar injection, pods in that namespace send plaintext traffic. If your target namespace has STRICT mTLS, this traffic is rejected at the transport level before the AuthorizationPolicy is even evaluated. If mTLS is PERMISSIVE, the traffic arrives without a source identity, and the namespace field in the policy will not match it.

**Istio system namespaces.** Be careful not to block `istio-system` or `kube-system` unless you know what you are doing. The Istio control plane and Kubernetes components need to communicate with your workloads.

**Ingress gateway traffic.** Traffic coming through the ingress gateway has the namespace of the gateway (typically `istio-system`). If you block `istio-system`, you will also block all incoming external traffic through the gateway.

**Policy propagation delay.** After applying a policy, it takes a few seconds for Istiod to push the updated configuration to all sidecars. During this window, you might see inconsistent behavior.

## Audit Trail

Keep track of who blocked what and when. Use Kubernetes annotations on your policies:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: block-dev-namespace
  namespace: production
  annotations:
    policy.istio.io/reason: "Prevent dev workloads from reaching production"
    policy.istio.io/approved-by: "security-team"
    policy.istio.io/date: "2026-02-24"
spec:
  action: DENY
  rules:
    - from:
        - source:
            namespaces: ["development"]
```

## Summary

Blocking traffic from specific namespaces in Istio is a fundamental security control for shared clusters. Use DENY policies to block known-bad namespaces, or ALLOW policies to create an allowlist of approved namespaces. The selector field lets you scope these policies to specific services rather than entire namespaces. Combine with STRICT mTLS for the strongest isolation, and always test from the blocked namespace to verify your policies are working.
