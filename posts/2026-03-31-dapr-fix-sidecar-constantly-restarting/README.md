# How to Fix Dapr Sidecar Constantly Restarting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Troubleshooting, Sidecar, Restart, Kubernetes

Description: Learn how to diagnose and fix Dapr sidecars that keep crashing and restarting, including OOM kills, component failures, and configuration errors.

---

## Overview

A continuously restarting Dapr sidecar prevents your application from working correctly, as the application loses Dapr capabilities during each restart cycle. The root causes range from OOM kills and component connection failures to configuration errors and certificate issues.

## Step 1: Check Restart Count and Reason

```bash
# Check restart count
kubectl get pods -l app=myservice -o wide
# RESTARTS column shows restart count

# Get the reason for the last crash
kubectl describe pod <pod-name> | grep -A10 "daprd" | grep -A5 "Last State"
```

Common exit codes:
- `OOMKilled`: Sidecar ran out of memory
- `Error` / `Exit Code 1`: Configuration or component initialization failure
- `Exit Code 137`: SIGKILL, often accompanies OOMKilled or forced pod deletion
- `Exit Code 143`: SIGTERM, graceful shutdown requested by Kubernetes

## Step 2: Examine Sidecar Logs

Get logs from the previous (crashed) container instance:

```bash
kubectl logs <pod-name> -c daprd --previous
```

Look for initialization errors:

```bash
kubectl logs <pod-name> -c daprd --previous | grep -E "error|fatal|panic|failed"
```

## Step 3: Diagnose OOM Kills

If the restart reason is `OOMKilled`, increase the memory limit:

```yaml
annotations:
  dapr.io/sidecar-memory-limit: "256Mi"  # Increase from default
  dapr.io/sidecar-memory-request: "128Mi"
```

Also tune Go GC to prevent heap growth:

```yaml
annotations:
  dapr.io/env: "GOMEMLIMIT=200MiB,GOGC=50"
```

## Step 4: Fix Component Initialization Failures

Component failures at startup cause immediate crashes. Check the specific component:

```bash
kubectl logs <pod-name> -c daprd --previous | grep "component"
# Example: "failed to init component redis-state: dial tcp redis:6379: connection refused"
```

Fix the underlying component issue:

```bash
# Verify Redis is accessible from the pod (exec into app container, as daprd uses a distroless image)
kubectl exec -it <pod-name> -c myapp -- \
  nc -zv redis 6379

# If unreachable, check Redis deployment
kubectl get pods -l app=redis
kubectl describe service redis
```

## Step 5: Fix Certificate Issues

Certificate-related crashes appear in logs as:

```text
level=error msg="failed to initialize security: failed to request cert..."
```

Check Sentry health:

```bash
kubectl get pods -n dapr-system | grep sentry
kubectl logs -n dapr-system -l app=dapr-sentry --tail=20
```

Verify Sentry is reachable:

```bash
kubectl exec -it <pod-name> -c myapp -- \
  nc -zv dapr-sentry.dapr-system.svc.cluster.local 443
```

## Step 6: Check for Configuration Errors

Invalid Configuration resources cause sidecar crashes:

```bash
# Validate your Configuration resource
kubectl get configuration -n default
kubectl describe configuration myconfig

# Check for YAML syntax errors
kubectl apply --dry-run=client -f config.yaml
```

## Step 7: Enable Debug Logging

For hard-to-diagnose crashes, enable debug logging:

```yaml
annotations:
  dapr.io/log-level: "debug"
```

Then watch the sidecar startup sequence:

```bash
kubectl logs -f <pod-name> -c daprd
```

## Preventing Future Restarts

Add a startup probe so Kubernetes waits for the sidecar to initialize:

```yaml
spec:
  containers:
  - name: myapp
    startupProbe:
      httpGet:
        path: /healthz
        port: 8080
      failureThreshold: 30
      periodSeconds: 5
```

## Summary

Dapr sidecar restarts are diagnosed by checking the crash reason (OOMKilled, exit codes), examining previous container logs, and tracing failures to component connectivity, certificate acquisition, or configuration errors. Fix OOM kills by increasing memory limits and tuning Go GC, fix component failures by verifying backend connectivity, and fix certificate issues by ensuring Sentry is healthy and reachable.
