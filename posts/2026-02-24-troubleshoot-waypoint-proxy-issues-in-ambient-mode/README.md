# How to Troubleshoot Waypoint Proxy Issues in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Waypoint Proxy, Troubleshooting, Kubernetes

Description: Systematic troubleshooting guide for waypoint proxy issues in Istio ambient mode covering deployment failures, routing problems, and policy misconfigurations.

---

Waypoint proxies in Istio ambient mode handle all L7 traffic processing - HTTP routing, retries, L7 authorization policies, and application-layer metrics. When they are not working correctly, you might see 503 errors, policy violations not being enforced, routing rules being ignored, or traffic bypassing the waypoint entirely.

This guide takes you through a systematic approach to diagnosing and fixing waypoint proxy issues.

## Is the Waypoint Proxy Running?

Start by checking if the waypoint proxy is actually deployed and healthy:

```bash
kubectl get gateways -n bookinfo
```

```
NAME                CLASS            ADDRESS       PROGRAMMED   AGE
bookinfo-waypoint   istio-waypoint   10.96.10.50   True         5d
```

The `PROGRAMMED` column should show `True`. If it shows `False`, the waypoint failed to initialize.

Check the waypoint pods:

```bash
kubectl get pods -n bookinfo -l gateway.networking.k8s.io/gateway-name=bookinfo-waypoint
```

If the pod is not running, check events:

```bash
kubectl describe gateway bookinfo-waypoint -n bookinfo
kubectl describe pod -l gateway.networking.k8s.io/gateway-name=bookinfo-waypoint -n bookinfo
```

Common reasons for waypoint deployment failures:
- Insufficient cluster resources (CPU or memory)
- Image pull errors (registry not accessible)
- Missing Kubernetes Gateway API CRDs
- `istio-waypoint` GatewayClass not registered

Verify the GatewayClass exists:

```bash
kubectl get gatewayclass istio-waypoint
```

If it is missing, your Istio installation might not support ambient mode or the ambient profile was not installed correctly.

## Is Traffic Reaching the Waypoint?

Even if the waypoint is running, traffic might not be routed through it. Check that the namespace or service is configured to use the waypoint:

```bash
# Check namespace label
kubectl get namespace bookinfo -L istio.io/use-waypoint

# Check service-level waypoint
kubectl get service reviews -n bookinfo -L istio.io/use-waypoint
```

If the label is missing, ztunnel sends traffic directly to the destination without going through the waypoint.

Add the label:

```bash
kubectl label namespace bookinfo istio.io/use-waypoint=bookinfo-waypoint
```

Verify ztunnel knows about the waypoint:

```bash
istioctl ztunnel-config workloads | grep bookinfo
```

The `WAYPOINT` column should show the waypoint address for workloads in the enrolled namespace.

## Waypoint Returns 503 Errors

A 503 from the waypoint usually means it cannot reach the backend service. Check the waypoint proxy logs:

```bash
kubectl logs deploy/bookinfo-waypoint -n bookinfo --tail=50
```

Look for upstream connection failures:

```
upstream connect error or disconnect/reset before headers. reset reason: connection failure
```

Common causes:
- The backend pod is not running
- The backend service port is wrong
- Network policy blocking waypoint-to-pod traffic

Verify the backend service:

```bash
kubectl get endpoints reviews -n bookinfo
```

If the endpoints list is empty, the service selector does not match any pods.

Check that the waypoint can reach the backend directly:

```bash
kubectl exec deploy/bookinfo-waypoint -n bookinfo -- curl -v http://reviews:9080/reviews/1 --max-time 5
```

## L7 Authorization Policies Not Working

If you applied an L7 AuthorizationPolicy but it does not seem to take effect:

### Check that the waypoint has the policy

```bash
istioctl proxy-config listener deploy/bookinfo-waypoint -n bookinfo
```

Look for RBAC filters in the listener chain.

### Verify the policy targets the right resource

In ambient mode, L7 policies should target the service using `targetRefs`:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: reviews-l7-policy
  namespace: bookinfo
spec:
  targetRefs:
    - kind: Service
      group: ""
      name: reviews
  action: ALLOW
  rules:
    - to:
        - operation:
            methods: ["GET"]
```

If you use the old-style `selector` field instead of `targetRefs`, the policy might not apply correctly to waypoint proxies.

### Check if the policy is L4 or L7

L4 policies (source identity, port only) are enforced by ztunnel. L7 policies (methods, paths, headers) require a waypoint. If you have an L7 policy but no waypoint, the policy will not be enforced:

```bash
# This policy needs a waypoint
spec:
  rules:
    - to:
        - operation:
            methods: ["GET"]  # L7 - needs waypoint

