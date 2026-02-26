# How to Configure Hook Delete Policies in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Sync Hooks, Resource Lifecycle

Description: Learn how to configure hook delete policies in ArgoCD to control when and how hook resources like Jobs and Pods are cleaned up after sync operations.

---

When ArgoCD runs sync hooks (PreSync, PostSync, SyncFail), it creates Kubernetes resources like Jobs and Pods. After these hooks complete, the resources remain in the cluster by default. Over time, this leads to hundreds of completed Jobs cluttering your namespaces. Hook delete policies tell ArgoCD when to clean up these resources automatically.

ArgoCD supports three hook delete policies: `HookSucceeded`, `HookFailed`, and `BeforeHookCreation`. Each controls a different cleanup scenario, and you can combine them for comprehensive lifecycle management.

## The Three Delete Policies

### HookSucceeded

Deletes the hook resource after it completes successfully. If the hook fails, the resource is preserved for debugging.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
```

**Behavior:**
- Hook succeeds: Resource is deleted immediately
- Hook fails: Resource remains in the cluster

This is the most common policy. It keeps your cluster clean while preserving failed hooks for investigation.

### HookFailed

Deletes the hook resource after it fails. If the hook succeeds, the resource remains.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: notification
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookFailed
```

**Behavior:**
- Hook succeeds: Resource remains in the cluster
- Hook fails: Resource is deleted immediately

This is less common. You might use it when you want to keep successful hook results for auditing but do not care about failed attempts.

### BeforeHookCreation

Deletes any existing hook resource with the same name before creating a new one. This happens at the start of each sync, before the hook runs.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
```

**Behavior:**
- Before each sync: Delete the existing hook resource (if any), then create a new one
- After the hook completes: Resource remains in the cluster until the next sync

This is useful when you want exactly one instance of the hook resource in the cluster at any time, and you want to inspect the most recent run.

## Combining Delete Policies

You can specify multiple delete policies separated by commas:

```yaml
annotations:
  argocd.argoproj.io/hook-delete-policy: HookSucceeded, BeforeHookCreation
```

This means:
- If the hook succeeds, delete it immediately
- If it fails, keep it until the next sync (when BeforeHookCreation cleans it up)

This combination is arguably the best general-purpose policy. Successful hooks are cleaned up right away, and failed hooks stick around for debugging but are automatically cleaned up before the next sync attempt.

## Default Behavior (No Delete Policy)

If you do not specify a hook delete policy, the hook resource is never automatically deleted by ArgoCD. It stays in the cluster until you manually delete it or until namespace cleanup.

```yaml
# No delete policy - hook resources accumulate
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate-v42
  annotations:
    argocd.argoproj.io/hook: PreSync
    # No hook-delete-policy annotation
```

This is rarely what you want. Without a delete policy, you will end up with dozens of completed Jobs:

```bash
# After many syncs without delete policy
kubectl get jobs -n my-app
# NAME              COMPLETIONS   DURATION   AGE
# db-migrate-v39    1/1           12s        7d
# db-migrate-v40    1/1           11s        5d
# db-migrate-v41    0/1           3d         3d
# db-migrate-v42    1/1           13s        1h
```

## Policy Comparison Table

| Scenario | HookSucceeded | HookFailed | BeforeHookCreation | None |
|----------|:---:|:---:|:---:|:---:|
| Hook succeeds | Deleted | Kept | Kept until next sync | Kept forever |
| Hook fails | Kept | Deleted | Kept until next sync | Kept forever |
| Before next sync | N/A | N/A | Deleted | N/A |

## Practical Examples

### Migration Hook (Keep Failures for Debugging)

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
  annotations:
    argocd.argoproj.io/hook: PreSync
    # Delete on success, keep on failure for debugging
    # Clean up failed ones before next sync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded, BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: myorg/api:latest
          command: ["python", "manage.py", "migrate"]
      restartPolicy: Never
  backoffLimit: 3
```

### Notification Hook (Non-Critical, Always Clean Up)

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: deploy-notify
  annotations:
    argocd.argoproj.io/hook: PostSync
    # Always clean up - notifications are not worth debugging
    argocd.argoproj.io/hook-delete-policy: HookSucceeded, HookFailed
