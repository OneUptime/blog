# How to Handle HelmRelease Pre-Delete Hook Failures in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, HelmRelease, Kubernetes, GitOps, Helm, Hooks, Pre-Delete, Troubleshooting

Description: Learn how to diagnose and resolve pre-delete hook failures that prevent HelmRelease uninstallation in Flux CD.

---

## Introduction

Helm hooks are a powerful mechanism that allows chart authors to run specific actions at different points in a release lifecycle. Pre-delete hooks execute before a Helm release is uninstalled, commonly used for tasks like backing up data, draining connections, or cleaning up external resources. When these hooks fail, the entire uninstall operation is blocked, leaving the release in a stuck state.

In a Flux-managed environment, pre-delete hook failures are particularly problematic because they can prevent the Helm Controller from completing remediation actions. If your HelmRelease is configured to uninstall on failure, a failing pre-delete hook creates a deadlock where the release cannot be upgraded and cannot be uninstalled.

This guide covers how to diagnose pre-delete hook failures, work around them, and configure your HelmRelease to handle them gracefully.

## Prerequisites

Before proceeding, you need:

- A Kubernetes cluster with Flux CD installed
- kubectl access to the cluster
- Understanding of Helm hook types and their behavior
- Basic experience with HelmRelease troubleshooting

## Understanding Pre-Delete Hooks

Pre-delete hooks are Kubernetes resources (usually Jobs or Pods) annotated with `helm.sh/hook: pre-delete`. When Helm begins an uninstall operation, it creates these resources and waits for them to complete successfully before proceeding with the deletion of the release's resources.

Common pre-delete hook use cases include:

- Database backup jobs that export data before an application is removed
- Deregistration scripts that remove a service from a service mesh or load balancer
- Cleanup jobs that remove external resources like cloud storage buckets or DNS records

If the hook Job fails (exits with a non-zero code) or times out, Helm aborts the uninstall and reports a failure.

## Diagnosing Pre-Delete Hook Failures

First, check the HelmRelease status:

```bash
kubectl get helmrelease my-app -n production -o yaml
```

Look for error messages referencing hook failures. Then check for hook-created resources:

```bash
kubectl get jobs -n production -l app.kubernetes.io/managed-by=Helm
kubectl get pods -n production -l app.kubernetes.io/managed-by=Helm --field-selector=status.phase=Failed
```

Inspect the logs of the failed hook Job:

```bash
kubectl logs job/my-app-pre-delete -n production
```

Common failure causes include:

- The hook references a database or service that is no longer available
- The hook container image cannot be pulled
- RBAC permissions are insufficient for the hook's operations
- The hook exceeds its deadline or timeout

## Solution 1: Disable Hooks During Uninstall

The most direct solution is to configure the HelmRelease to skip hooks during uninstall:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: production
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      version: "2.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  uninstall:
    disableHooks: true
    timeout: 5m
```

With `disableHooks: true`, Helm skips all pre-delete and post-delete hooks when uninstalling the release. This bypasses the failing hook entirely.

## Solution 2: Fix the Hook and Retry

If the pre-delete hook performs an important function, fix the underlying issue rather than disabling it. Identify the failure from the Job logs and address it:

```bash
# Check why the hook failed
kubectl describe job my-app-pre-delete -n production
kubectl logs job/my-app-pre-delete -n production

# Clean up the failed hook resources
kubectl delete job my-app-pre-delete -n production

# Trigger a new reconciliation
flux reconcile helmrelease my-app -n production
```

## Solution 3: Manually Delete Hook Resources and Uninstall

If the hook has already been created and is blocking the uninstall, you can manually clean up and retry:

```bash
# Suspend the HelmRelease
flux suspend helmrelease my-app -n production

# Delete the stuck hook resources
kubectl delete job my-app-pre-delete -n production --force --grace-period=0

# Use Helm CLI to force uninstall without hooks
helm uninstall my-app -n production --no-hooks

# Resume the HelmRelease for a fresh install
flux resume helmrelease my-app -n production
```

## Solution 4: Configure Hook Timeout and Delete Policy

For charts you maintain, configure the hook with appropriate timeout and delete policies:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: "{{ .Release.Name }}-pre-delete"
  annotations:
    helm.sh/hook: pre-delete
    helm.sh/hook-weight: "-5"
    helm.sh/hook-delete-policy: before-hook-creation,hook-succeeded,hook-failed
spec:
  backoffLimit: 1
  activeDeadlineSeconds: 120
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: cleanup
          image: my-cleanup-tool:latest
          command: ["/bin/sh", "-c", "cleanup.sh || true"]
```

The `hook-delete-policy: hook-failed` ensures the hook Job is cleaned up even if it fails. The `|| true` in the command prevents a non-zero exit code from blocking the uninstall.

## Comprehensive HelmRelease Configuration

Here is a production-ready HelmRelease that handles pre-delete hook failures gracefully:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: production
spec:
  interval: 5m
  timeout: 15m
  chart:
    spec:
      chart: my-app
      version: "2.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  install:
    disableHooks: false
    remediation:
      retries: 3
  upgrade:
    disableHooks: false
    remediation:
      retries: 3
      strategy: rollback
  uninstall:
    disableHooks: true
    timeout: 5m
    keepHistory: false
```

This configuration runs hooks during install and upgrade but disables them during uninstall, preventing hook failures from blocking cleanup operations.

## Conclusion

Pre-delete hook failures can block HelmRelease uninstallation and create deadlock situations in Flux CD. The most effective approach is to configure `disableHooks: true` in the uninstall section of your HelmRelease, especially for releases where the pre-delete hook is not critical. For hooks that perform essential cleanup, ensure they have proper timeout settings, delete policies, and error handling. When stuck, manually deleting the hook resources and forcing an uninstall with the Helm CLI is a reliable last resort.
