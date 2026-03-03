# How to Fix Envoy Proxy Crash Loops in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Crash Loop, Troubleshooting, Sidecar Proxy

Description: Diagnose and fix Envoy sidecar proxy crash loops in Istio caused by configuration errors, memory limits, certificate issues, and control plane problems.

---

When the Envoy sidecar proxy starts crash looping, it takes your entire pod down with it. The application might be perfectly healthy, but because the proxy keeps crashing and restarting, network traffic gets disrupted and Kubernetes might eventually mark the pod as unhealthy.

This guide covers every common cause of Envoy proxy crash loops and how to fix them.

## Getting the Crash Information

Start by understanding what is happening:

```bash
# Check pod status and restart count
kubectl get pod <pod-name> -n production

# Look at the events
kubectl describe pod <pod-name> -n production | grep -A 20 "Events"

# Check the current proxy logs
kubectl logs <pod-name> -c istio-proxy -n production

# Check the previous crash logs (critical for crash loops)
kubectl logs <pod-name> -c istio-proxy -n production --previous
```

The `--previous` flag is important because it shows the logs from the last crash, which usually contains the actual error.

## Cause 1: Out of Memory (OOMKilled)

The most frequent cause of proxy crash loops is running out of memory:

```bash
# Check if the container was OOMKilled
kubectl get pod <pod-name> -n production -o jsonpath='{.status.containerStatuses[?(@.name=="istio-proxy")].lastState.terminated.reason}'
```

If this returns `OOMKilled`, the proxy needs more memory:

```bash
# Check current memory limits
kubectl get pod <pod-name> -n production -o jsonpath='{.spec.containers[?(@.name=="istio-proxy")].resources}'
```

Increase the memory limit:

```yaml
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyMemory: "256Mi"
        sidecar.istio.io/proxyMemoryLimit: "1Gi"
```

Or set it globally in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata: {}
  values:
    global:
      proxy:
        resources:
          requests:
            memory: 256Mi
          limits:
            memory: 1Gi
```

What causes high memory usage in Envoy:

- Large number of services in the mesh (each service adds to the configuration)
- Many endpoints per service
- Complex routing rules or EnvoyFilters
- High traffic volume with many concurrent connections

## Cause 2: Cannot Connect to Control Plane

If the proxy cannot reach istiod at startup, it might crash:

```bash
# Check the previous logs for connection errors
kubectl logs <pod-name> -c istio-proxy -n production --previous | grep "istiod\|connection\|failed"
```

Common messages:

```text
failed to fetch bootstrap config
connection refused to istiod.istio-system:15012
```

Verify istiod is reachable:

```bash
# Check istiod pods
kubectl get pods -n istio-system -l app=istiod

# Check the istiod service
kubectl get svc istiod -n istio-system

# Test connectivity from the pod's namespace
kubectl run test-istiod --image=busybox --rm -it --restart=Never -n production -- \
  wget -qO- --timeout=5 http://istiod.istio-system:15014/debug/endpointz 2>&1 || echo "Cannot reach istiod"
```

If istiod is down, fix it first. If there is a network policy blocking traffic to istio-system, add an exception.

## Cause 3: Invalid Envoy Configuration

If an EnvoyFilter or other configuration pushes an invalid config to the proxy, it can crash:

```bash
# Check for configuration rejection errors
kubectl logs <pod-name> -c istio-proxy -n production --previous | grep "rejected\|invalid\|error"

# Check if there are problematic EnvoyFilters
kubectl get envoyfilters --all-namespaces
```

Test if removing EnvoyFilters fixes the crash:

```bash
# List all EnvoyFilters that might affect this pod
kubectl get envoyfilters -n production
kubectl get envoyfilters -n istio-system

