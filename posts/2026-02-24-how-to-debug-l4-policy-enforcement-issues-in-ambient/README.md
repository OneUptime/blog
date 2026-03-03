# How to Debug L4 Policy Enforcement Issues in Ambient

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Authorization Policy, L4, Debugging

Description: How to troubleshoot Layer 4 authorization policy enforcement issues in Istio ambient mode with ztunnel.

---

In Istio ambient mode, L4 authorization policies are enforced by the ztunnel proxy at the node level. These policies control which workloads can establish TCP connections to other workloads, based on identity, namespace, and port. When L4 policies are not working as expected, connections either get blocked when they should not be or allowed when they should be denied. Debugging this requires understanding how ztunnel processes authorization decisions.

## How L4 Policy Enforcement Works in Ambient

When a pod on a node tries to connect to another pod, the traffic hits the local ztunnel. The ztunnel performs these steps:

1. Identifies the source workload based on the source IP and pod identity
2. Identifies the destination workload
3. Checks if the destination has a waypoint proxy (if yes, redirects there for L7 enforcement)
4. For L4-only enforcement, checks AuthorizationPolicy resources that match the destination
5. Makes an allow/deny decision

L4 policies can match on source identity (namespace, service account, principal) and destination port. They cannot match on HTTP attributes like path or method, because those are L7 concerns handled by waypoint proxies.

## Verifying Policies Are Loaded in ztunnel

First, check that ztunnel has actually received the authorization policies from istiod:

```bash
# Find the ztunnel pod on the relevant node
NODE_NAME=$(kubectl get pod -n my-app my-pod -o jsonpath='{.spec.nodeName}')
ZTUNNEL=$(kubectl get pods -n istio-system -l app=ztunnel \
  --field-selector spec.nodeName=$NODE_NAME -o jsonpath='{.items[0].metadata.name}')

# Dump ztunnel configuration and look for policies
kubectl exec -n istio-system $ZTUNNEL -- \
  curl -s localhost:15000/config_dump | python3 -c "
import sys, json
data = json.load(sys.stdin)
policies = data.get('policies', {})
for name, policy in policies.items():
    print(f'Policy: {name}')
    print(json.dumps(policy, indent=2))
    print()
"
```

If your policy is not in the output, it either has not synced yet or there is a configuration issue. Check istiod:

```bash
# Verify the policy exists in Kubernetes
kubectl get authorizationpolicies -n my-app -o yaml

# Check istiod push status
istioctl proxy-status
```

## Writing Correct L4 Authorization Policies

A common mistake is writing a policy with L7 fields and expecting it to work at L4. In ambient mode without a waypoint proxy, only L4 fields are enforced by ztunnel.

This policy works at L4:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-from-frontend
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: backend
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/my-app/sa/frontend"
      to:
        - operation:
            ports: ["8080"]
```

This policy will NOT work at L4 (it needs a waypoint proxy for L7 enforcement):

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-get-only
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: backend
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/my-app/sa/frontend"
      to:
        - operation:
            methods: ["GET"]
            paths: ["/api/*"]
```

If you apply the second policy without a waypoint proxy, ztunnel will see the L7 fields and effectively ignore them for enforcement, which can lead to unexpected behavior. The connection might be allowed when you expected it to be restricted to GET requests only.

## Debugging Connection Denials

When a connection is unexpectedly denied, enable debug logging on ztunnel:

```bash
kubectl exec -n istio-system $ZTUNNEL -- \
  curl -X POST "localhost:15000/logging?ztunnel::proxy::inbound=debug"
```

Then attempt the connection and check the logs:

```bash
kubectl logs -n istio-system $ZTUNNEL | grep -i "rbac\|denied\|policy"
```

You should see messages like:

```text
WARN ztunnel::proxy::inbound: RBAC: access denied, policy=ns[my-app]-policy[deny-all]-rule[0], source=10.244.1.5, destination=10.244.2.3:8080
```

This tells you exactly which policy caused the denial.

## Debugging Unexpected Allows

