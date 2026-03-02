# How to Debug Health Check Failures with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Health Check, Debugging, Kubernetes, Troubleshooting

Description: A step-by-step troubleshooting guide for health check failures in Istio-enabled pods, covering probe rewriting issues, mTLS conflicts, and timing problems.

---

Health check failures in Istio-enabled pods can be maddening. Your application works fine when you curl it directly, but the Kubernetes probe keeps failing. The error messages are vague. The pod restarts in a loop. You are not sure if the problem is in your app, the sidecar, mTLS, or probe rewriting.

This guide walks through a systematic debugging approach to find and fix health check issues with Istio.

## Step 1: Identify What Is Failing

Start by figuring out which probe is failing and what Kubernetes reports:

```bash
# Check pod status and restart count
kubectl get pod <pod-name> -o wide

# Look at events for probe failures
kubectl describe pod <pod-name> | tail -30
```

You will see events like:

```
Warning  Unhealthy  2s (x3 over 12s)  kubelet  Liveness probe failed: Get "http://10.244.1.5:15021/app-health/my-app/livez": dial tcp 10.244.1.5:15021: connect: connection refused
```

Or:

```
Warning  Unhealthy  5s  kubelet  Readiness probe failed: HTTP probe failed with statuscode: 503
```

The error message tells you a lot. "Connection refused" means the port is not open. "Statuscode: 503" means the endpoint responded but with an error.

## Step 2: Check If Probe Rewriting Is Active

Look at the actual pod spec to see the rewritten probes:

```bash
kubectl get pod <pod-name> -o yaml | grep -B2 -A15 "livenessProbe"
kubectl get pod <pod-name> -o yaml | grep -B2 -A15 "readinessProbe"
```

If probe rewriting is working, you should see:
- Port changed to `15021`
- Path changed to `/app-health/<container-name>/livez` or `/readyz`

If you see the original port and path (like port 8080 and `/healthz`), probe rewriting is not active. This happens when:

1. The sidecar was injected by an older version of Istio
2. The annotation `sidecar.istio.io/rewriteAppHTTPProbers` is set to "false"
3. The probe type is not HTTP (TCP and exec probes are not rewritten)

Fix: re-inject the sidecar by restarting the pod:

```bash
kubectl delete pod <pod-name>
```

## Step 3: Test the Health Endpoint Directly

Bypass everything and test your application directly:

```bash
# Test from inside the application container
kubectl exec -it <pod-name> -c my-app -- curl -v http://localhost:8080/healthz
```

If this fails, the problem is in your application, not Istio. Check your application logs:

```bash
kubectl logs <pod-name> -c my-app
```

## Step 4: Test Through the Sidecar Agent

If the direct test passes, test through the Istio agent:

```bash
# Test the liveness probe path
kubectl exec -it <pod-name> -c istio-proxy -- \
  curl -v http://localhost:15021/app-health/my-app/livez

# Test the readiness probe path
kubectl exec -it <pod-name> -c istio-proxy -- \
  curl -v http://localhost:15021/app-health/my-app/readyz

# Test the sidecar's own readiness
kubectl exec -it <pod-name> -c istio-proxy -- \
  curl -v http://localhost:15021/healthz/ready
```

If the sidecar agent test fails but the direct test passes, there is a configuration mismatch. The sidecar agent might be forwarding to the wrong port or path.

## Step 5: Check the Sidecar Status

Make sure the sidecar is actually running:

```bash
# Check all container statuses
kubectl get pod <pod-name> -o jsonpath='{range .status.containerStatuses[*]}{.name}: {.ready}{"\n"}{end}'

# Check if the sidecar is in a crash loop
kubectl logs <pod-name> -c istio-proxy --previous
```

If the sidecar is crashing, your health probes will fail because port 15021 is not available. Check the sidecar logs for errors:

```bash
kubectl logs <pod-name> -c istio-proxy | head -50
```

Common sidecar startup errors:
- Certificate issues: `failed to load certificate`
- Configuration errors: `failed to start proxy`
- Port conflicts: `address already in use`

## Step 6: Check for mTLS Issues

If you have STRICT mTLS and probe rewriting is not active:

```bash
# Check mTLS mode
kubectl get peerauthentication -n default -o yaml

# Check the namespace-level policy
kubectl get peerauthentication -n istio-system -o yaml
```

If mTLS is STRICT and probes are going directly through Envoy (not rewritten), they will fail. The fix is to enable probe rewriting:

