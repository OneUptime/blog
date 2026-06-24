# ArgoCD Runbook: Controller Not Processing Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Runbook, Troubleshooting

Description: A step-by-step operational runbook for diagnosing and fixing an ArgoCD application controller that has stopped processing applications, covering resource exhaustion, leader election.

---

When the ArgoCD application controller stops processing applications, the entire GitOps pipeline grinds to a halt. Applications stop syncing, drift goes undetected, and the UI shows stale information. This is typically a P1 incident because it affects every application managed by ArgoCD. This runbook guides you through systematic diagnosis and resolution.

## Symptoms

- All applications show stale sync timestamps (last synced minutes or hours ago)
- New commits to Git repositories are not detected
- Manual sync requests from the UI or CLI do not start
- The ArgoCD UI shows applications but status updates have stopped
- Prometheus alerts fire for `argocd_app_reconcile` latency or `argocd_cluster_cache_age_seconds` being consistently high

## Impact Assessment

**Severity:** P1

**Impact:** All GitOps-managed applications are affected. No automatic syncs, no drift detection, no self-healing. Manual kubectl deployment is the only workaround.

## Diagnostic Steps

### Step 1: Check Controller Pod Status

```bash
# Check if the controller pod is running

kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-application-controller

# Expected output: pod should be Running with 0 restarts
# If it shows CrashLoopBackOff, Pending, or many restarts, that's the issue

# Check pod events
kubectl describe pod -n argocd -l app.kubernetes.io/name=argocd-application-controller | tail -30
```

### Step 2: Check Controller Logs

```bash
# Get recent controller logs
kubectl logs -n argocd statefulset/argocd-application-controller --tail=200

# Look for specific error patterns
kubectl logs -n argocd statefulset/argocd-application-controller --tail=500 | grep -i "error\|fatal\|panic\|timeout\|refused"

# Check for sharding issues (if running multiple replicas)
kubectl logs -n argocd statefulset/argocd-application-controller --tail=500 | grep -i "shard\|cluster"
```

### Step 3: Check Resource Usage

```bash
# Check current CPU and memory
kubectl top pods -n argocd -l app.kubernetes.io/name=argocd-application-controller

# Check resource limits
kubectl get statefulset argocd-application-controller -n argocd -o jsonpath='{.spec.template.spec.containers[0].resources}' | jq .

# Check if the pod was recently OOMKilled
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-application-controller \
  -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.status.containerStatuses[*].lastState.terminated.reason}{"\n"}{end}'
```

### Step 4: Check Redis Connectivity

The controller uses Redis for caching. If Redis is down, the controller may log Redis errors and fail to refresh cached state.

```bash
# Check Redis pod
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-redis

# Test Redis connectivity from within the cluster
kubectl exec -n argocd deployment/argocd-redis -- redis-cli ping
# Should output: PONG

# Check Redis memory
kubectl exec -n argocd deployment/argocd-redis -- redis-cli info memory | grep used_memory_human
```

### Step 5: Check Kubernetes API Server Access

The controller needs to reach the Kubernetes API server to compare live state.

```bash
# Check if the controller service account has expected API access
kubectl auth can-i list pods \
  --as=system:serviceaccount:argocd:argocd-application-controller

# Check for API server throttling
kubectl logs -n argocd statefulset/argocd-application-controller --tail=200 | grep -i "throttl\|rate.limit\|429"
```

### Step 6: Check Shard Configuration

If you run multiple controller replicas with sharding, check that the StatefulSet replica count matches `ARGOCD_CONTROLLER_REPLICAS`.

```bash
# Check the controller replica count
kubectl get statefulset argocd-application-controller -n argocd -o jsonpath='{.spec.replicas}'

# Check the configured controller replica count
kubectl get statefulset argocd-application-controller -n argocd \
  -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="ARGOCD_CONTROLLER_REPLICAS")].value}'

# Check for shard assignment messages
kubectl logs -n argocd statefulset/argocd-application-controller --tail=500 | grep -i "shard"
```

## Root Causes and Resolutions

### Cause 1: Out of Memory (OOMKill)

The controller was killed by the OOM killer and cannot stay running with current memory limits.

```bash
# Check for OOMKill
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-application-controller \
  -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.status.containerStatuses[*].lastState.terminated.reason}{"\n"}{end}'

# Immediate fix: increase memory limits
kubectl set resources statefulset/argocd-application-controller -n argocd --limits=memory=8Gi

# Wait for rollout
kubectl rollout status statefulset/argocd-application-controller -n argocd
```

For a permanent fix, either increase memory limits in your Helm values or ArgoCD installation manifests, or enable controller sharding to distribute the load.

### Cause 2: Redis Connection Failure

The controller cannot connect to Redis, causing it to hang or crash.

