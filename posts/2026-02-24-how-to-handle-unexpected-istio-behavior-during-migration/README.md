# How to Handle Unexpected Istio Behavior During Migration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Mesh, Migration, Troubleshooting, Kubernetes

Description: A practical guide to diagnosing and fixing unexpected behavior that shows up when you migrate services to Istio service mesh.

---

You have planned the migration, tested in staging, and started rolling Istio out to production. Then something weird happens. A service that worked fine for months suddenly starts throwing connection errors. Or latency spikes appear out of nowhere. Or health checks start failing intermittently.

This is normal. Almost every Istio migration hits unexpected behavior at some point. The key is knowing how to diagnose and fix these issues quickly.

## The First Thing to Check: Is It Actually Istio?

Before blaming Istio for strange behavior, verify that the sidecar is actually the cause. The simplest way is to compare behavior with and without the sidecar.

```bash
# Check if the pod has a sidecar
kubectl get pod my-pod -o jsonpath='{.spec.containers[*].name}'
# Should show: my-app istio-proxy

# Check sidecar logs for errors
kubectl logs my-pod -c istio-proxy --tail=50

# Temporarily bypass the sidecar for debugging
kubectl annotate pod my-pod sidecar.istio.io/inject="false" --overwrite
# Then delete the pod to recreate without sidecar
```

If the problem goes away without the sidecar, you know Istio is involved. If it persists, look elsewhere.

## Connection Refused Errors

This is the most common unexpected behavior during migration. Services that were communicating fine suddenly get "connection refused" errors.

The usual culprit is a race condition between the sidecar proxy and your application during pod startup. Your application starts and tries to make outbound connections before the Envoy proxy is ready.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
    spec:
      containers:
      - name: my-app
        image: my-app:latest
```

This annotation tells the sidecar injector to modify the pod spec so the application container waits for the proxy to be ready. You can also set this globally:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

## Unexpected 503 Errors

If you start seeing 503 errors after enabling Istio, check a few things.

First, look at the response flags in the Envoy access logs:

```bash
kubectl logs my-pod -c istio-proxy | grep "503"
```

Common response flags and what they mean:

- `UH` - No healthy upstream hosts (your backend is down or not in the mesh)
- `UF` - Upstream connection failure
- `NR` - No route configured
- `URX` - Upstream retry limit exceeded

If you see `NR`, it usually means Istio cannot find a matching route. Check that your VirtualService and DestinationRule are correct:

```bash
# Check proxy configuration
istioctl proxy-config routes my-pod

# Look for the specific service
istioctl proxy-config clusters my-pod | grep my-service

# Validate configuration
istioctl analyze -n my-namespace
```

## Intermittent Timeouts

Timeouts that appear randomly after migration often point to circuit breaking or outlier detection being too aggressive with default settings.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 30s
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
        maxRequestsPerConnection: 10
        maxRetries: 3
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

The defaults for `http1MaxPendingRequests` and `http2MaxRequests` can be quite low for high-traffic services. If your service handles thousands of requests per second, those defaults will cause request queuing and timeouts.

## Health Check Failures

Kubernetes liveness and readiness probes can break after sidecar injection. This happens because the probe requests now go through the Envoy proxy, and if mTLS is enabled, the kubelet (which sends the probe requests) does not have a client certificate.

Istio handles this automatically by rewriting probe paths, but sometimes the rewriting fails. Check if probes are being rewritten:

```bash
kubectl get pod my-pod -o yaml | grep -A 5 "httpGet"
```

You should see the probes redirected to port 15020 (the Istio agent port). If not, you can manually configure them:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/rewriteAppHTTPProbers: "true"
    spec:
      containers:
      - name: my-app
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
```

## DNS Resolution Issues

After migration, you might see DNS resolution failures, especially for external services. Istio intercepts outbound traffic and may not know how to route it.

```bash
# Check if DNS is resolving inside the mesh
kubectl exec my-pod -c istio-proxy -- curl -v http://external-api.com

# Check Envoy's cluster configuration for the external service
istioctl proxy-config clusters my-pod | grep external
```

If external services are unreachable, create a ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: default
spec:
  hosts:
  - external-api.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS
```

## Memory and CPU Spikes

If you notice resource usage increasing after migration, the sidecar is the most likely cause. But sometimes the increase is larger than expected.

```bash
# Check sidecar resource usage
kubectl top pod my-pod --containers

# Look at Envoy stats for clues
kubectl exec my-pod -c istio-proxy -- pilot-agent request GET stats | grep "cx_active\|rq_active"
```

High memory usage in the sidecar often indicates too many endpoints being tracked. You can limit this with a Sidecar resource:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: my-app-sidecar
  namespace: my-namespace
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
    - "other-namespace/needed-service.other-namespace.svc.cluster.local"
```

This tells the sidecar to only track services it actually needs, reducing memory usage significantly in large clusters.

## Debugging Workflow Summary

When something unexpected happens, follow this order:

1. Check sidecar logs: `kubectl logs pod -c istio-proxy`
2. Run analysis: `istioctl analyze -n namespace`
3. Check proxy configuration: `istioctl proxy-config all pod`
4. Compare with and without sidecar to isolate the issue
5. Check Envoy access logs for response flags
6. Review resource usage with `kubectl top`

The most important thing during migration is to keep your rollback plan ready. If unexpected behavior is causing user-facing issues and you cannot diagnose it quickly, roll back by removing the sidecar injection label and restarting pods. Fix the issue in a staging environment, and try again.

```bash
# Emergency rollback for a namespace
kubectl label namespace my-namespace istio-injection-
kubectl rollout restart deployment -n my-namespace
```

Unexpected behavior during Istio migration is not a sign that something is fundamentally wrong. It usually means there is a configuration detail that needs attention. Stay calm, follow the debugging steps, and fix issues one at a time.