```yaml
metadata:
  annotations:
    sidecar.istio.io/rewriteAppHTTPProbers: "true"
```

## Step 7: Check Startup Ordering

If probes fail immediately after pod startup but work later, it is a timing issue. The application or sidecar is not ready when the first probe fires.

```bash
# Check container start times
kubectl get pod <pod-name> -o jsonpath='{range .status.containerStatuses[*]}{.name}: started={.state.running.startedAt}{"\n"}{end}'
```

Fix: use `holdApplicationUntilProxyStarts`:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
```

And add a startup probe to handle slow application starts:

```yaml
startupProbe:
  httpGet:
    path: /healthz
    port: 8080
  periodSeconds: 5
  failureThreshold: 30
```

## Step 8: Check for Port Conflicts

If your application and the Istio sidecar are competing for the same port, probes will behave unpredictably. Istio reserves these ports:

- 15000 - Envoy admin interface
- 15001 - Envoy outbound listener
- 15004 - Debug port
- 15006 - Envoy inbound listener
- 15020 - Merged Prometheus telemetry
- 15021 - Health check agent
- 15053 - DNS (if DNS proxying is enabled)
- 15090 - Envoy Prometheus stats

If your application uses any of these ports, change it:

```bash
# Check if your app listens on any Istio ports
kubectl exec -it <pod-name> -c my-app -- netstat -tlnp 2>/dev/null || \
kubectl exec -it <pod-name> -c my-app -- ss -tlnp
```

## Step 9: Check Resource Constraints

If the sidecar is resource-constrained, it might be too slow to respond to probes:

```bash
# Check resource usage
kubectl top pod <pod-name> --containers
```

If the istio-proxy container is hitting CPU or memory limits, increase them:

```yaml
metadata:
  annotations:
    sidecar.istio.io/proxyCPU: "200m"
    sidecar.istio.io/proxyMemory: "256Mi"
    sidecar.istio.io/proxyCPULimit: "500m"
    sidecar.istio.io/proxyMemoryLimit: "512Mi"
```

## Step 10: Check Network Policies

If you have Kubernetes NetworkPolicies, they might block probe traffic:

```bash
kubectl get networkpolicy -n default
```

Make sure the kubelet's IP range is allowed to access health check ports. The kubelet sends probes from the node's IP, not from within the cluster network.

## Quick Reference: Common Failures and Fixes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Connection refused on 15021 | Sidecar not running | Check sidecar logs, restart pod |
| 503 from probe | App reporting unhealthy | Check app logs, test directly |
| Timeout on probe | App too slow to respond | Increase `timeoutSeconds` |
| Probes fail only with STRICT mTLS | Probe rewriting disabled | Enable `rewriteAppHTTPProbers` |
| Probes fail during startup only | Race condition | Use `holdApplicationUntilProxyStarts` |
| Probes pass but pod not ready | Other readiness gates | Check pod conditions |
| Random probe failures | Resource contention | Increase sidecar resources |

## A Debugging Script

Save this as a quick debugging helper:

```bash
#!/bin/bash
POD=$1
CONTAINER=$2

echo "=== Pod Status ==="
kubectl get pod $POD -o wide

echo "=== Container Statuses ==="
kubectl get pod $POD -o jsonpath='{range .status.containerStatuses[*]}{.name}: ready={.ready}, restarts={.restartCount}{"\n"}{end}'

echo "=== Recent Events ==="
kubectl describe pod $POD | grep -A20 "Events:"

echo "=== Direct Health Check ==="
kubectl exec -it $POD -c $CONTAINER -- curl -sf http://localhost:8080/healthz && echo "PASS" || echo "FAIL"

echo "=== Sidecar Agent Health Check ==="
kubectl exec -it $POD -c istio-proxy -- curl -sf http://localhost:15021/app-health/$CONTAINER/livez && echo "PASS" || echo "FAIL"

echo "=== Sidecar Readiness ==="
kubectl exec -it $POD -c istio-proxy -- curl -sf http://localhost:15021/healthz/ready && echo "PASS" || echo "FAIL"
```

Run it with:

```bash
bash debug-probes.sh <pod-name> <container-name>
```

Most health check failures with Istio come down to one of three things: probe rewriting not being active, startup timing issues, or the application itself being unhealthy. Following this step-by-step process will help you pinpoint the issue quickly instead of guessing.
