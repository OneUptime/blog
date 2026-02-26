# ArgoCD Runbook: Controller Not Processing Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Runbook, Troubleshooting

Description: A step-by-step operational runbook for diagnosing and fixing an ArgoCD application controller that has stopped processing applications, covering resource exhaustion, leader election, and connectivity issues.

---

When the ArgoCD application controller stops processing applications, the entire GitOps pipeline grinds to a halt. Applications stop syncing, drift goes undetected, and the UI shows stale information. This is typically a P1 incident because it affects every application managed by ArgoCD. This runbook guides you through systematic diagnosis and resolution.

## Symptoms

- All applications show stale sync timestamps (last synced minutes or hours ago)
- New commits to Git repositories are not detected
- Manual sync requests from the UI or CLI do not start
- The ArgoCD UI shows applications but status updates have stopped
- Prometheus alerts fire for `argocd_app_reconcile_pending` being consistently high

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
kubectl logs -n argocd deployment/argocd-application-controller --tail=200

# Look for specific error patterns
kubectl logs -n argocd deployment/argocd-application-controller --tail=500 | grep -i "error\|fatal\|panic\|timeout\|refused"

# Check for leader election issues (if running multiple replicas)
kubectl logs -n argocd deployment/argocd-application-controller --tail=500 | grep -i "leader\|election"
```

### Step 3: Check Resource Usage

```bash
# Check current CPU and memory
kubectl top pods -n argocd -l app.kubernetes.io/name=argocd-application-controller

# Check resource limits
kubectl get deployment argocd-application-controller -n argocd -o jsonpath='{.spec.template.spec.containers[0].resources}' | jq .

# Check if the pod was recently OOMKilled
kubectl get events -n argocd --field-selector reason=OOMKilling --sort-by='.lastTimestamp'
```

### Step 4: Check Redis Connectivity

The controller depends on Redis for caching. If Redis is down, the controller may freeze or crash.

```bash
# Check Redis pod
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-redis

# Test Redis connectivity from within the cluster
kubectl exec -n argocd deployment/argocd-redis -- redis-cli ping
# Should output: PONG

# Check Redis memory
kubectl exec -n argocd deployment/argocd-redis -- redis-cli info memory | grep used_memory_human
```

### Step 5: Check Kubernetes API Server Connectivity

The controller needs to reach the Kubernetes API server to compare live state.

```bash
# Check if the controller can reach the API server
kubectl exec -n argocd deployment/argocd-application-controller -- wget -qO- https://kubernetes.default.svc/healthz --no-check-certificate

# Check for API server throttling
kubectl logs -n argocd deployment/argocd-application-controller --tail=200 | grep -i "throttl\|rate.limit\|429"
```

### Step 6: Check Leader Election (Sharded Setup)

If you run multiple controller replicas with sharding, check leader election status.

```bash
# Check the leader election lease
kubectl get lease -n argocd

# Check which pod is the leader
kubectl get lease argocd-application-controller -n argocd -o jsonpath='{.spec.holderIdentity}'

# If no leader is elected, all replicas will log:
# "attempting to acquire leader lease"
```

## Root Causes and Resolutions

### Cause 1: Out of Memory (OOMKill)

The controller was killed by the OOM killer and cannot stay running with current memory limits.

```bash
# Check for OOMKill
kubectl get events -n argocd --field-selector reason=OOMKilling

# Immediate fix: increase memory limits
kubectl patch deployment argocd-application-controller -n argocd --type='json' \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value": "8Gi"}]'

# Wait for rollout
kubectl rollout status deployment/argocd-application-controller -n argocd
```

For a permanent fix, either increase memory limits in your Helm values or ArgoCD installation manifests, or enable controller sharding to distribute the load.

### Cause 2: Redis Connection Failure

The controller cannot connect to Redis, causing it to hang or crash.

```bash
# Restart Redis
kubectl rollout restart deployment/argocd-redis -n argocd
kubectl rollout status deployment/argocd-redis -n argocd

# Then restart the controller
kubectl rollout restart deployment/argocd-application-controller -n argocd
kubectl rollout status deployment/argocd-application-controller -n argocd
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
kubectl logs -n argocd deployment/argocd-application-controller --tail=500 | grep "Throttling"

# Reduce controller's API server load
# Option 1: Reduce status processors
kubectl patch deployment argocd-application-controller -n argocd --type='json' \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/args", "value": ["/usr/local/bin/argocd-application-controller", "--status-processors=20", "--operation-processors=10"]}]'

# Option 2: Increase reconciliation interval
kubectl patch configmap argocd-cm -n argocd --type merge \
  -p='{"data":{"timeout.reconciliation":"300"}}'
```

### Cause 4: Leader Election Stuck

In a sharded setup, if the current leader crashes without releasing the lease, a new leader may take time to be elected.

```bash
# Check lease status
kubectl get lease argocd-application-controller -n argocd -o yaml

# If the lease holder is a dead pod, delete the lease to force re-election
kubectl delete lease argocd-application-controller -n argocd

# Wait for a new leader to be elected (usually within 15 seconds)
sleep 20
kubectl get lease argocd-application-controller -n argocd -o jsonpath='{.spec.holderIdentity}'
```

### Cause 5: Too Many Applications

The controller simply cannot process all applications within the reconciliation interval.

```bash
# Check how many apps exist
argocd app list | wc -l

# Check the reconciliation queue depth
# If using Prometheus:
# argocd_app_reconcile_pending > 100 is concerning

# Enable sharding
kubectl patch deployment argocd-application-controller -n argocd --type='json' \
  -p='[{"op": "replace", "path": "/spec/replicas", "value": 3}]'

# Set the ARGOCD_CONTROLLER_REPLICAS environment variable
kubectl set env deployment/argocd-application-controller -n argocd ARGOCD_CONTROLLER_REPLICAS=3
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
kubectl logs -n argocd deployment/argocd-application-controller --tail=20 -f

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

- Collect a goroutine dump: `kubectl exec -n argocd deployment/argocd-application-controller -- curl localhost:8082/debug/pprof/goroutine?debug=2 > goroutine-dump.txt`
- Check the ArgoCD GitHub issues for similar reports
- Escalate to the platform engineering team with logs and the goroutine dump