```bash
# Restart Redis
kubectl rollout restart deployment/argocd-redis -n argocd
kubectl rollout status deployment/argocd-redis -n argocd

# Then restart the controller
kubectl rollout restart statefulset/argocd-application-controller -n argocd
kubectl rollout status statefulset/argocd-application-controller -n argocd
```

If Redis keeps crashing, check its memory limits and eviction policy.

```bash
# Check Redis configuration
kubectl exec -n argocd deployment/argocd-redis -- redis-cli config get maxmemory
kubectl exec -n argocd deployment/argocd-redis -- redis-cli config get maxmemory-policy
```

### Cause 3: API Server Throttling

The Kubernetes API server is throttling the controller's requests, causing it to fall behind.

```bash
# Check for throttling messages in logs
kubectl logs -n argocd statefulset/argocd-application-controller --tail=500 | grep "Throttling"

# Reduce controller's API server load
# Option 1: Reduce status processors
kubectl patch configmap argocd-cmd-params-cm -n argocd --type merge \
  -p='{"data":{"controller.status.processors":"10","controller.operation.processors":"5"}}'
kubectl rollout restart statefulset/argocd-application-controller -n argocd

# Option 2: Increase reconciliation interval
kubectl patch configmap argocd-cm -n argocd --type merge \
  -p='{"data":{"timeout.reconciliation":"5m"}}'
```

### Cause 4: Shard Configuration Mismatch

In a sharded setup, if the StatefulSet replica count and `ARGOCD_CONTROLLER_REPLICAS` do not match, clusters may not be assigned to the expected controller shard.

```bash
# Check replica and shard configuration
kubectl get statefulset argocd-application-controller -n argocd -o jsonpath='{.spec.replicas}'
kubectl get statefulset argocd-application-controller -n argocd \
  -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="ARGOCD_CONTROLLER_REPLICAS")].value}'

# Make them match
kubectl patch statefulset argocd-application-controller -n argocd --type='json' \
  -p='[{"op": "replace", "path": "/spec/replicas", "value": 3}]'
kubectl set env statefulset/argocd-application-controller -n argocd ARGOCD_CONTROLLER_REPLICAS=3

# Wait for rollout
kubectl rollout status statefulset/argocd-application-controller -n argocd
```

### Cause 5: Too Many Applications or Clusters

The controller simply cannot process all applications within the reconciliation interval. If the load spans multiple managed clusters, sharding can distribute clusters across controller replicas.

```bash
# Check how many apps exist
argocd app list | wc -l

# Check the reconciliation queue depth
# If using Prometheus:
# sustained high argocd_app_reconcile latency is concerning

# Enable sharding
kubectl patch statefulset argocd-application-controller -n argocd --type='json' \
  -p='[{"op": "replace", "path": "/spec/replicas", "value": 3}]'

# Set the ARGOCD_CONTROLLER_REPLICAS environment variable
kubectl set env statefulset/argocd-application-controller -n argocd ARGOCD_CONTROLLER_REPLICAS=3
```

### Cause 6: Corrupt Application State

Rarely, an application's state in Kubernetes can become corrupt, causing the controller to crash when processing it.

```bash
# Check for applications with unusual state
kubectl get applications -n argocd -o json | jq '.items[] | select(.status.sync.status == null) | .metadata.name'

# If a specific app is corrupt, try refreshing it
argocd app get <app-name> --hard-refresh

# If that fails, delete and recreate the application
argocd app delete <app-name> --cascade=false  # Delete without pruning resources
# Then recreate from the Application manifest
kubectl apply -f application.yaml
```

## Verification

After applying a fix, verify the controller is processing applications.

```bash
# Check the controller is running
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-application-controller

# Check that applications are being reconciled
# The "Last Synced" timestamps should be recent
argocd app list | head -10

# Watch the controller logs for normal operation
kubectl logs -n argocd statefulset/argocd-application-controller --tail=20 -f

# Trigger a manual sync to verify end-to-end
argocd app sync <test-app-name>
```

## Post-Incident Actions

1. Review controller resource limits and adjust if the cause was OOMKill
2. Check if controller sharding would prevent a recurrence
3. Add Prometheus alerts for controller health if not already present
4. Update the monitoring dashboard with controller-specific panels
5. Document the root cause and resolution in your incident tracker

## Escalation

If the controller does not recover after a restart and the above diagnostic steps do not identify the cause:

- If controller profiling is enabled, collect a goroutine dump: `kubectl exec -n argocd statefulset/argocd-application-controller -- curl localhost:8082/debug/pprof/goroutine?debug=2 > goroutine-dump.txt`
- Check the ArgoCD GitHub issues for similar reports
- Escalate to the platform engineering team with logs and the goroutine dump