# This policy works with ztunnel alone
spec:
  rules:
    - from:
        - source:
            principals: ["cluster.local/ns/bookinfo/sa/sleep"]  # L4 - works with ztunnel
```

## VirtualService Routing Not Applied

If your VirtualService rules are not being applied:

### Check the VirtualService configuration

```bash
kubectl get virtualservice -n bookinfo -o yaml
```

Verify the `hosts` field matches the actual service name:

```yaml
spec:
  hosts:
    - reviews  # Must match the Kubernetes service name
```

### Check the waypoint's route configuration

```bash
istioctl proxy-config routes deploy/bookinfo-waypoint -n bookinfo
```

Look for your route rules in the output. If they are missing, the VirtualService might have a syntax error or target the wrong host.

### Check for DestinationRule subsets

If your VirtualService references subsets, make sure the DestinationRule is defined:

```bash
kubectl get destinationrule -n bookinfo
```

Missing DestinationRules cause 503 errors because the waypoint cannot resolve the subset to actual pods.

## Waypoint Proxy Performance Issues

If the waypoint is slow or running out of resources:

```bash
kubectl top pod -l gateway.networking.k8s.io/gateway-name=bookinfo-waypoint -n bookinfo
```

Check Envoy stats for connection queuing:

```bash
kubectl exec deploy/bookinfo-waypoint -n bookinfo -- \
  pilot-agent request GET stats | grep -E "downstream_cx_active|upstream_cx_active|upstream_rq_pending"
```

High `upstream_rq_pending` values indicate the waypoint cannot keep up with incoming traffic. Solutions:

1. Scale up the waypoint:
```bash
kubectl scale deployment bookinfo-waypoint -n bookinfo --replicas=3
```

2. Increase resource limits:
```bash
kubectl patch deployment bookinfo-waypoint -n bookinfo --type=json \
  -p='[{"op":"replace","path":"/spec/template/spec/containers/0/resources/limits/cpu","value":"2"},{"op":"replace","path":"/spec/template/spec/containers/0/resources/limits/memory","value":"1Gi"}]'
```

## Waypoint Configuration Out of Sync

If the waypoint proxy's configuration does not match what you expect:

```bash
# Check proxy status
istioctl proxy-status
```

Look for the waypoint in the output. The `CDS`, `LDS`, `EDS`, and `RDS` columns should show `SYNCED`. If any show `STALE` or `NOT SENT`, the waypoint is not receiving config updates from istiod.

Force a configuration push:

```bash
# Restart the waypoint to force a fresh config sync
kubectl rollout restart deployment bookinfo-waypoint -n bookinfo
```

## Debugging with Access Logs

Enable access logging on the waypoint:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: waypoint-logging
  namespace: bookinfo
spec:
  selector:
    matchLabels:
      gateway.networking.k8s.io/gateway-name: bookinfo-waypoint
  accessLogging:
    - providers:
        - name: envoy
```

Check the access logs:

```bash
kubectl logs deploy/bookinfo-waypoint -n bookinfo --tail=50
```

Each log line shows the request method, path, response code, upstream host, and timing information. This is invaluable for understanding what the waypoint is doing with each request.

## Envoy Admin Interface

For deep debugging, access the Envoy admin interface:

```bash
kubectl port-forward deploy/bookinfo-waypoint -n bookinfo 15000:15000
```

Then browse:
- `http://localhost:15000/config_dump` - Full configuration
- `http://localhost:15000/stats` - All statistics
- `http://localhost:15000/clusters` - Upstream cluster status
- `http://localhost:15000/listeners` - Listener configuration

The config dump is particularly useful for verifying that your VirtualService, DestinationRule, and AuthorizationPolicy resources are being translated correctly into Envoy configuration.

## Troubleshooting Checklist

1. Is the Gateway resource PROGRAMMED?
2. Is the waypoint pod running and healthy?
3. Is the namespace/service labeled with `istio.io/use-waypoint`?
4. Does ztunnel show the waypoint in workload config?
5. Are backend service endpoints populated?
6. Are AuthorizationPolicies using `targetRefs` (not `selector`)?
7. Do VirtualService hosts match actual service names?
8. Are DestinationRule subsets defined for referenced subsets?
9. Is the proxy config synced (check proxy-status)?
10. What do the access logs show?

Work through this checklist in order. Most waypoint issues are caught in the first five checks.
