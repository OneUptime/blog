# How to Fix Dapr Sidecar Not Starting on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, Troubleshooting, Sidecar, CrashLoopBackOff

Description: Diagnose and resolve Dapr sidecar startup failures including CrashLoopBackOff, component errors, and port conflicts on Kubernetes pods.

---

## Common Reasons the Sidecar Fails to Start

- Dapr component misconfiguration (bad secret reference, wrong host)
- Port conflict between app and sidecar
- Resource limits too low
- Network policy blocking sidecar-to-control-plane communication
- Invalid Dapr Configuration CRD reference

## Step 1: Check Sidecar Container Status

```bash
# Check pod status - look for CrashLoopBackOff on daprd
kubectl get pods -l app=myapp

# Describe the pod to see container states
kubectl describe pod myapp-xxxxxxxxx

# Get previous sidecar logs (before restart)
kubectl logs myapp-xxxxxxxxx -c daprd --previous
```

## Step 2: View Sidecar Startup Logs

```bash
# Current sidecar logs
kubectl logs myapp-xxxxxxxxx -c daprd

# Enable debug logging to see more detail
# Add annotation: dapr.io/log-level: "debug"
kubectl logs myapp-xxxxxxxxx -c daprd | grep -E "ERROR|WARN|component|fail"
```

## Step 3: Check Component Initialization

```bash
# Look for component loading errors
kubectl logs myapp-xxxxxxxxx -c daprd | grep -i "component\|init\|error"

# Example error:
# Error initializing state component statestore: dial tcp redis:6379: connection refused

# Verify the component is accessible from the pod
kubectl exec -it myapp-xxxxxxxxx -c myapp -- \
  nc -zv redis-master.default.svc.cluster.local 6379
```

## Step 4: Verify Component Secret References

```bash
# Check if the secret exists
kubectl get secret redis-secret -n default

# Check secret keys match what the component expects
kubectl describe secret redis-secret
```

## Step 5: Check Port Conflicts

```bash
# Dapr uses ports 3500 (HTTP), 50001 (gRPC), 9090 (metrics), 50002 (internal gRPC)
# If your app uses any of these, change them

# Check what ports the app container binds
kubectl exec myapp-xxxxxxxxx -c myapp -- ss -tlnp

# Change Dapr's gRPC port if 50001 is taken
# Annotation: dapr.io/grpc-port: "50002"
# Note: The HTTP port (3500) cannot be changed via annotation in Kubernetes.
# If your app conflicts with port 3500, change your app's port instead.
```

## Step 6: Check Network Policies

```bash
# List network policies that might block sidecar-to-control-plane traffic
kubectl get networkpolicies -n default
kubectl get networkpolicies -n dapr-system

# Sidecar needs to reach dapr-api (operator) on port 80 and dapr-sentry on port 443
kubectl exec myapp-xxxxxxxxx -c daprd -- \
  nc -zv dapr-api.dapr-system.svc.cluster.local 80
```

## Fix: Adjust Sidecar Resource Limits

If the sidecar OOMKills:

```yaml
annotations:
  dapr.io/sidecar-memory-limit: "256Mi"
  dapr.io/sidecar-memory-request: "64Mi"
  dapr.io/sidecar-cpu-limit: "500m"
  dapr.io/sidecar-cpu-request: "100m"
```

## Summary

A Dapr sidecar that fails to start is most often caused by component initialization errors, secret misconfiguration, or port conflicts. Check `kubectl logs <pod> -c daprd --previous` for the crash reason, verify all component secret references exist, and ensure no port conflicts exist between the app and Dapr's default ports.