When connections are allowed but should be denied, the issue is usually one of these:

**No deny-all baseline**: Without a deny-all policy, everything is allowed by default:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: my-app
spec:
  {}
```

This empty spec with no rules creates a deny-all policy for the namespace.

**Wrong selector**: The policy might not be selecting the right workload:

```bash
# Check which pods match the selector
kubectl get pods -n my-app -l app=backend
```

If no pods match, the policy has no effect.

**Wrong principal format**: The source principal must match exactly. Check what principal the source workload uses:

```bash
# Get the service account of the source pod
kubectl get pod -n my-app frontend-xxx -o jsonpath='{.spec.serviceAccountName}'
```

The principal format is `cluster.local/ns/<namespace>/sa/<service-account>`. A mismatch will silently fail to match.

## Verifying Source Identity

ztunnel identifies source workloads by their mTLS identity. Verify the identity is correct:

```bash
# Check the certificate details for a workload
kubectl exec -n istio-system $ZTUNNEL -- \
  curl -s localhost:15000/certs
```

Look for the SPIFFE ID in the certificate, which should be:

```text
spiffe://cluster.local/ns/my-app/sa/frontend
```

If the SPIFFE ID does not match what your policy expects, the source will not match the rule.

## Testing Policy Enforcement

Create a systematic test to verify L4 policies:

```bash
# Deploy a test client in the same namespace
kubectl run test-client -n my-app --image=curlimages/curl:latest \
  --overrides='{"spec":{"serviceAccountName":"test-sa"}}' \
  --command -- sleep 3600

# Test connection (should be denied if not in allow list)
kubectl exec -n my-app test-client -- \
  curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 \
  http://backend:8080/

# Test with the correct service account
kubectl run allowed-client -n my-app --image=curlimages/curl:latest \
  --overrides='{"spec":{"serviceAccountName":"frontend"}}' \
  --command -- sleep 3600

kubectl exec -n my-app allowed-client -- \
  curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 \
  http://backend:8080/
```

## Common Pitfalls

### Namespace vs Mesh-Wide Policies

A policy in `istio-system` namespace applies mesh-wide. A policy in a workload namespace applies only to that namespace:

```yaml
# This applies to ALL workloads in the mesh
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: mesh-deny-all
  namespace: istio-system
spec:
  {}
```

If you have a mesh-wide deny-all and a namespace-level allow, the allow policy takes precedence for matching requests. But make sure both policies are loaded in ztunnel.

### ALLOW vs DENY Policy Interaction

When you have both ALLOW and DENY policies, the evaluation order is:

1. If any DENY policy matches, deny the request
2. If no ALLOW policies exist, allow the request
3. If ALLOW policies exist but none match, deny the request
4. If an ALLOW policy matches, allow the request

This can be confusing. A common pattern is:

```yaml
# Deny traffic from outside the namespace
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-external
  namespace: my-app
spec:
  action: DENY
  rules:
    - from:
        - source:
            notNamespaces:
              - my-app
              - istio-system
---
# Allow specific internal traffic
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-internal
  namespace: my-app
spec:
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces:
              - my-app
```

### Port Mismatch

Make sure the port in your policy matches the actual container port, not the service port:

```bash
# Check the actual port the pod is listening on
kubectl get pod -n my-app backend-xxx -o jsonpath='{.spec.containers[*].ports}'
```

If your service maps port 80 to container port 8080, the authorization policy should reference port 8080.

## Checking ztunnel Metrics

ztunnel exposes metrics that show policy enforcement activity:

```bash
kubectl exec -n istio-system $ZTUNNEL -- \
  curl -s localhost:15020/metrics | grep -E "ztunnel_connections|ztunnel_denied"
```

Rising denial counts indicate that policies are actively blocking traffic. Compare these metrics with your expected behavior to identify misconfigurations.

Debugging L4 policies in ambient mode comes down to verifying that policies are loaded in ztunnel, checking that selectors and principals match correctly, and using debug logging to see exactly which policy is making each decision.
