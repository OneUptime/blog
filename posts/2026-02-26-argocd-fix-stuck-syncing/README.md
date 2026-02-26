# How to Fix ArgoCD Stuck in 'Syncing' State

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting, Sync

Description: Resolve ArgoCD applications stuck in the Syncing state by identifying blocked sync hooks, resource ordering issues, timeout misconfigurations, and controller bottlenecks.

---

When an ArgoCD application gets stuck in the "Syncing" state, it means a sync operation was started but never completed - neither successfully nor with a failure. The application just hangs indefinitely, showing a spinning sync indicator in the UI or `Syncing` status in the CLI.

This is different from a sync failure - with a failure, you get an error message and the sync terminates. A stuck sync means something is preventing the operation from completing at all.

## Diagnosing the Stuck Sync

First, gather information about what is happening:

```bash
# Check the application status
argocd app get my-app

# Look at the sync operation details
argocd app get my-app -o yaml | grep -A20 "operationState:"

# Check which resources have been synced and which are pending
argocd app resources my-app
```

Look for resources that show `OutOfSync` or `Progressing` status - these are likely the ones blocking the sync.

## Cause 1: Sync Hook Never Completes

The most common cause. If your application uses sync hooks (PreSync, PostSync), and one of those hooks never finishes, the sync operation will wait forever.

**Identify stuck hooks:**

```bash
# Look for hook resources
kubectl get jobs -n production -l argocd.argoproj.io/hook

# Check if any jobs are not completing
kubectl get jobs -n production | grep -v "1/1"
```

**Check the hook Job or Pod:**

```bash
# Get job details
kubectl describe job pre-sync-migration -n production

# Check the pod logs
kubectl logs -n production -l job-name=pre-sync-migration
```

**Common reasons hooks get stuck:**
- Database migration fails but the job keeps retrying
- Init containers waiting for a dependency that is not available
- The hook pod is in `Pending` state due to resource constraints

**Fix by terminating the stuck hook:**

```bash
# Delete the stuck hook job
kubectl delete job pre-sync-migration -n production

# The sync will either proceed or fail cleanly
```

**Prevent future issues by setting hook timeouts:**

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
  name: pre-sync-migration
spec:
  activeDeadlineSeconds: 300  # Kill the job after 5 minutes
  backoffLimit: 3             # Only retry 3 times
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migration
          image: migration-runner:latest
```

## Cause 2: Resource Health Check Never Resolves

ArgoCD waits for resources to become healthy during sync. If a Deployment never finishes rolling out, the sync waits forever.

**Find the unhealthy resource:**

```bash
# Look for resources with non-Healthy status
argocd app resources my-app | grep -v Healthy
```

**Check the specific resource:**

```bash
# Check deployment rollout status
kubectl rollout status deployment my-app -n production

# Check for stuck pods
kubectl get pods -n production | grep -v Running | grep -v Completed

# Get events for the pod
kubectl describe pod -n production -l app=my-app
```

**Common reasons resources stay unhealthy:**
- Image pull failures (wrong image tag or registry credentials)
- Insufficient resources (node cannot schedule the pod)
- Readiness probes failing
- Init containers stuck waiting
- PVC cannot bind

**Fix by addressing the underlying pod issue.** For example, if it is an image pull error:

```bash
# Check events
kubectl get events -n production --sort-by='.lastTimestamp' | grep pull
```

## Cause 3: Sync Waves Creating Deadlock

If you use sync waves, an earlier wave might block later waves:

```yaml
# Wave -1: This resource blocks wave 0
apiVersion: batch/v1
kind: Job
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
  name: setup-job
# If this job never completes, wave 0 never starts
```

**Visualize the sync wave ordering:**

```bash
# Check annotations on resources
argocd app resources my-app -o wide
```

**Fix by ensuring earlier waves can complete independently:**

```yaml
# Add activeDeadlineSeconds to Jobs in earlier waves
spec:
  activeDeadlineSeconds: 600
