# How to Create a Deny-All Policy in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, Deny All, Security, Kubernetes

Description: How to create a deny-all authorization policy in Istio that blocks all traffic to a workload or namespace, and when to use it versus allow-nothing.

---

A deny-all policy in Istio blocks every request to a workload or namespace, no exceptions. It uses `action: DENY` with a rule that matches everything. This is the nuclear option for access control - once applied, nothing gets through, not even traffic that matches ALLOW policies.

Understanding when and how to use deny-all policies (and how they differ from allow-nothing policies) is important for managing your mesh's security posture.

## The Deny-All Policy

Here's the simplest deny-all policy for a single workload:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-service
  action: DENY
  rules:
    - {}
```

The empty rule `{}` matches every request. Since the action is DENY, every request is blocked with a 403 response.

Apply it:

```bash
kubectl apply -f deny-all.yaml
```

Test it:

```bash
kubectl exec -n my-app deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://my-service:8080/anything
# Returns: 403
```

## Namespace-Wide Deny-All

Block all traffic to every service in a namespace:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: sensitive-namespace
spec:
  action: DENY
  rules:
    - {}
```

No selector means it applies to all workloads. The empty rule means it matches all traffic. Everything in `sensitive-namespace` is unreachable.

## Deny-All vs Allow-Nothing

Both block all traffic, but they behave very differently when you add other policies:

**Allow-nothing (ALLOW with no rules):**
```yaml
spec:
  action: ALLOW
  # No rules
```
- Blocks everything because nothing matches
- Additional ALLOW policies CAN override it
- The recommended pattern for building up from zero-trust

**Deny-all (DENY with match-all rule):**
```yaml
spec:
  action: DENY
  rules:
    - {}
```
- Blocks everything because the DENY matches all
- Additional ALLOW policies CANNOT override it
- DENY always wins over ALLOW in Istio's evaluation order

This difference is critical. If you use deny-all and then add an ALLOW policy, traffic is still blocked. DENY policies are evaluated before ALLOW policies and take precedence.

## When to Use Deny-All

Deny-all is appropriate in specific scenarios:

### Decommissioning a Service

When you're shutting down a service and want to ensure nothing talks to it during the transition:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: decommission-legacy-api
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: legacy-api
  action: DENY
  rules:
    - {}
```

This is stronger than just removing the service because it prevents any accidental routing through old configurations.

### Emergency Isolation

During a security incident, you might need to completely isolate a compromised namespace:

```bash
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: emergency-isolation
  namespace: compromised-namespace
spec:
  action: DENY
  rules:
    - {}
EOF
```

This takes effect within seconds and blocks all traffic, including traffic from ALLOW policies.

### Maintenance Windows

Temporarily block traffic during maintenance:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: maintenance-mode
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-service
  action: DENY
  rules:
    - {}
```

Remove it when maintenance is done:

```bash
kubectl delete authorizationpolicy maintenance-mode -n my-app
```

### Protecting Unused Namespaces

If you have namespaces that shouldn't have any traffic (reserved for future use, template namespaces):

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: reserved-ns
spec:
  action: DENY
  rules:
    - {}
```

## Deny-All with Selective Exceptions

Since DENY always overrides ALLOW, how do you create exceptions? You can't use ALLOW policies. Instead, you need to make the DENY rule more specific so it doesn't match the traffic you want to allow:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-most
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-service
  action: DENY
  rules:
    # Deny everything except health checks
    - to:
        - operation:
            notPaths: ["/healthz", "/ready"]
```

This denies all traffic except requests to `/healthz` and `/ready`. But this is getting complicated - and it's exactly why the allow-nothing pattern is preferred for most use cases.

## Impact on Health Checks

A deny-all policy blocks Kubernetes health probes. Your pods will fail their liveness and readiness checks:

```bash
# Pods start restarting because health probes fail
kubectl get pods -n my-app -l app=my-service
# NAME                          READY   STATUS    RESTARTS   AGE
# my-service-5d4f6b7c8-abcde   1/2     Running   3          5m
```

If you need health checks to work with a deny-all policy, either:

1. Use the allow-nothing pattern instead (which lets you add ALLOW policies for health checks)
2. Make the DENY rule exclude health paths:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all-except-health
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-service
  action: DENY
  rules:
    - to:
        - operation:
            notPaths: ["/healthz", "/ready", "/livez"]
```

## Testing the Policy

```bash
# Verify everything is blocked
kubectl exec -n my-app deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://my-service:8080/api/data
# Expected: 403

kubectl exec -n my-app deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" -X POST http://my-service:8080/api/data
# Expected: 403

# Verify ALLOW policies don't override it
# Even after adding an ALLOW policy, traffic is still blocked
```

## Verifying DENY Takes Precedence

To prove that DENY overrides ALLOW:

```bash
# Apply deny-all
kubectl apply -f deny-all.yaml

# Apply an ALLOW policy
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-everything
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-service
  action: ALLOW
  rules:
    - {}
EOF

# Test - should still be 403 because DENY wins
kubectl exec -n my-app deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://my-service:8080/api/data
# Expected: 403 (DENY takes precedence)
```

## Removing a Deny-All Policy

```bash
# Remove the policy
kubectl delete authorizationpolicy deny-all -n my-app

# Verify traffic flows again
kubectl exec -n my-app deploy/sleep -- curl -s -o /dev/null -w "%{http_code}" http://my-service:8080/api/data
# Expected: 200 (or whatever your other policies allow)
```

Policy removal takes effect within seconds as Envoy picks up the configuration change.

## Mesh-Wide Deny-All

Applying a deny-all in the root namespace affects the entire mesh:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: mesh-deny-all
  namespace: istio-system
spec:
  action: DENY
  rules:
    - {}
```

This is extremely dangerous and will block all traffic across every namespace. Only use this in emergency situations and remove it as soon as possible. It even blocks traffic to the ingress gateway, which means your external traffic stops too.

## Summary of When to Use Each Pattern

| Scenario | Use This |
|----------|----------|
| Building zero-trust from scratch | Allow-nothing |
| Decommissioning a service | Deny-all |
| Emergency isolation | Deny-all |
| Maintenance windows | Deny-all |
| Daily access control | Allow-nothing + ALLOW policies |
| Protecting unused namespaces | Deny-all |

The deny-all policy is a blunt instrument. Use it for absolute blocks where you don't want any exceptions to be possible. For building up a proper access control system, start with allow-nothing instead and add specific ALLOW policies for each legitimate traffic flow.
