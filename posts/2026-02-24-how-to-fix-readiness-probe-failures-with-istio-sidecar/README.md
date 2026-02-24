# How to Fix Readiness Probe Failures with Istio Sidecar

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Readiness Probe, Kubernetes, Sidecar, Troubleshooting

Description: Diagnosing and resolving readiness probe failures caused by Istio sidecar proxy interaction with Kubernetes pod readiness.

---

Readiness probe failures with Istio sidecars are particularly painful because they prevent your pods from receiving traffic. Unlike liveness probe failures (which restart the pod), readiness failures leave the pod running but remove it from Service endpoints. You end up with pods that are "running" but serving zero traffic.

## The Two-Container Readiness Problem

A Kubernetes pod with an Istio sidecar has at least two containers: your application and the istio-proxy. The pod is only considered ready when ALL containers are ready. This means:

1. If the application container is ready but istio-proxy isn't, the pod isn't ready
2. If istio-proxy is ready but the application container isn't, the pod isn't ready

This dual requirement is where most problems come from.

Check the readiness status of each container:

```bash
kubectl get pod <pod-name> -n my-namespace -o jsonpath='{range .status.containerStatuses[*]}{.name}: ready={.ready}{"\n"}{end}'
```

## Sidecar Not Ready During Startup

The most common scenario: your application starts fast but the sidecar takes time to connect to Istiod and receive configuration. During this window, the sidecar reports not ready.

Check the sidecar's readiness:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- curl -s localhost:15021/healthz/ready
```

If this returns a non-200 response, the sidecar isn't ready. Common reasons:
- Still connecting to Istiod
- Waiting for initial xDS configuration
- Certificate provisioning hasn't completed

The fix is to use `holdApplicationUntilProxyStarts`:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: |
      holdApplicationUntilProxyStarts: true
```

This prevents the application container from starting until the sidecar is ready, which avoids the race condition.

## Application Readiness Depends on Network

Many applications check external dependencies during startup (database connections, upstream services). If the sidecar isn't ready yet, these network calls fail and the application marks itself as not ready.

Here's the timeline that causes problems:

1. Pod starts
2. Both containers start simultaneously
3. Application tries to connect to the database
4. Sidecar isn't ready yet, so the connection fails
5. Application readiness check reports unhealthy
6. Eventually the sidecar becomes ready
7. But the application already failed its readiness check and might not retry

The solution depends on your application:

**Option A: Hold the application start:**
```yaml
metadata:
  annotations:
    proxy.istio.io/config: |
      holdApplicationUntilProxyStarts: true
```

**Option B: Add retry logic to your application's startup dependencies.**

**Option C: Use a startup probe with a generous threshold:**
```yaml
startupProbe:
  httpGet:
    path: /ready
    port: 8080
  failureThreshold: 60
  periodSeconds: 2
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  periodSeconds: 5
  failureThreshold: 3
```

## Probe Rewriting Issues

Just like liveness probes, readiness probes are rewritten by the Istio sidecar injector when `rewriteAppHTTPProbers` is enabled. The probe is redirected through pilot-agent on port 15021.

Verify the rewrite:

```bash
kubectl get pod <pod-name> -n my-namespace -o yaml | grep -A 8 readinessProbe
```

If the probe points to port 15021, the rewriting is active. Test the rewritten endpoint:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- curl -s http://localhost:15021/app-health/my-app/readyz
```

If this fails but calling the app directly works:

```bash
kubectl exec <pod-name> -c my-app -n my-namespace -- curl -s http://localhost:8080/ready
```

Then the problem is in the pilot-agent forwarding. Check pilot-agent logs:

```bash
kubectl logs <pod-name> -c istio-proxy -n my-namespace | grep -i "app-health\|probe"
```

## mTLS and Readiness Probes

With STRICT mTLS, the kubelet's plaintext readiness probe requests get rejected by the sidecar. This is the same problem as with liveness probes.

The fix is the same: enable probe rewriting or exclude the health check port:

```yaml
metadata:
  annotations:
    sidecar.istio.io/rewriteAppHTTPProbers: "true"
```

Or exclude the port:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeInboundPorts: "8081"
spec:
  containers:
  - name: my-app
    readinessProbe:
      httpGet:
        path: /ready
        port: 8081
```

## Slow Configuration Loading

If the sidecar takes a long time to load its initial configuration (because the cluster has many services), the readiness probe on the sidecar keeps failing.

Check how many clusters/routes the proxy needs to load:

```bash
istioctl proxy-config clusters <pod-name> -n my-namespace | wc -l
istioctl proxy-config routes <pod-name> -n my-namespace | wc -l
```

If there are thousands of entries, use the Sidecar resource to scope it down:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: my-namespace
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
```

This dramatically reduces the config that needs to be loaded before the sidecar can report ready.

## Readiness Gate Configuration

Istio can use pod readiness gates, which add an additional readiness condition that must be met. Check if a readiness gate is set:

```bash
kubectl get pod <pod-name> -n my-namespace -o jsonpath='{.spec.readinessGates}'
```

If there's a readiness gate for the sidecar, check its condition status:

```bash
kubectl get pod <pod-name> -n my-namespace -o jsonpath='{.status.conditions}' | jq .
```

## Intermittent Readiness Failures

If readiness probes work most of the time but occasionally fail:

1. Check if it's a timeout issue:
```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  timeoutSeconds: 5  # Increase from the default 1 second
  periodSeconds: 10
```

2. Check if the sidecar is experiencing high CPU usage which slows down request processing:
```bash
kubectl top pod <pod-name> -n my-namespace --containers
```

3. Look for connection pool exhaustion or circuit breaking:
```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- curl -s localhost:15000/stats | grep "overflow\|pending\|cx_active"
```

## Deployment Rollout Issues

Readiness probe failures during deployments can cause rollouts to stall. Kubernetes waits for new pods to be ready before terminating old ones, and if readiness never passes, the deployment hangs.

Check the rollout status:

```bash
kubectl rollout status deployment my-service -n my-namespace
```

If it's stuck, check the new pods:

```bash
kubectl get pods -n my-namespace -l app=my-service --sort-by=.metadata.creationTimestamp
```

Look at the newest pods and their readiness. If they're stuck in "0/2 Ready", the sidecar or application (or both) aren't passing readiness.

## Custom Readiness for Sidecar

You can customize the sidecar's readiness behavior. For example, you can make the sidecar wait for specific configuration to be loaded before reporting ready:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: |
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
```

Or adjust the sidecar's own readiness configuration in the mesh config.

## Debugging Checklist

When readiness probes fail with Istio:

1. Which container is not ready? (`kubectl get pod -o jsonpath`)
2. Can the sidecar reach Istiod? (`curl istiod:15012`)
3. Is probe rewriting working? (check the running pod spec)
4. Is mTLS blocking probes? (check PeerAuthentication)
5. Is the application's readiness endpoint working? (curl from inside the container)
6. Are there timeout issues? (increase timeoutSeconds)
7. Is the sidecar overloaded? (check CPU/memory)

## Summary

Readiness probe failures with Istio sidecars usually come from the race between application startup and sidecar initialization, mTLS blocking kubelet health checks, or the sidecar taking too long to load configuration. Use `holdApplicationUntilProxyStarts` to fix startup ordering, enable probe rewriting for mTLS compatibility, and scope down the sidecar configuration for faster initialization. Always check which container is failing readiness - the fix is different depending on whether it's the application or the sidecar.
