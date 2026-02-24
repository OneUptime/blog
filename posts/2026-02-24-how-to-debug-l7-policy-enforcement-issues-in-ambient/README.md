# How to Debug L7 Policy Enforcement Issues in Ambient

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Authorization Policy, L7, Waypoint Proxy

Description: Troubleshooting guide for Layer 7 authorization policy enforcement issues in Istio ambient mode with waypoint proxies.

---

L7 policy enforcement in Istio ambient mode is handled by waypoint proxies, not ztunnel. If your authorization policies reference HTTP methods, paths, headers, or request principals (from JWTs), those rules only take effect when a waypoint proxy is deployed and traffic is flowing through it. When L7 policies are not behaving as expected, the problem is usually either that traffic is not reaching the waypoint or the waypoint does not have the right configuration.

## The L7 Policy Path in Ambient Mode

For L7 enforcement to work, the traffic path must be:

1. Source pod sends request
2. Source ztunnel intercepts and sees the destination has a waypoint
3. Source ztunnel forwards traffic to the waypoint proxy via HBONE
4. Waypoint proxy evaluates L7 authorization policies
5. If allowed, waypoint forwards to destination ztunnel
6. Destination ztunnel delivers to destination pod

If any of these steps is broken, L7 policies will not be enforced.

## Step 1: Verify a Waypoint Is Deployed

```bash
# Check for waypoint proxies in the namespace
kubectl get gateways -n my-app

# Verify the waypoint pod is running
kubectl get pods -n my-app -l gateway.networking.k8s.io/gateway-name=waypoint
```

If there is no waypoint, L7 policies simply are not enforced. Deploy one:

```bash
istioctl waypoint apply --namespace my-app --enroll-namespace
```

## Step 2: Verify the Namespace Uses the Waypoint

The namespace must be configured to use the waypoint:

```bash
kubectl get namespace my-app -o yaml | grep -A 5 "labels"
```

You should see:

```yaml
labels:
  istio.io/dataplane-mode: ambient
  istio.io/use-waypoint: waypoint
```

If the `istio.io/use-waypoint` label is missing, add it:

```bash
kubectl label namespace my-app istio.io/use-waypoint=waypoint
```

You can also set a waypoint at the service account level for more granular control:

```bash
kubectl label serviceaccount my-service-sa -n my-app \
  istio.io/use-waypoint=waypoint
```

## Step 3: Verify Traffic Flows Through the Waypoint

Enable access logging on the waypoint to confirm traffic is reaching it:

```bash
# Check waypoint logs
kubectl logs -n my-app deploy/waypoint -f
```

Make a test request:

```bash
kubectl exec -n my-app deploy/client -- curl -s http://backend:8080/api/test
```

If you see no log entries in the waypoint, traffic is bypassing it. Check the ztunnel on the source node to see if it knows about the waypoint:

```bash
NODE=$(kubectl get pod -n my-app -l app=client -o jsonpath='{.items[0].spec.nodeName}')
ZTUNNEL=$(kubectl get pods -n istio-system -l app=ztunnel \
  --field-selector spec.nodeName=$NODE -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n istio-system $ZTUNNEL -- \
  curl -s localhost:15000/config_dump | python3 -c "
import sys, json
data = json.load(sys.stdin)
for svc in data.get('services', {}).values():
    if 'waypoint' in json.dumps(svc):
        print(json.dumps(svc, indent=2))
"
```

## Step 4: Check the L7 Authorization Policy

Make sure your policy actually uses L7 fields and targets the right workload:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: restrict-api-access
  namespace: my-app
spec:
  targetRefs:
    - kind: Service
      group: ""
      name: backend
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/my-app/sa/client"
      to:
        - operation:
            methods: ["GET"]
            paths: ["/api/*"]
```

Note the use of `targetRefs` instead of `selector`. In ambient mode, policies that target services through the waypoint should use `targetRefs` to reference the Kubernetes Service directly:

```yaml
spec:
  targetRefs:
    - kind: Service
      group: ""
      name: backend
