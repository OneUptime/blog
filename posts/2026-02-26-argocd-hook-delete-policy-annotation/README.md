# How to Use the argocd.argoproj.io/hook-delete-policy Annotation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Sync Hooks, Resource Cleanup

Description: Learn how to use the ArgoCD hook-delete-policy annotation to manage cleanup of sync hook resources, prevent Job accumulation, and control hook lifecycle behavior.

---

Every time ArgoCD runs a sync hook (a PreSync, PostSync, or SyncFail Job), it creates a Kubernetes resource. Without a delete policy, these resources accumulate in your cluster. After 50 deployments, you have 50 completed migration Jobs, 50 smoke test Jobs, and 50 notification Jobs cluttering your namespace. The `argocd.argoproj.io/hook-delete-policy` annotation controls when these hook resources are cleaned up.

## Available delete policies

ArgoCD supports three hook delete policies:

```yaml
# Policy 1: Delete before creating a new instance
argocd.argoproj.io/hook-delete-policy: BeforeHookCreation

# Policy 2: Delete after the hook succeeds
argocd.argoproj.io/hook-delete-policy: HookSucceeded

# Policy 3: Delete after the hook fails
argocd.argoproj.io/hook-delete-policy: HookFailed
```

You can combine multiple policies:

```yaml
# Delete if succeeded OR before creating a new one
argocd.argoproj.io/hook-delete-policy: HookSucceeded,BeforeHookCreation

# Delete regardless of result
argocd.argoproj.io/hook-delete-policy: HookSucceeded,HookFailed
```

## BeforeHookCreation

This is the most commonly used policy. ArgoCD deletes the previous instance of the hook before creating a new one during the next sync.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: myorg/app:v1.2.3
          command: ["./migrate", "up"]
      restartPolicy: Never
  backoffLimit: 3
```

**Behavior:**
1. First sync: Job `db-migrate` is created and runs
2. Job completes (success or failure)
3. Job remains in the cluster
4. Next sync: ArgoCD deletes the old `db-migrate` Job, then creates a new one

**Pros:**
- The last hook result is always visible in the cluster for debugging
- Clean state before each new run
- Works well with Jobs that need unique names per run

**Cons:**
- One stale hook resource always exists between syncs

**Best for:** Database migrations, data seeding, any hook where you want to see the result of the last run.

## HookSucceeded

ArgoCD deletes the hook resource immediately after it completes successfully.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: smoke-test
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: test
          image: myorg/test-runner:latest
          command: ["./run-smoke-tests.sh"]
      restartPolicy: Never
  backoffLimit: 2
```

**Behavior:**
1. Sync completes, PostSync hook runs
2. Hook succeeds: Job is deleted immediately
3. Hook fails: Job remains in the cluster for debugging

**Pros:**
- No clutter from successful hooks
- Failed hooks remain for investigation
- Clean namespace after successful deployments

**Cons:**
- No history of successful runs (check ArgoCD audit logs instead)

**Best for:** Smoke tests, notifications, cache warming - any hook where you only care about failures.

## HookFailed

ArgoCD deletes the hook resource if it fails. Successful hooks remain.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: deploy-report
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookFailed
spec:
  template:
    spec:
      containers:
        - name: report
          image: myorg/reporter:latest
          command: ["./generate-deploy-report.sh"]
      restartPolicy: Never
```

**Behavior:**
1. Hook succeeds: Job remains for audit/reference
2. Hook fails: Job is deleted immediately

**Pros:**
- Successful runs preserved for auditing
- Failed runs cleaned up automatically

**Cons:**
- Accumulates successful hook Jobs over time if not combined with BeforeHookCreation

**Best for:** Audit-sensitive hooks where you need proof of successful execution but do not care about failed attempts.

## Combining policies

The real power comes from combining policies for specific behaviors:

### Clean state, no accumulation

```yaml
# Delete the old hook AND delete after success
annotations:
  argocd.argoproj.io/hook-delete-policy: BeforeHookCreation,HookSucceeded
```

Behavior: Old hook is deleted before creating a new one. If the new hook succeeds, it is also deleted. Only failed hooks remain visible.

### Complete cleanup

```yaml
# Delete on success AND failure
annotations:
  argocd.argoproj.io/hook-delete-policy: HookSucceeded,HookFailed
```

Behavior: Hook is deleted regardless of outcome. Nothing remains in the cluster. Use this for hooks where you handle results through external systems (logging, metrics).

### Maximum information retention

```yaml
# Only delete before re-creation
annotations:
  argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