```

## Cause 4: Application Controller Overloaded

If the application controller is processing too many applications, your sync might be queued indefinitely:

```bash
# Check controller queue depth
kubectl logs -n argocd deployment/argocd-application-controller | \
  grep "queue" | tail -10

# Check controller resource usage
kubectl top pods -n argocd -l app.kubernetes.io/name=argocd-application-controller
```

**Scale the controller or adjust parallelism:**

```yaml
# argocd-cmd-params-cm ConfigMap
data:
  controller.status.processors: "50"
  controller.operation.processors: "25"
```

Or scale the controller replicas (with sharding):

```bash
kubectl scale statefulset argocd-application-controller -n argocd --replicas=3
```

## Cause 5: Webhook or Admission Controller Slow

If a mutating or validating webhook is slow or hanging, `kubectl apply` calls from ArgoCD will hang:

```bash
# Check for slow webhooks
kubectl get events -n production | grep -i webhook

# Check webhook configurations
kubectl get validatingwebhookconfigurations
kubectl get mutatingwebhookconfigurations
```

If a webhook service is down, all `apply` operations will timeout. Fix the webhook service or temporarily remove the failing webhook configuration.

## Cause 6: Stale Operation State

Sometimes the sync operation state gets corrupted in the ArgoCD database:

**Force terminate the sync operation:**

```bash
# Terminate the current sync
argocd app terminate-op my-app

# Wait a moment, then check status
argocd app get my-app
```

If the terminate does not work:

```bash
# Remove the operation state by patching the application
kubectl patch application my-app -n argocd \
  --type json \
  -p '[{"op": "remove", "path": "/status/operationState"}]'
```

**Warning:** Only use the patch approach as a last resort. It forcefully clears the operation state.

## Cause 7: Large Number of Resources

Applications with hundreds of resources can appear stuck because the sync takes a very long time:

```bash
# Check how many resources the application manages
argocd app resources my-app | wc -l
```

**Optimize with selective sync or splitting:**

```bash
# Sync only specific resources
argocd app sync my-app --resource :Namespace:production
argocd app sync my-app --resource apps:Deployment:my-app

# Or use ApplyOutOfSyncOnly to skip already-synced resources
```

```yaml
syncPolicy:
  syncOptions:
    - ApplyOutOfSyncOnly=true
```

## Cause 8: PodDisruptionBudget Blocking Rollout

A PDB can prevent Deployments from rolling out:

```bash
# Check PDBs
kubectl get pdb -n production

# Check if the PDB is blocking
kubectl describe pdb my-pdb -n production
```

**Fix by adjusting the PDB or performing the rollout during maintenance windows.**

## Recovery Workflow

When you find an application stuck in syncing:

```bash
# Step 1: Terminate the current operation
argocd app terminate-op my-app

# Step 2: Wait for the operation to clear
sleep 10

# Step 3: Check the application status
argocd app get my-app

# Step 4: If stuck hooks exist, clean them up
kubectl delete jobs -n production -l argocd.argoproj.io/hook

# Step 5: Fix the underlying issue (see causes above)

# Step 6: Retry the sync
argocd app sync my-app
```

## Prevention

1. **Always set `activeDeadlineSeconds` on sync hook Jobs**
2. **Configure sync retry with limits** instead of letting syncs hang:

```yaml
syncPolicy:
  retry:
    limit: 3
    backoff:
      duration: 10s
      factor: 2
      maxDuration: 5m
```

3. **Set appropriate health check timeouts** for custom resources
4. **Monitor sync duration** with Prometheus metrics: `argocd_app_sync_total` and `argocd_app_reconcile`

## Summary

An ArgoCD application stuck in Syncing state is usually caused by a hook that never completes, a resource that never becomes healthy, or a sync wave deadlock. Start by checking `argocd app resources` to find which resource is blocking the sync. Use `argocd app terminate-op` to forcefully stop the stuck operation, fix the underlying issue, and retry. Always set timeouts on sync hooks and resource health checks to prevent indefinite hangs.