```

This is different from sidecar mode where you would use `selector.matchLabels`. Using the wrong targeting mechanism is a common source of issues.

## Step 5: Enable RBAC Debug Logging on the Waypoint

Turn on debug logging for the RBAC filter in the waypoint:

```bash
kubectl exec -n my-app deploy/waypoint -- \
  pilot-agent request POST '/logging?rbac=debug'
```

Make a request and check the logs:

```bash
kubectl logs -n my-app deploy/waypoint | grep -i "rbac\|enforced\|shadow"
```

You should see entries like:

```
rbac_log: enforced denied, matched policy ns[my-app]-policy[restrict-api-access]-rule[0]
```

or:

```
rbac_log: enforced allowed, matched policy ns[my-app]-policy[restrict-api-access]-rule[0]
```

If you see no RBAC log entries at all, the policy might not be loaded in the waypoint proxy.

## Step 6: Verify Policy Is in the Waypoint Config

Check what authorization configuration the waypoint has received:

```bash
kubectl exec -n my-app deploy/waypoint -- \
  pilot-agent request GET /config_dump | python3 -c "
import sys, json
data = json.load(sys.stdin)
for config in data.get('configs', []):
    config_str = json.dumps(config)
    if 'rbac' in config_str.lower() or 'authorization' in config_str.lower():
        print(json.dumps(config, indent=2)[:2000])
"
```

If the authorization policy is not in the config dump, check the proxy sync status:

```bash
istioctl proxy-status | grep waypoint
```

If the status shows NOT SENT or STALE, istiod has not pushed the configuration:

```bash
# Check istiod logs for push errors
kubectl logs -n istio-system deploy/istiod | grep -i "error\|push" | tail -20
```

## Common L7 Policy Issues

### Path Matching Gotchas

Paths in authorization policies are case-sensitive and must match exactly:

```yaml
# This matches /api/users but NOT /api/users/
to:
  - operation:
      paths: ["/api/users"]

# Use a prefix match for flexibility
to:
  - operation:
      paths: ["/api/users*"]
```

### Method Matching

Methods must be uppercase:

```yaml
# Correct
to:
  - operation:
      methods: ["GET", "POST"]

# Wrong (will never match)
to:
  - operation:
      methods: ["get", "post"]
```

### JWT Claims in L7 Policies

If your policy matches on JWT claims, you also need a RequestAuthentication resource:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: my-app
spec:
  targetRefs:
    - kind: Service
      group: ""
      name: backend
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: my-app
spec:
  targetRefs:
    - kind: Service
      group: ""
      name: backend
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals: ["https://auth.example.com/*"]
      when:
        - key: request.auth.claims[role]
          values: ["admin"]
```

Without the RequestAuthentication, the JWT is not validated and requestPrincipals will never match.

### Mixed L4 and L7 Policies

You can have both L4 policies (enforced by ztunnel) and L7 policies (enforced by the waypoint). They work together:

1. ztunnel checks L4 policies first
2. If allowed, traffic goes to the waypoint
3. Waypoint checks L7 policies

A connection can be allowed by ztunnel L4 policies but denied by waypoint L7 policies. This is normal and expected. The two layers are complementary.

## Testing L7 Policies Systematically

Create a test script that covers your expected allow/deny combinations:

```bash
# Test GET request (should be allowed)
kubectl exec -n my-app deploy/client -- \
  curl -s -o /dev/null -w "GET /api/users: %{http_code}\n" \
  http://backend:8080/api/users

# Test POST request (should be denied if only GET is allowed)
kubectl exec -n my-app deploy/client -- \
  curl -s -o /dev/null -w "POST /api/users: %{http_code}\n" \
  -X POST http://backend:8080/api/users

# Test from unauthorized service account
kubectl exec -n my-app deploy/other-service -- \
  curl -s -o /dev/null -w "Unauthorized GET: %{http_code}\n" \
  http://backend:8080/api/users
```

Expected responses: 200 for allowed, 403 for denied by authorization policy, and connection refused or timeout if L4 policy blocks it before reaching the waypoint.

L7 policy debugging in ambient mode requires checking the full chain from ztunnel to waypoint. Most issues come down to the waypoint not being deployed, the namespace not being enrolled, or the policy targeting mechanism being wrong. Once traffic is confirmed to flow through the waypoint, standard Envoy RBAC debugging techniques apply.