spec:
  template:
    spec:
      containers:
        - name: notify
          image: curlimages/curl:latest
          command:
            - /bin/sh
            - -c
            - |
              curl -sf -X POST "$SLACK_WEBHOOK" \
                -d '{"text":"Deploy complete"}' || true
          env:
            - name: SLACK_WEBHOOK
              valueFrom:
                secretKeyRef:
                  name: slack-webhook
                  key: url
      restartPolicy: Never
  backoffLimit: 0
```

### Audit Hook (Keep Everything)

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  # Unique name per version to prevent conflicts
  name: audit-deploy-v42
  annotations:
    argocd.argoproj.io/hook: PostSync
    # No delete policy - keep for audit trail
spec:
  template:
    spec:
      containers:
        - name: audit
          image: myorg/audit-logger:latest
          command: ["./log-deployment.sh"]
      restartPolicy: Never
  backoffLimit: 1
```

When keeping hooks for audit purposes, use unique names (with version numbers) to prevent naming conflicts across syncs.

### Smoke Test Hook (Keep Only Latest)

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: smoke-test
  annotations:
    argocd.argoproj.io/hook: PostSync
    # Keep the latest result, delete before next run
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: test
          image: myorg/smoke-tests:latest
          command: ["pytest", "-v", "smoke_tests/"]
      restartPolicy: Never
  backoffLimit: 1
  activeDeadlineSeconds: 120
```

## Cleanup Timing Details

**HookSucceeded/HookFailed**: Deletion happens immediately after ArgoCD detects the hook's completion status. This is typically within seconds of the Job completing.

**BeforeHookCreation**: Deletion happens at the beginning of the sync operation, before the hook is created. ArgoCD deletes the existing resource, waits for it to be gone, and then creates the new one.

## Troubleshooting Delete Policies

### Hooks Not Being Deleted

If hook resources are not being cleaned up:

```bash
# Check the hook annotations
kubectl get job db-migrate -n my-app -o yaml | grep -A 3 annotations

# Verify the annotation key is exact
# Must be: argocd.argoproj.io/hook-delete-policy
# Common mistakes:
# - argocd.argoproj.io/hookDeletePolicy (wrong format)
# - argocd.argoproj.io/hook-delete-policy: hooksucceeded (wrong case)
```

The values are case-sensitive: `HookSucceeded`, `HookFailed`, `BeforeHookCreation`.

### BeforeHookCreation Stuck

If BeforeHookCreation gets stuck because the old resource has a finalizer:

```bash
# Check for finalizers
kubectl get job old-hook -n my-app -o jsonpath='{.metadata.finalizers}'

# Remove finalizer if needed (carefully)
kubectl patch job old-hook -n my-app --type json -p '[{"op": "remove", "path": "/metadata/finalizers"}]'
```

### Jobs with Running Pods

If a Job still has running Pods when ArgoCD tries to delete it, the deletion waits for Pod termination. This can delay the sync:

```bash
# Check if old hook Pods are still running
kubectl get pods -n my-app -l job-name=db-migrate
```

Set `activeDeadlineSeconds` on your Jobs to prevent them from running forever.

## Recommended Policies by Use Case

| Use Case | Recommended Policy |
|----------|-------------------|
| Database migrations | HookSucceeded, BeforeHookCreation |
| Smoke tests | BeforeHookCreation |
| Notifications (non-critical) | HookSucceeded, HookFailed |
| Failure alerts | HookSucceeded, BeforeHookCreation |
| Audit logging | No delete policy (use unique names) |
| Data seeding | HookSucceeded |
| Cleanup tasks | HookSucceeded, HookFailed |

## Summary

Hook delete policies keep your cluster clean by automatically removing completed hook resources. Use `HookSucceeded` for the most common case of cleaning up after success, `BeforeHookCreation` to ensure only one instance exists, and combine them for comprehensive lifecycle management. Always specify a delete policy on your hooks - the default of keeping everything forever leads to resource accumulation that becomes a maintenance burden.

For details on specific delete policies, see our guides on [HookSucceeded](https://oneuptime.com/blog/post/2026-02-26-argocd-hooksucceeded-delete-policy/view), [HookFailed](https://oneuptime.com/blog/post/2026-02-26-argocd-hookfailed-delete-policy/view), and [BeforeHookCreation](https://oneuptime.com/blog/post/2026-02-26-argocd-beforehookcreation-delete-policy/view).
