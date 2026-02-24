# How to Debug L4 vs L7 Policy Issues in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mesh, Debugging, Authorization Policies, Kubernetes

Description: A hands-on guide to debugging L4 and L7 policy issues in Istio ambient mode, covering ztunnel and waypoint proxy troubleshooting techniques.

---

One of the trickiest parts of running Istio in ambient mode is understanding where your policies get enforced. In the sidecar model, everything happened in one place. In ambient mode, L4 policies run in ztunnel and L7 policies run in waypoint proxies. When something breaks, you need to figure out which layer is causing the problem.

This matters because a misconfigured setup might silently skip your L7 policies if no waypoint proxy exists. Or you might have conflicting L4 and L7 rules that produce confusing behavior. Knowing how to trace the problem through both layers will save you hours of frustration.

## Understanding Policy Enforcement Layers

Before jumping into debugging, here's the split:

**ztunnel (L4) handles:**
- Source and destination identity matching (SPIFFE IDs)
- Port-level access control
- Namespace-level access control
- DENY policies with L4 fields only

**Waypoint proxy (L7) handles:**
- HTTP method matching
- Path-based routing and authorization
- Header matching
- Request authentication (JWT)
- ALLOW policies with L7 fields

An AuthorizationPolicy is classified as L4 or L7 based on the fields it uses. If it only references principals, namespaces, and ports, it's L4. If it references methods, paths, or headers, it's L7.

## Step 1: Identify What Layer Your Policy Targets

Check your policy to determine if it's L4 or L7:

```yaml
# This is L4 - only uses namespace and port
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend
  namespace: backend
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["frontend"]
    to:
    - operation:
        ports: ["8080"]
```

```yaml
# This is L7 - uses paths and methods
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-get-only
  namespace: backend
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["frontend"]
    to:
    - operation:
        methods: ["GET"]
        paths: ["/api/*"]
```

The second policy requires a waypoint proxy. If you don't have one, the policy won't be enforced.

## Step 2: Check If a Waypoint Proxy Exists

```bash
kubectl get gateway -n backend
```

If you see no gateway with `gatewayClassName: istio-waypoint`, your L7 policies are not being enforced. Deploy one:

```bash
istioctl waypoint apply --namespace backend --enroll-namespace
```

Verify it's running:

```bash
kubectl get pods -n backend -l gateway.networking.k8s.io/gateway-name=waypoint
```

## Step 3: Check What Policies Are Loaded Where

Use `istioctl` to inspect what each component has loaded.

For ztunnel:

```bash
istioctl ztunnel-config authorization
```

This shows all L4 policies that ztunnel is aware of. If your policy isn't listed here, either it's an L7 policy (which is correct) or there's a configuration issue.

For the waypoint proxy:

```bash
WAYPOINT_POD=$(kubectl get pods -n backend -l gateway.networking.k8s.io/gateway-name=waypoint -o jsonpath='{.items[0].metadata.name}')
istioctl proxy-config listener $WAYPOINT_POD -n backend
istioctl proxy-config route $WAYPOINT_POD -n backend
```

You can also check the Envoy config directly:

```bash
kubectl exec -n backend $WAYPOINT_POD -c istio-proxy -- curl -s localhost:15000/config_dump | python3 -m json.tool | grep -A 20 "rbac"
```

## Step 4: Test Connectivity at Each Layer

When a request gets denied, figure out which layer is blocking it. Start by testing basic L4 connectivity:

```bash
# Deploy a test pod in the source namespace
kubectl run test-client -n frontend --image=curlimages/curl --rm -it -- sh

# Test TCP connectivity (L4)
nc -zv backend-svc.backend.svc.cluster.local 8080
```

If TCP connection fails, the problem is at L4 (ztunnel). If TCP connects but the HTTP request gets a 403, the problem is at L7 (waypoint).

```bash
# Test HTTP (L7)
curl -v http://backend-svc.backend.svc.cluster.local:8080/api/data
```

## Step 5: Read the Logs

ztunnel logs will show L4 denials:

```bash
kubectl logs -n istio-system -l app=ztunnel --tail=100 | grep -i "denied\|rbac"
```

Waypoint proxy logs will show L7 denials:

```bash
kubectl logs -n backend -l gateway.networking.k8s.io/gateway-name=waypoint -c istio-proxy --tail=100 | grep -i "rbac\|403"
```

Enable debug logging for more detail:

```bash
# For ztunnel
ZTUNNEL_POD=$(kubectl get pods -n istio-system -l app=ztunnel -o jsonpath='{.items[0].metadata.name}')
istioctl ztunnel-config log $ZTUNNEL_POD --level debug

# For waypoint
istioctl proxy-config log $WAYPOINT_POD -n backend --level rbac:debug
```

## Common Issue: Mixed L4/L7 in One Policy

A single AuthorizationPolicy that contains both L4 and L7 fields gets treated as L7. This is a common source of confusion.

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: mixed-policy
  namespace: backend
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["frontend"]  # L4 field
    to:
    - operation:
        methods: ["GET"]          # L7 field
        ports: ["8080"]           # L4 field
```

This entire policy goes to the waypoint proxy. If you don't have a waypoint, the namespace restriction won't be enforced at all. The fix is to either deploy a waypoint or split this into separate L4 and L7 policies:

```yaml
# L4 policy - enforced by ztunnel
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: l4-allow-frontend
  namespace: backend
spec:
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["frontend"]
    to:
    - operation:
        ports: ["8080"]
---
# L7 policy - enforced by waypoint
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: l7-get-only
  namespace: backend
spec:
  action: ALLOW
  rules:
  - to:
    - operation:
        methods: ["GET"]
```

## Common Issue: DENY at L4 Overrides ALLOW at L7

DENY policies always take precedence. If ztunnel denies a connection at L4, the request never reaches the waypoint proxy. This means your L7 ALLOW policy can't override it.

If you see connections being refused at the TCP level, check for DENY policies in ztunnel:

```bash
istioctl ztunnel-config authorization | grep DENY
```

## Common Issue: Missing targetRef

In ambient mode, you can scope policies using `targetRef`. If your policy targets a specific waypoint but the waypoint name doesn't match, the policy won't apply:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: scoped-policy
  namespace: backend
spec:
  targetRef:
    kind: Gateway
    group: gateway.networking.k8s.io
    name: waypoint
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces: ["frontend"]
```

Make sure the `name` field in `targetRef` matches your actual Gateway name.

## Systematic Debugging Checklist

When a request gets denied and you're not sure why:

1. Check if the namespace is enrolled in ambient mode
2. Check if a waypoint proxy exists and is healthy
3. Determine if your policy is L4 or L7
4. Verify the policy shows up in the right component (`istioctl ztunnel-config authorization` or `istioctl proxy-config` on the waypoint)
5. Test TCP connectivity separately from HTTP
6. Check logs at both layers
7. Look for DENY policies that might be blocking at L4 before L7 rules can apply

Following this process will cut your debugging time significantly and help you avoid the common traps that come with the two-layer architecture in ambient mode.