# Temporarily remove a suspected EnvoyFilter
kubectl delete envoyfilter <name> -n production
```

You can also check the proxy config dump to see what configuration is being applied:

```bash
# If the proxy stays up long enough
kubectl exec <pod-name> -c istio-proxy -n production -- pilot-agent request GET /config_dump > config_dump.json
```

## Cause 4: Certificate Issues

If the proxy cannot get a valid certificate from istiod, it will fail:

```bash
kubectl logs <pod-name> -c istio-proxy -n production --previous | grep "cert\|certificate\|CA\|SDS"
```

Common certificate-related crash messages:

```text
SDS: failed to fetch certificate
CA: failed to get certificate
```

Check if the istiod CA is working:

```bash
# Check istiod logs for CA errors
kubectl logs -n istio-system deployment/istiod | grep "CA\|cert\|error"

# Check the root CA secret
kubectl get secret istio-ca-secret -n istio-system
```

If the root CA has expired, you need to rotate it:

```bash
# Check root CA expiration
kubectl get secret istio-ca-secret -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | \
  base64 -d | openssl x509 -noout -dates
```

## Cause 5: Port Conflict

If another process in the pod is using ports that the Envoy proxy needs:

- 15000 (Envoy admin)
- 15001 (Envoy outbound listener)
- 15006 (Envoy inbound listener)
- 15020 (merged Prometheus metrics)
- 15021 (health check)
- 15090 (Prometheus endpoint)

```bash
# Check for port conflicts
kubectl logs <pod-name> -c istio-proxy -n production --previous | grep "bind\|address already in use"
```

Fix by changing your application port or excluding the conflicting port from interception:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeInboundPorts: "15000"
```

## Cause 6: DNS Resolution Failures

If the proxy cannot resolve DNS names at startup:

```bash
kubectl logs <pod-name> -c istio-proxy -n production --previous | grep "DNS\|dns\|resolve"
```

Check if CoreDNS is healthy:

```bash
kubectl get pods -n kube-system -l k8s-app=kube-dns
```

## Cause 7: Incompatible Proxy Version

If the proxy version does not match the control plane version:

```bash
# Check versions
istioctl version

# Check the specific proxy version on the crashing pod
kubectl get pod <pod-name> -n production -o jsonpath='{.spec.containers[?(@.name=="istio-proxy")].image}'
```

Istio supports at most one minor version difference between control plane and data plane. If the gap is bigger, update the sidecar:

```bash
# Restart the deployment to get the latest sidecar version
kubectl rollout restart deployment my-app -n production
```

## Cause 8: Resource Limits Too Tight

Even without OOMKill, if CPU limits are too tight, the proxy might not have time to complete initialization:

```bash
# Check CPU limits
kubectl get pod <pod-name> -n production -o jsonpath='{.spec.containers[?(@.name=="istio-proxy")].resources.limits.cpu}'
```

If the CPU limit is very low (like 10m), the proxy might be CPU-throttled during startup:

```yaml
metadata:
  annotations:
    sidecar.istio.io/proxyCPU: "100m"
    sidecar.istio.io/proxyCPULimit: "2000m"
```

## Stabilizing the Crash Loop

If you need to stabilize things quickly while investigating:

```bash
# Option 1: Disable injection temporarily for the deployment
kubectl patch deployment my-app -n production --type merge -p '
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "false"'

# Option 2: Increase resources significantly
kubectl patch deployment my-app -n production --type merge -p '
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyMemoryLimit: "2Gi"
        sidecar.istio.io/proxyCPULimit: "2000m"'
```

## Diagnostic Checklist

```bash
# 1. What killed the proxy?
kubectl get pod <pod> -n production -o jsonpath='{.status.containerStatuses[?(@.name=="istio-proxy")].lastState.terminated.reason}'

# 2. Previous crash logs
kubectl logs <pod> -c istio-proxy -n production --previous

# 3. Resource usage
kubectl top pod <pod> -n production --containers

# 4. istiod health
kubectl get pods -n istio-system -l app=istiod

# 5. EnvoyFilters applied
kubectl get envoyfilters -n production -n istio-system

# 6. Version compatibility
istioctl version
```

Most Envoy crash loops come down to three things: not enough memory, cannot reach istiod, or bad configuration from EnvoyFilters. Check the `--previous` logs first, as they almost always point you directly at the cause.
