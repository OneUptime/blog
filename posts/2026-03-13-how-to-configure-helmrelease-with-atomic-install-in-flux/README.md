# How to Configure HelmRelease with atomic Install in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, HelmRelease, Kubernetes, GitOps, Helm, Rollback

Description: Learn how to configure the atomic flag in Flux HelmRelease to automatically roll back failed installations and upgrades.

---

## Introduction

In production Kubernetes environments, a failed Helm installation or upgrade can leave your cluster in a broken state with partially deployed resources. Helm has CLI flags for rollback-on-failure behavior, but Flux HelmRelease does not expose an `atomic` field in the v2 API. Instead, Flux provides remediation settings that can uninstall failed installs, roll back failed upgrades, and retry the operation through your GitOps workflow.

In this post, you will learn how to configure install and upgrade remediation in Flux HelmRelease, understand how it interacts with retry settings, and see practical examples for production deployments.

## Prerequisites

- A Kubernetes cluster supported by your installed Flux version
- Flux CD installed and bootstrapped on the cluster
- A Git repository connected to Flux
- kubectl configured to access the cluster
- Familiarity with Helm release lifecycle

## What Does Remediation Do

When remediation is enabled, Flux reacts to failed Helm install or upgrade operations according to the rules in the HelmRelease spec. If an operation fails, Flux can automatically:

1. Uninstall a failed first-time install before retrying it.
2. Roll back a failed upgrade to the last successful release state.
3. Retry the failed operation until the configured retry count is exhausted.
4. Optionally remediate the last failure when no retries remain.

Flux waits for resources to become ready by default. You can disable this behavior with `spec.install.disableWait` or `spec.upgrade.disableWait`, but for remediation to detect readiness failures you should leave waiting enabled.

## Basic Remediation Configuration

Here is a HelmRelease with remediation enabled for both install and upgrade:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: production
spec:
  interval: 30m
  timeout: 10m
  chart:
    spec:
      chart: my-app
      version: "5.x"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
      interval: 12h
  install:
    remediation:
      retries: 3
      remediateLastFailure: true
  upgrade:
    remediation:
      retries: 3
      remediateLastFailure: true
      strategy: rollback
```

The `timeout` field at the spec level is used as the default timeout for Helm actions. If resources are not ready within this timeout, Flux treats the Helm action as failed and applies the configured remediation.

## Understanding Flux Remediation

Flux has its own remediation system for failed Helm actions. It is important to understand how it works:

- **Install remediation**: Flux uninstalls the failed release between retry attempts.
- **Upgrade remediation**: Flux rolls back the failed release by default, or uninstalls it if `strategy: uninstall` is configured.
- **Flux remediation retries**: Flux retries the operation according to the `retries` count.

Here is the sequence of events for a failed upgrade with `strategy: rollback` and `retries: 3`:

1. Flux attempts the upgrade.
2. A pod fails to become ready within the timeout.
3. Flux remediates the failure by rolling back to the previous successful release.
4. Flux retries the upgrade (attempt 2 of 3).
5. If it fails again, Flux rolls back and retries once more.
6. After all retries are exhausted, Flux marks the HelmRelease as failed.

## Production Example: Web Application Deployment

Here is a production-ready HelmRelease for a web application with failure remediation:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: web-frontend
  namespace: production
spec:
  interval: 15m
  timeout: 5m
  chart:
    spec:
      chart: web-frontend
      version: "12.x"
      sourceRef:
        kind: HelmRepository
        name: internal-charts
        namespace: flux-system
      interval: 6h
  install:
    createNamespace: true
    remediation:
      retries: 3
      remediateLastFailure: true
  upgrade:
    cleanupOnFail: true
    remediation:
      retries: 3
      remediateLastFailure: true
      strategy: rollback
  values:
    replicaCount: 3
    image:
      repository: registry.example.com/web-frontend
      tag: "1.0.0"
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 256Mi
    readinessProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 10
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 15
      periodSeconds: 20
```

Key aspects of this configuration:

- `timeout: 5m` gives pods five minutes to become ready.
- `cleanupOnFail: true` allows deletion of newly created resources when an upgrade action fails.
- `strategy: rollback` tells Flux to rollback to the last successful release on failure.
- Readiness and liveness probes ensure that Flux can accurately determine if the deployment is healthy.

## Configuring the Timeout

The timeout is critical when using remediation because it determines how long Helm waits before Flux treats the action as failed. Set the timeout based on your application's startup time:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: slow-starting-app
  namespace: production
spec:
  interval: 30m
  timeout: 15m
  chart:
    spec:
      chart: slow-starting-app
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: internal-charts
        namespace: flux-system
  install:
    remediation:
      retries: 3
      remediateLastFailure: true
  upgrade:
    remediation:
      retries: 3
      remediateLastFailure: true
      strategy: rollback
```

If your application takes a long time to start (for example, a Java application with a large classpath), increase the timeout accordingly. A timeout that is too short will cause unnecessary rollbacks for healthy but slow-starting deployments.

## Remediation vs No Remediation

Without remediation, a failed upgrade can leave resources in their partially updated state until the next reconciliation or a manual fix. With remediation, Flux actively restores the previous state and retries:

```yaml
# Without remediation - no automatic rollback is configured

upgrade:
  cleanupOnFail: false

# With remediation - Flux rolls back before retrying
upgrade:
  remediation:
    retries: 3
    strategy: rollback
```

With remediation, each retry starts after Flux has rolled back the failed upgrade. Without remediation, the failed release state remains in place until another reconciliation changes it or an operator intervenes.

## Monitoring Remediation Operations

Check the status of a HelmRelease to see if remediation occurred:

```bash
kubectl get helmrelease -n production web-frontend -o yaml
```

Look at the `status.history` field to see the recent successfully completed release snapshots:

```bash
kubectl get helmrelease -n production web-frontend -o jsonpath='{.status.history}'
```

You can also check Helm's own release history:

```bash
helm history web-frontend -n production
```

This shows the release revisions, including any rollbacks triggered by Flux remediation.

## When Not to Use Automatic Remediation

There are scenarios where automatic remediation may not be desirable:

- **Debugging**: When troubleshooting a deployment, you may want to see the failed state to diagnose issues. With remediation, the failed resources may be rolled back or uninstalled before you can inspect them.
- **Large deployments**: Rolling back a large deployment can take significant time and may cause additional disruption.
- **Stateful applications**: Rolling back stateful applications (databases, message queues) can cause data inconsistencies.

For debugging, you can temporarily remove remediation settings and use `kubectl` to inspect the failed resources before manually rolling back.

## Conclusion

Flux HelmRelease remediation provides a safety net for production deployments by automatically uninstalling failed installs, rolling back failed upgrades, and retrying failed operations. Set appropriate timeouts based on your application's startup characteristics, ensure your pods have proper readiness probes, and use remediation alongside `cleanupOnFail` for cleaner failure handling. This combination helps your production cluster return to a known working state when individual deployments fail.
