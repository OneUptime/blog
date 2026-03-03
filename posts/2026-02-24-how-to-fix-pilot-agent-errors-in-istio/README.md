# How to Fix Pilot-Agent Errors in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Pilot-Agent, Envoy, Sidecar, Troubleshooting

Description: Comprehensive guide to diagnosing and resolving pilot-agent errors within the Istio sidecar proxy container.

---

Pilot-agent is the process that runs inside the istio-proxy container alongside Envoy. It handles bootstrapping Envoy, managing certificates, running health checks, and maintaining the connection to Istiod. When pilot-agent has problems, the entire sidecar proxy is affected. Here's how to troubleshoot the most common pilot-agent errors.

## What Pilot-Agent Does

Before debugging, it helps to understand the role of pilot-agent:

1. Generates the Envoy bootstrap configuration
2. Starts and monitors the Envoy process
3. Handles SDS (Secret Discovery Service) for certificate rotation
4. Provides health check endpoints
5. Manages graceful shutdown during pod termination
6. Connects to Istiod to receive configuration updates

## Checking Pilot-Agent Status

First, verify that pilot-agent is running:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- ps aux
```

You should see both `pilot-agent` and `envoy` processes. If pilot-agent is missing or in a crash state, the sidecar container will eventually restart.

Check the sidecar container logs:

```bash
kubectl logs <pod-name> -c istio-proxy -n my-namespace
```

Look for lines that start with pilot-agent error messages.

## "Failed to Connect to Istiod" Errors

One of the most common pilot-agent errors. The sidecar can't establish a connection to the control plane:

```text
pilot-agent: failed to connect to Istiod: connection refused
```

Verify Istiod is running:

```bash
kubectl get pods -n istio-system -l app=istiod
```

Check that the istiod service is reachable from the pod:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- curl -s https://istiod.istio-system.svc:15012/debug/connections -k
```

If the connection fails, check for NetworkPolicies blocking egress:

```bash
kubectl get networkpolicy -n my-namespace
```

Also verify DNS resolution works:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- nslookup istiod.istio-system.svc.cluster.local
```

## Certificate Provisioning Failures

Pilot-agent handles getting certificates from Istiod for mTLS. If this fails, you'll see errors like:

```text
failed to fetch certificate: connection error
```

or:

```text
certificate rotation: SDS stream error
```

Check the certificate status:

```bash
istioctl proxy-config secret <pod-name> -n my-namespace
```

If the default certificate is missing or expired, check Istiod's CA:

```bash
kubectl logs -l app=istiod -n istio-system | grep -i "cert\|ca\|sign"
```

A common cause is clock skew between nodes. Certificates have validity periods, and if the node clock is off, the certificate appears invalid:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- date
```

Compare with the node time and your system time.

## "Envoy Process Died" Errors

If Envoy crashes, pilot-agent detects it and restarts the container:

```text
envoy process exited with error: signal: killed
```

This usually means Envoy ran out of memory. Check the container resource limits:

```bash
kubectl get pod <pod-name> -n my-namespace -o jsonpath='{.spec.containers[?(@.name=="istio-proxy")].resources}'
```

Increase the memory limit for the sidecar. You can do this per-pod with annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyMemoryLimit: "512Mi"
        sidecar.istio.io/proxyMemory: "256Mi"
    spec:
      containers:
      - name: my-app
        image: my-app:latest
```

Or change the global default in the mesh config.

## Bootstrap Configuration Errors

Pilot-agent generates the Envoy bootstrap config on startup. If the environment is misconfigured, this can fail:

```text
failed to generate bootstrap config
```

Check that the required environment variables are set:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- env | grep -i istio
```

Key variables include:
- `ISTIO_META_CLUSTER_ID`
- `ISTIO_META_MESH_ID`
- `ISTIO_META_NETWORK`
- `POD_NAME`
- `POD_NAMESPACE`

If any are missing, the sidecar injector might not be configured correctly. Check the injection template:

```bash
kubectl get configmap istio-sidecar-injector -n istio-system -o yaml
```

## Health Check Port Conflicts

Pilot-agent exposes health check endpoints on port 15021. If something else in the pod uses that port, there's a conflict:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- ss -tlnp | grep 15021
```

The health endpoint should return 200:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- curl -s localhost:15021/healthz/ready
```

If it returns an error, pilot-agent isn't healthy.

## Readiness Issues

Pilot-agent handles the readiness of the sidecar. If the sidecar isn't ready, the pod's readiness gate might fail:

```bash
kubectl describe pod <pod-name> -n my-namespace | grep -A 10 "Readiness"
```

Common causes:
- Envoy hasn't received initial configuration yet
- Certificate provisioning is pending
- The connection to Istiod hasn't been established

You can check the ready status directly:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- curl -s localhost:15021/healthz/ready
```

## Drain and Shutdown Issues

During pod termination, pilot-agent orchestrates graceful shutdown. If the termination grace period is too short, connections might be dropped:

```yaml
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 60
```

You can also configure the drain duration for the sidecar:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: |
      terminationDrainDuration: 30s
```

If you see errors during shutdown like:

```text
drain listeners: timeout waiting for open connections to complete
```

Increase the termination grace period.

## Proxy Configuration Annotations

Pilot-agent reads several annotations to configure its behavior. If these are wrong, it can cause various errors:

```yaml
metadata:
  annotations:
    # Control which traffic goes through the proxy
    traffic.sidecar.istio.io/excludeInboundPorts: "8080"
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "10.0.0.1/32"
    # Proxy resource settings
    sidecar.istio.io/proxyCPU: "100m"
    sidecar.istio.io/proxyMemory: "128Mi"
    # Logging
    sidecar.istio.io/logLevel: "info"
```

Check if any annotations on the pod might be causing issues:

```bash
kubectl get pod <pod-name> -n my-namespace -o jsonpath='{.metadata.annotations}' | jq .
```

## DNS Proxy Issues

Pilot-agent can run a DNS proxy that captures DNS queries for the Istio mesh. If this is misconfigured:

```bash
kubectl exec <pod-name> -c istio-proxy -n my-namespace -- curl -s localhost:15000/stats | grep dns
```

If you see high DNS failure counts, the DNS proxy might be interfering with normal resolution. You can disable it with an annotation:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: |
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "false"
```

## Summary

Pilot-agent errors usually fall into a few categories: connection failures to Istiod, certificate provisioning problems, Envoy process crashes (usually OOM), or bootstrap configuration issues. Check the istio-proxy container logs for specific error messages, verify connectivity to Istiod, make sure resource limits are adequate, and look for clock skew or DNS resolution problems. Most pilot-agent issues resolve once you fix the underlying infrastructure problem.