```

Behavior: Exactly one instance of the hook always exists in the cluster - either running or completed. Provides maximum debugging information.

## Policy recommendations by hook type

### Database migrations

```yaml
# Keep last migration result for debugging
# Clean up before running next migration
annotations:
  argocd.argoproj.io/hook: PreSync
  argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
```

Why: If a migration fails, you want the Job and its logs in the cluster for investigation. BeforeHookCreation ensures the old Job is removed before the next sync attempt.

### Smoke tests

```yaml
# Clean up successful tests, keep failures
annotations:
  argocd.argoproj.io/hook: PostSync
  argocd.argoproj.io/hook-delete-policy: HookSucceeded
```

Why: Successful smoke tests are not interesting - you only care about failures. HookSucceeded removes the clutter while preserving failed test Jobs for debugging.

### Notifications

```yaml
# Clean up everything - notifications are fire-and-forget
annotations:
  argocd.argoproj.io/hook: PostSync
  argocd.argoproj.io/hook-delete-policy: HookSucceeded,HookFailed
```

Why: Notification hooks either send the message or they do not. Either way, the Job is not useful for debugging since the notification system has its own logs.

### SyncFail cleanup

```yaml
# Delete failure alerts after they run
annotations:
  argocd.argoproj.io/hook: SyncFail
  argocd.argoproj.io/hook-delete-policy: HookSucceeded,BeforeHookCreation
```

Why: SyncFail hooks are alerts. Once the alert is sent (HookSucceeded), delete it. If a new sync failure occurs, clean up the old alert Job first (BeforeHookCreation).

### Data seeding

```yaml
# Keep the last seed result for verification
annotations:
  argocd.argoproj.io/hook: Sync
  argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
```

Why: Data seeding Jobs may need inspection to verify what data was loaded. Keep the last result available.

## What happens without a delete policy

If you omit the `hook-delete-policy` annotation entirely:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: my-hook
  annotations:
    argocd.argoproj.io/hook: PostSync
    # No hook-delete-policy!
spec:
  # ...
```

The default behavior is `BeforeHookCreation`. ArgoCD will delete the previous hook resource before creating a new one on the next sync. This is a reasonable default, but it is better to be explicit.

## Dealing with hook resource accumulation

If you already have accumulated hook resources:

```bash
# Find all hook Jobs in a namespace
kubectl get jobs -n my-app -o json | \
  jq '.items[] | select(.metadata.annotations["argocd.argoproj.io/hook"] != null) | {name: .metadata.name, status: .status.conditions[0].type}'

# Clean up completed hook Jobs
kubectl get jobs -n my-app -o json | \
  jq -r '.items[] | select(.metadata.annotations["argocd.argoproj.io/hook"] != null) | select(.status.conditions[]?.type == "Complete") | .metadata.name' | \
  xargs -I {} kubectl delete job {} -n my-app

# Clean up failed hook Jobs
kubectl get jobs -n my-app -o json | \
  jq -r '.items[] | select(.metadata.annotations["argocd.argoproj.io/hook"] != null) | select(.status.conditions[]?.type == "Failed") | .metadata.name' | \
  xargs -I {} kubectl delete job {} -n my-app
```

Set up automatic TTL for Jobs as an additional safety net:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: smoke-test
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  ttlSecondsAfterFinished: 3600  # Kubernetes deletes after 1 hour
  template:
    spec:
      containers:
        - name: test
          image: myorg/test-runner:latest
      restartPolicy: Never
```

The `ttlSecondsAfterFinished` field is a Kubernetes-native feature that works as a secondary cleanup mechanism, catching any Jobs that ArgoCD's delete policy missed.

## Debugging delete policy issues

```bash
# Check if a hook was supposed to be deleted
kubectl get job my-hook -n my-app -o jsonpath='{.metadata.annotations}'

# Check ArgoCD sync result for hook status
argocd app get my-app -o json | \
  jq '.status.operationState.syncResult.resources[] | select(.hookType != null)'

# Check ArgoCD controller logs for deletion errors
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-application-controller \
  --since=30m | grep "hook" | grep -i "delete"
```

## Summary

The `argocd.argoproj.io/hook-delete-policy` annotation is essential for keeping your cluster clean when using sync hooks. Use `BeforeHookCreation` for hooks where you want to see the last result (migrations, data seeding). Use `HookSucceeded` for hooks where only failures matter (smoke tests). Use `HookSucceeded,HookFailed` for fire-and-forget hooks (notifications). Always be explicit about the delete policy rather than relying on defaults, and use Kubernetes `ttlSecondsAfterFinished` as a secondary cleanup mechanism for defense in depth.
