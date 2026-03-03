# How to Diagnose Pilot-Agent Readiness Probe Failures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Pilot-Agent, Readiness Probe, Troubleshooting, Sidecar

Description: How to diagnose and fix pilot-agent readiness probe failures that prevent Istio sidecar proxies from becoming ready.

---

When the pilot-agent readiness probe fails, the istio-proxy container is marked as not ready, and Kubernetes removes the pod from service endpoints. This means no traffic reaches your application, even though the application itself might be perfectly healthy. Readiness probe failures on the sidecar are a common source of production issues, and understanding how the probe works is key to fixing them.

## How the Readiness Probe Works

The istio-proxy container has a readiness probe configured by Istio during sidecar injection:

```yaml
readinessProbe:
  httpGet:
    path: /healthz/ready
    port: 15021
  initialDelaySeconds: 1
  periodSeconds: 2
  failureThreshold: 30
  timeoutSeconds: 3
```

The probe hits `localhost:15021/healthz/ready` on the pilot-agent process. Pilot-agent checks several conditions and returns 200 (ready) or 503 (not ready).

## What Pilot-Agent Checks

The readiness endpoint checks these conditions:

1. **Envoy has started** - The Envoy process is running
2. **Envoy is ready** - Envoy's own readiness check passes (connected to Istiod, has initial configuration)
3. **Application ports are ready** (if `holdApplicationUntilProxyStarts` is configured)

If any of these fail, the probe returns 503.

## Quick Diagnosis

Start by checking what the readiness probe returns:

```bash
# Check the readiness probe directly
kubectl exec my-service-pod -n my-namespace -c istio-proxy -- \
  curl -s -o /dev/null -w "%{http_code}" localhost:15021/healthz/ready

# Get detailed status
kubectl exec my-service-pod -n my-namespace -c istio-proxy -- \
  curl -s localhost:15021/healthz/ready
```

A 503 response means the proxy is not ready. The response body may contain details about why.

Also check the pilot-agent health endpoint:

```bash
kubectl exec my-service-pod -n my-namespace -c istio-proxy -- \
  curl -s localhost:15020/healthz/ready
```

## Common Causes and Fixes

### 1. Cannot Connect to Istiod

Envoy needs to connect to Istiod to receive its initial configuration. If this connection fails, the proxy never becomes ready:

```bash
# Check if the proxy can reach Istiod
kubectl exec my-service-pod -n my-namespace -c istio-proxy -- \
  curl -s -o /dev/null -w "%{http_code}" https://istiod.istio-system.svc:15012/healthz/ready

# Check proxy logs for connection errors
kubectl logs my-service-pod -n my-namespace -c istio-proxy | grep -i "error\|fail\|connect"
```

Common reasons for Istiod connectivity failures:

- Istiod is not running (`kubectl get pods -n istio-system -l app=istiod`)
- NetworkPolicy blocks traffic to istio-system
- DNS resolution for istiod.istio-system.svc fails
- The pod's service account does not have the right RBAC permissions

Fix Istiod availability:

```bash
# Check Istiod status
kubectl get pods -n istio-system -l app=istiod
kubectl logs deploy/istiod -n istio-system --tail=50

# Restart Istiod if it is stuck
kubectl rollout restart deployment/istiod -n istio-system
```

### 2. Slow Initial Configuration

For large meshes, the initial configuration push to a new proxy can take a while. If it takes longer than the probe's initial delay + (failure threshold * period), Kubernetes marks the pod as not ready:

```bash
# Check how long the proxy has been running
kubectl get pod my-service-pod -n my-namespace -o jsonpath='{.status.containerStatuses[?(@.name=="istio-proxy")].state}'
```

If the probe is failing during startup, increase the probe tolerance:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        # Give the proxy more time to start
        sidecar.istio.io/readinessInitialDelaySeconds: "5"
        sidecar.istio.io/readinessFailureThreshold: "60"
        sidecar.istio.io/readinessPeriodSeconds: "2"
```

This gives the proxy 5s + (60 * 2s) = 125 seconds to become ready instead of the default 1s + (30 * 2s) = 61 seconds.

### 3. Certificate Issues

The proxy needs valid certificates from Istiod before it can accept mTLS connections. If certificate provisioning fails, the proxy stays not-ready:

```bash
# Check certificate status
istioctl proxy-config secret my-service-pod -n my-namespace

