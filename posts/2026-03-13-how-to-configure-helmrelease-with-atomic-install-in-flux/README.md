# How to Configure HelmRelease with atomic Install in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, HelmRelease, Kubernetes, GitOps, Helm, Rollback

Description: Learn how to configure the atomic flag in Flux HelmRelease to automatically roll back failed installations and upgrades.

---

## Introduction

In production Kubernetes environments, a failed Helm installation or upgrade can leave your cluster in a broken state with partially deployed resources. The `atomic` flag in Helm tells it to automatically roll back if an operation fails, cleaning up any resources that were created during the failed attempt. Flux CD exposes this flag through the HelmRelease spec, giving you transactional-style deployments through your GitOps workflow.

In this post, you will learn how to configure `atomic` installations and upgrades in Flux HelmRelease, understand how it interacts with other Flux remediation settings, and see practical examples for production deployments.

## Prerequisites

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped on the cluster
- A Git repository connected to Flux
- kubectl configured to access the cluster
- Familiarity with Helm release lifecycle

## What Does atomic Do

When `atomic` is enabled, Helm treats the install or upgrade operation as an all-or-nothing transaction. If any resource fails to become ready within the timeout period, Helm automatically:

1. Rolls back all changes made during the operation.
2. Restores the previous release state (for upgrades) or deletes all created resources (for installs).
3. Marks the release as failed in the Helm history.

The `atomic` flag implicitly enables `--wait`, meaning Helm will wait for all resources to reach a ready state before considering the operation successful.

## Basic atomic Configuration

Here is a HelmRelease with `atomic` enabled for both install and upgrade:

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
    atomic: true
    remediation:
      retries: 3
  upgrade:
    atomic: true
    remediation:
      retries: 3
      remediateLastFailure: true
```

The `timeout` field at the spec level controls how long Helm waits for resources to become ready. If resources are not ready within this timeout, the atomic rollback is triggered.

## Understanding atomic with Flux Remediation

Flux has its own remediation system that works alongside Helm's `atomic` flag. It is important to understand how they interact:

- **atomic rollback**: Helm rolls back the release to the previous state immediately when the operation fails.
- **Flux remediation retries**: After the atomic rollback, Flux can retry the operation according to the `retries` count.

Here is the sequence of events for a failed upgrade with `atomic: true` and `retries: 3`:

1. Flux attempts the upgrade.
2. A pod fails to become ready within the timeout.
3. Helm atomically rolls back to the previous version.
4. Flux retries the upgrade (attempt 2 of 3).
5. If it fails again, Helm rolls back and Flux retries once more.
6. After all retries are exhausted, Flux marks the HelmRelease as failed.

## Production Example: Web Application Deployment

Here is a production-ready HelmRelease for a web application with atomic deployments:

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
    atomic: true
    createNamespace: true
    remediation:
      retries: 3
  upgrade:
    atomic: true
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
- `cleanupOnFail: true` removes newly created resources on a failed upgrade before rolling back.
- `strategy: rollback` tells Flux to rollback to the last successful release on failure.
- Readiness and liveness probes ensure that `atomic` can accurately determine if the deployment is healthy.

## Configuring the Timeout

The timeout is critical when using `atomic` because it determines how long Helm waits before triggering a rollback. Set the timeout based on your application's startup time:

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
    atomic: true
  upgrade:
    atomic: true
```

If your application takes a long time to start (for example, a Java application with a large classpath), increase the timeout accordingly. A timeout that is too short will cause unnecessary rollbacks for healthy but slow-starting deployments.

## atomic vs Non-atomic with Remediation

Without `atomic`, a failed upgrade leaves resources in their partially updated state. Flux remediation still works but operates differently:

```yaml
# Without atomic - resources remain in failed state between retries
upgrade:
  atomic: false
  remediation:
    retries: 3
    strategy: rollback

# With atomic - Helm rolls back before Flux retries
upgrade:
  atomic: true
  remediation:
    retries: 3
    strategy: rollback
```

With `atomic`, each retry starts from a clean state because Helm has already rolled back. Without `atomic`, each retry attempts to upgrade from the partially failed state, which may or may not succeed.

## Monitoring atomic Operations

Check the status of a HelmRelease to see if an atomic rollback occurred:

```bash
kubectl get helmrelease -n production web-frontend -o yaml
```

Look at the `status.history` field to see the sequence of operations:

```bash
kubectl get helmrelease -n production web-frontend -o jsonpath='{.status.history}'
```

You can also check Helm's own release history:

```bash
helm history web-frontend -n production
```

This shows the release revisions, including any rollbacks triggered by the `atomic` flag.

## When Not to Use atomic

There are scenarios where `atomic` may not be desirable:

- **Debugging**: When troubleshooting a deployment, you may want to see the failed state to diagnose issues. With `atomic`, the failed resources are rolled back before you can inspect them.
- **Large deployments**: Rolling back a large deployment can take significant time and may cause additional disruption.
- **Stateful applications**: Rolling back stateful applications (databases, message queues) can cause data inconsistencies.

For debugging, you can temporarily disable `atomic` and use `kubectl` to inspect the failed resources before manually rolling back.

## Conclusion

The `atomic` flag in Flux HelmRelease provides a safety net for production deployments by automatically rolling back failed installations and upgrades. Combined with Flux's remediation system, it creates a robust deployment pipeline that handles failures gracefully. Set appropriate timeouts based on your application's startup characteristics, ensure your pods have proper readiness probes, and use `atomic` alongside `cleanupOnFail` for the cleanest failure handling. This combination ensures your production cluster stays in a consistent, working state even when individual deployments fail.
