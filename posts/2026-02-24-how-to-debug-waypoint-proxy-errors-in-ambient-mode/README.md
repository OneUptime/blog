# How to Debug Waypoint Proxy Errors in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Waypoint Proxy, Debugging, Envoy

Description: Practical troubleshooting steps for diagnosing and fixing waypoint proxy errors in Istio ambient mode deployments.

---

Waypoint proxies are the L7 component of Istio ambient mode. While ztunnel handles L4 concerns like mTLS and basic TCP authorization, waypoint proxies handle HTTP routing, retries, header manipulation, and L7 authorization. When a waypoint proxy is not working correctly, your L7 policies silently fail or traffic gets dropped. Here is how to find and fix the most common waypoint proxy issues.

## How Waypoint Proxies Work

In ambient mode, a waypoint proxy is deployed as a Kubernetes Gateway resource using the Istio waypoint gateway class. Traffic flows like this:

1. Source pod sends traffic to destination
2. Source node's ztunnel intercepts the traffic
3. ztunnel checks if the destination has a waypoint proxy
4. If yes, ztunnel routes traffic to the waypoint proxy first
5. Waypoint proxy applies L7 policies and routes to the destination
6. Destination node's ztunnel delivers traffic to the destination pod

If any step in this chain breaks, you get errors.

## Deploying a Waypoint Proxy

First, make sure you know how to deploy one correctly:

```bash
# Deploy a waypoint for a namespace
istioctl waypoint apply --namespace my-app

# Verify it was created
kubectl get gateways -n my-app
```

This creates a Gateway resource:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: waypoint
  namespace: my-app
spec:
  gatewayClassName: istio-waypoint
  listeners:
    - name: mesh
      port: 15008
      protocol: HBONE
```

Check that the waypoint pod is running:

```bash
kubectl get pods -n my-app -l gateway.networking.k8s.io/gateway-name=waypoint
```

## Common Error: Waypoint Pod Not Starting

If the waypoint pod is stuck in Pending or CrashLoopBackOff:

```bash
# Check pod status
kubectl describe pod -n my-app -l gateway.networking.k8s.io/gateway-name=waypoint

# Check events
kubectl get events -n my-app --sort-by='.lastTimestamp' | grep waypoint
```

Common causes:

**Insufficient resources**: The waypoint proxy needs CPU and memory. Check resource requests:

```bash
kubectl get pod -n my-app -l gateway.networking.k8s.io/gateway-name=waypoint -o yaml | \
  grep -A 5 resources
```

**Missing RBAC**: The waypoint needs a service account with proper permissions. Verify:

```bash
kubectl get serviceaccount -n my-app waypoint
kubectl get rolebinding -n my-app | grep waypoint
```

## Common Error: Traffic Not Reaching Waypoint

If L7 policies are not being applied, traffic might be bypassing the waypoint entirely. Check if ztunnel knows about the waypoint:

```bash
# Find the ztunnel pod on the source node
SOURCE_NODE=$(kubectl get pod -n my-app source-pod-xxx -o jsonpath='{.spec.nodeName}')
ZTUNNEL_POD=$(kubectl get pods -n istio-system -l app=ztunnel \
  --field-selector spec.nodeName=$SOURCE_NODE -o jsonpath='{.items[0].metadata.name}')

# Check if ztunnel has waypoint information
kubectl exec -n istio-system $ZTUNNEL_POD -- \
  curl -s localhost:15000/config_dump | python3 -c "
import sys, json
data = json.load(sys.stdin)
for w in data.get('workloads', []):
    if 'waypoint' in str(w):
        print(json.dumps(w, indent=2))
"
```

If the waypoint is not in ztunnel's config, check that the namespace or service account has the waypoint annotation:

```bash
kubectl get namespace my-app -o yaml | grep gateway.istio.io
```

The namespace should have:

```yaml
metadata:
  labels:
    istio.io/dataplane-mode: ambient
    istio.io/use-waypoint: waypoint