# Check for cert errors in logs
kubectl logs my-service-pod -n my-namespace -c istio-proxy | grep -i "cert\|secret\|SDS"
```

If you see SDS (Secret Discovery Service) errors, the proxy cannot get certificates from Istiod. Check that:

- Istiod's CA is functioning (`kubectl logs deploy/istiod -n istio-system | grep "CA"`)
- The pod's service account is valid
- There are no conflicting trust domains

### 4. Envoy Process Crashed

If the Envoy process crashes or fails to start, pilot-agent reports not-ready:

```bash
# Check if Envoy is running inside the proxy container
kubectl exec my-service-pod -n my-namespace -c istio-proxy -- ps aux | grep envoy

# Check for crash logs
kubectl logs my-service-pod -n my-namespace -c istio-proxy --previous
```

Common reasons for Envoy crashes:
- Out of memory (check resource limits)
- Invalid configuration pushed by Istiod
- Binary compatibility issues (mismatched versions)

### 5. Port Conflicts

If another process in the pod is using port 15021, 15020, or 15001, the proxy cannot bind:

```bash
# Check what is listening on proxy ports
kubectl exec my-service-pod -n my-namespace -c istio-proxy -- \
  ss -tlnp | grep -E "15021|15020|15001|15006"
```

If your application uses any Istio reserved ports (15000-15021), change the application ports.

### 6. Application Readiness Blocking Proxy

When `holdApplicationUntilProxyStarts` is enabled, the proxy waits for the application to be ready before reporting ready. But if the application depends on the proxy being ready (circular dependency), both get stuck:

```bash
# Check if this is configured
kubectl get configmap istio -n istio-system -o yaml | grep holdApplicationUntilProxyStarts
```

If you have a circular dependency, disable this setting or restructure your application startup:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: false
```

## Checking Pod Events

Kubernetes records events when readiness probes fail:

```bash
kubectl describe pod my-service-pod -n my-namespace | grep -A5 "Events:"
```

Look for messages like:

```text
Warning  Unhealthy  2m (x15 over 5m)  kubelet  Readiness probe failed: HTTP probe failed with statuscode: 503
```

The count and duration tell you if this is a transient startup issue or a persistent failure.

## Debugging Pilot-Agent Directly

Pilot-agent has additional debug information:

```bash
# Check pilot-agent version and build info
kubectl exec my-service-pod -n my-namespace -c istio-proxy -- pilot-agent version

# Check environment variables
kubectl exec my-service-pod -n my-namespace -c istio-proxy -- env | grep -E "ISTIO|PILOT|PROXY"

# View the proxy bootstrap configuration
kubectl exec my-service-pod -n my-namespace -c istio-proxy -- cat /etc/istio/proxy/envoy_bootstrap.json
```

## Monitoring Readiness Across the Fleet

Track readiness problems across all pods:

```promql
# Count of pods where istio-proxy is not ready
count(kube_pod_container_status_ready{container="istio-proxy"} == 0)

# Pods with istio-proxy restart loops
sum(kube_pod_container_status_restarts_total{container="istio-proxy"}) by (pod, namespace)
```

Alert on widespread readiness failures:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: proxy-readiness-alerts
spec:
  groups:
  - name: proxy-readiness
    rules:
    - alert: ProxyNotReady
      expr: |
        kube_pod_container_status_ready{container="istio-proxy"} == 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "istio-proxy not ready in {{ $labels.pod }}"
    - alert: WideSpreadProxyNotReady
      expr: |
        count(kube_pod_container_status_ready{container="istio-proxy"} == 0) > 5
      for: 3m
      labels:
        severity: critical
      annotations:
        summary: "{{ $value }} pods have non-ready istio-proxy containers"
```

## Debugging Checklist

1. Check the readiness endpoint directly (curl localhost:15021/healthz/ready)
2. Check proxy logs for connection or certificate errors
3. Verify Istiod is running and healthy
4. Check network connectivity to Istiod
5. Verify certificate provisioning
6. Check for Envoy process crashes
7. Look for port conflicts
8. Check probe timeout and threshold settings
9. Look at pod events for probe failure history
10. Verify resource limits are not too low

Pilot-agent readiness failures almost always boil down to one of three things: Istiod connectivity, certificate issues, or resource constraints. Check those first and you will resolve most problems quickly.
