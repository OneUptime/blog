# How to Debug Container Issues Related to Istio Sidecar

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar, Debugging, Kubernetes, Troubleshooting, Container

Description: A comprehensive guide to diagnosing and fixing container-level issues caused by or related to the Istio sidecar proxy in Kubernetes pods.

---

When something goes wrong in an Istio-enabled pod, it's not always obvious whether the problem is your application, the sidecar, or the interaction between them. Containers sharing a network namespace adds complexity that can make straightforward issues look mysterious. Here's a systematic approach to debugging container problems that involve the Istio sidecar.

## Symptom: Application Container Won't Start

If your application container is stuck in `Init` or `CrashLoopBackOff`, start here:

### Check Init Container Logs

The `istio-init` container sets up iptables rules. If it fails, the sidecar won't work:

```bash
kubectl logs my-app-xyz -c istio-init
```

Common failures:
- **Permission denied**: The init container needs `NET_ADMIN` and `NET_RAW` capabilities
- **iptables not found**: The init container image is corrupted or missing tools
- **Already configured**: Another init container or CNI plugin has conflicting rules

### Check Container Events

```bash
kubectl describe pod my-app-xyz
```

Look at the Events section. You might see:
- `FailedCreatePodSandBox` - network setup failed
- `ImagePullBackOff` - can't pull the istio-proxy or your application image
- `CrashLoopBackOff` - one of the containers keeps crashing

### Check Sidecar Startup

```bash
kubectl logs my-app-xyz -c istio-proxy --tail=20
```

If the sidecar can't connect to istiod, you'll see errors like:
```
Failed to connect to Pilot
Connection refused to istiod.istio-system.svc:15012
```

This usually means:
- istiod is down or overloaded
- Network policies are blocking the connection
- The proxy's service account doesn't have the right RBAC permissions

## Symptom: Application Can't Make Outbound Connections

Your app starts fine but can't reach other services or external APIs.

### Step 1: Verify Sidecar Is Running

```bash
kubectl get pod my-app-xyz -o jsonpath='{.status.containerStatuses[?(@.name=="istio-proxy")].ready}'
```

If this returns `false`, the sidecar isn't ready and won't proxy traffic correctly.

### Step 2: Check iptables Rules

```bash
kubectl exec -it my-app-xyz -c istio-proxy -- iptables -t nat -L ISTIO_OUTPUT -n
```

You should see rules redirecting traffic to port 15001 (outbound) and 15006 (inbound). If these are missing, the init container didn't complete successfully.

### Step 3: Test Connectivity from Sidecar

```bash
kubectl exec -it my-app-xyz -c istio-proxy -- curl -v http://other-service.default.svc.cluster.local:8080
```

If this works from the sidecar but not from your application, the issue is in how your app constructs requests.

### Step 4: Check Proxy Configuration

```bash
istioctl proxy-config cluster my-app-xyz | grep other-service
istioctl proxy-config endpoint my-app-xyz | grep other-service
```

If the cluster or endpoint is missing, the sidecar doesn't know about the target service. Check your Sidecar resource configuration.

## Symptom: Inbound Requests Return 503

Your service is running but callers get 503 errors.

### Check if the Pod Is in the Endpoints

```bash
kubectl get endpoints my-service
```

If your pod's IP isn't listed, it's not ready (check readiness probes).

### Check the Inbound Listener

```bash
istioctl proxy-config listener my-app-xyz --port 8080 --type SIDECAR_INBOUND
```

If there's no inbound listener on your application port, the sidecar doesn't know to route traffic there.

### Check Envoy Access Logs

```bash
kubectl logs my-app-xyz -c istio-proxy | grep "503"
```

The access log shows the reason for the 503:
- `NR` (No Route) - no routing rule matches
- `UH` (Upstream Unhealthy) - the upstream is marked unhealthy
- `UF` (Upstream Connection Failure) - couldn't connect to the upstream
- `DC` (Downstream Connection Termination) - the client closed the connection

## Symptom: High Latency

If requests through the sidecar are slow:

### Check Sidecar Resource Usage

```bash
kubectl top pod my-app-xyz --containers
```

If the istio-proxy container is CPU-throttled, request processing slows down:

```bash
kubectl exec -it my-app-xyz -c istio-proxy -- pilot-agent request GET stats | grep "upstream_cx_connect_ms"
```

### Check Connection Pool

```bash
kubectl exec -it my-app-xyz -c istio-proxy -- pilot-agent request GET stats | grep "cx_pool"
```

If you see high numbers for `cx_connect_ms_bucket` in higher buckets, connections are taking long to establish.

### Check for Config Sync Delays

```bash
istioctl proxy-status | grep my-app
```

If the status shows `STALE`, the proxy hasn't received the latest configuration. This can cause routing to outdated endpoints.

## Symptom: Memory Issues

### Sidecar Uses Too Much Memory

Check the actual memory usage:

```bash
kubectl exec -it my-app-xyz -c istio-proxy -- pilot-agent request GET memory
```

Common causes of high sidecar memory:
1. Too many services in the registry (fix with Sidecar resource)
2. Large number of active connections
3. Access logging buffering
4. Large number of EnvoyFilter configurations

Reduce memory by limiting the service scope:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Sidecar
metadata:
  name: minimal-sidecar
  namespace: default
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
```

### OOMKilled

If the sidecar is getting OOMKilled:

```bash
kubectl describe pod my-app-xyz | grep -A 5 "OOMKilled"
```

Increase the memory limit:

```yaml
annotations:
  sidecar.istio.io/proxyMemoryLimit: "512Mi"
```

## Symptom: Port Conflicts

If your application uses one of Istio's reserved ports, things break silently.

### Check for Conflicts

```bash
kubectl exec -it my-app-xyz -c istio-proxy -- ss -tlnp
```

Istio reserved ports:
- 15000: Envoy admin interface
- 15001: Envoy outbound capture
- 15006: Envoy inbound capture
- 15020: Merged Prometheus port
- 15021: Health check port
- 15053: DNS proxy (if enabled)
- 15090: Envoy Prometheus stats

If your application uses any of these ports, change either your application's port or exclude it from sidecar capture:

```yaml
annotations:
  traffic.sidecar.istio.io/excludeInboundPorts: "15020"
```

## Symptom: Container Crashes During Shutdown

If your application container crashes during pod termination:

### Check Previous Logs

```bash
kubectl logs my-app-xyz -c my-app --previous
```

Look for errors like "connection refused" or "broken pipe" during shutdown, which indicate the sidecar exited before the application.

### Fix with Termination Settings

```yaml
annotations:
  proxy.istio.io/config: |
    terminationDrainDuration: 30s
    proxyMetadata:
      EXIT_ON_ZERO_ACTIVE_CONNECTIONS: "true"
```

## General Debugging Toolkit

Here's a quick reference of commands for debugging container issues with Istio:

```bash
# Overall pod status
kubectl describe pod my-app-xyz

# Container logs
kubectl logs my-app-xyz -c my-app
kubectl logs my-app-xyz -c istio-proxy
kubectl logs my-app-xyz -c istio-init

# Resource usage
kubectl top pod my-app-xyz --containers

# Proxy sync status
istioctl proxy-status

# Proxy configuration
istioctl proxy-config all my-app-xyz

# Envoy admin stats
kubectl exec -it my-app-xyz -c istio-proxy -- pilot-agent request GET stats

# Envoy config dump
kubectl exec -it my-app-xyz -c istio-proxy -- pilot-agent request GET config_dump

# iptables rules
kubectl exec -it my-app-xyz -c istio-proxy -- iptables -t nat -L -n

# istioctl diagnostic
istioctl analyze -n default

# Envoy access logs
kubectl logs my-app-xyz -c istio-proxy | tail -50
```

## When to Disable the Sidecar

Sometimes the quickest way to determine if Istio is the cause is to temporarily disable the sidecar:

```yaml
annotations:
  sidecar.istio.io/inject: "false"
```

Restart the pod. If the issue goes away, it's Istio-related. If it persists, the problem is elsewhere.

Debugging container issues in Istio requires understanding the interaction between your application container and the sidecar. Most issues fall into a few categories: startup ordering, port conflicts, resource constraints, and shutdown coordination. Having a systematic approach and knowing which tools to use at each step makes the process much faster.