```

Or apply the waypoint binding:

```bash
istioctl waypoint apply --namespace my-app --enroll-namespace
```

## Common Error: 503 Responses from Waypoint

If the waypoint proxy returns 503 errors, it means the waypoint cannot reach the destination. Check the waypoint proxy logs:

```bash
kubectl logs -n my-app -l gateway.networking.k8s.io/gateway-name=waypoint
```

Look for upstream connection errors:

```
[2024-01-15T10:30:45.123Z] "GET /api/data HTTP/1.1" 503 UF upstream_reset_before_response_started
```

The `UF` flag means upstream connection failure. Debug the upstream:

```bash
# Check endpoints the waypoint knows about
kubectl exec -n my-app deploy/waypoint -- \
  pilot-agent request GET /clusters | grep my-service
```

If endpoints are empty, the service might not be discoverable:

```bash
# Verify the service exists
kubectl get svc -n my-app my-service

# Check endpoints
kubectl get endpoints -n my-app my-service
```

## Common Error: L7 Authorization Denials

When authorization policies return 403 through the waypoint, debug by checking which policy is blocking:

```bash
# Check all authorization policies in the namespace
kubectl get authorizationpolicies -n my-app -o yaml
```

Enable debug logging on the waypoint proxy:

```bash
kubectl exec -n my-app deploy/waypoint -- \
  pilot-agent request POST '/logging?rbac=debug'
```

Then make a request and check the logs:

```bash
kubectl logs -n my-app deploy/waypoint | grep rbac
```

You should see messages like:

```
enforced denied, matched policy ns[my-app]-policy[deny-external]-rule[0]
```

This tells you exactly which policy and rule caused the denial.

## Common Error: Waypoint Not Applying VirtualService Rules

If your VirtualService routing rules are not being applied by the waypoint, verify the waypoint has the configuration:

```bash
# Check routes in the waypoint proxy
kubectl exec -n my-app deploy/waypoint -- \
  pilot-agent request GET /config_dump | python3 -c "
import sys, json
data = json.load(sys.stdin)
for config in data.get('configs', []):
    if 'route_config' in str(config.get('@type', '')):
        print(json.dumps(config, indent=2))
" | head -100
```

Make sure your VirtualService targets the correct host and that the waypoint is actually handling traffic for that host:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-routes
  namespace: my-app
spec:
  hosts:
    - my-service.my-app.svc.cluster.local
  http:
    - match:
        - headers:
            x-version:
              exact: "v2"
      route:
        - destination:
            host: my-service-v2
    - route:
        - destination:
            host: my-service
```

## Checking Waypoint Proxy Health

Use istioctl to verify the proxy status:

```bash
# Check if waypoint is connected to istiod
istioctl proxy-status | grep waypoint

# Analyze for configuration issues
istioctl analyze -n my-app
```

Check the waypoint's listener and cluster configuration:

```bash
# List listeners
kubectl exec -n my-app deploy/waypoint -- \
  pilot-agent request GET /listeners

# List clusters (upstream services)
kubectl exec -n my-app deploy/waypoint -- \
  pilot-agent request GET /clusters
```

## Scaling and Performance Issues

If the waypoint is overloaded, you might see latency spikes or dropped connections:

```bash
# Check resource usage
kubectl top pods -n my-app -l gateway.networking.k8s.io/gateway-name=waypoint

# Check connection stats
kubectl exec -n my-app deploy/waypoint -- \
  pilot-agent request GET /stats | grep downstream_cx_active
```

Scale the waypoint by modifying the Gateway resource or using HPA:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: waypoint-hpa
  namespace: my-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: waypoint
  minReplicas: 1
  maxReplicas: 3
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Quick Debug Checklist

When a waypoint proxy is misbehaving, run through this:

1. Is the waypoint pod running? (`kubectl get pods`)
2. Is the namespace enrolled in the waypoint? (`kubectl get ns -o yaml`)
3. Is the waypoint connected to istiod? (`istioctl proxy-status`)
4. Does ztunnel know about the waypoint? (check ztunnel config dump)
5. Are endpoints populated? (`pilot-agent request GET /clusters`)
6. Are authorization policies correct? (enable RBAC debug logging)
7. Are resource limits appropriate? (`kubectl top pods`)

Walking through these steps systematically will find the root cause of most waypoint proxy issues in ambient mode.
