# How to Configure HelmRelease Uninstall with disableWait in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, HelmRelease, Kubernetes, GitOps, Helm, Uninstall, disableWait

Description: Learn how to use the disableWait option in HelmRelease uninstall configuration to speed up release removal in Flux CD.

---

## Introduction

When Helm uninstalls a release, it can optionally wait for all resources to be fully deleted before marking the uninstall as complete. This waiting behavior ensures that all pods, services, and other resources are terminated and cleaned up before the operation is considered successful. However, in many scenarios, waiting for complete resource deletion is unnecessary and slows down the uninstall process.

Flux CD provides the `disableWait` option in the HelmRelease uninstall configuration, which tells Helm to skip the resource deletion wait period. The uninstall is marked as complete as soon as the delete commands have been issued, without waiting for Kubernetes to finalize the resource removal.

This guide explains when to use `disableWait` during uninstall, how to configure it, and the trade-offs involved.

## Prerequisites

Before following this guide, ensure you have:

- A Kubernetes cluster with Flux CD installed
- A HelmRelease managed by Flux that you want to configure
- kubectl access to the cluster
- Understanding of Kubernetes resource deletion and finalizers

## How Helm Wait Works During Uninstall

By default, when Helm uninstalls a release without the wait flag, it sends delete requests for all release resources and immediately reports success. When wait is enabled, Helm sends the delete requests and then polls the Kubernetes API until all resources are confirmed deleted or the timeout is reached.

Waiting can take a significant amount of time, especially when:

- Pods have long `terminationGracePeriodSeconds` values
- PersistentVolumeClaims have `Retain` reclaim policies
- Resources have finalizers that require controller processing
- Namespaces have deletion dependencies

In Flux, the default behavior for uninstall does not wait. Setting `disableWait: true` explicitly ensures this behavior regardless of any defaults that may change in future versions.

## Basic disableWait Configuration

Here is a HelmRelease configured with `disableWait` in the uninstall section:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: "2.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  uninstall:
    disableWait: true
```

With this setting, when Flux uninstalls the release, Helm issues delete commands for all resources and immediately reports the uninstall as successful without waiting for the resources to be fully removed by Kubernetes.

## Combining disableWait with Other Uninstall Options

For a comprehensive uninstall configuration, combine `disableWait` with other options:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: production
spec:
  interval: 5m
  timeout: 10m
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
    disableWait: true
    timeout: 5m
    keepHistory: false
```

This configuration disables both hooks and wait during uninstall, sets a timeout of 5 minutes, and removes the release history. This is the fastest possible uninstall configuration.

## Using disableWait with Remediation

When using the uninstall remediation strategy, `disableWait` speeds up the recovery cycle:

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
      version: "3.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  upgrade:
    remediation:
      retries: 3
      strategy: uninstall
      remediateLastFailure: true
  uninstall:
    disableHooks: true
    disableWait: true
    timeout: 2m
```

When an upgrade fails and Flux triggers the uninstall remediation, the release is removed quickly without waiting for all pods to terminate. Flux then performs a fresh install on the next reconciliation cycle. This reduces the total recovery time significantly.

## When to Keep Wait Enabled

There are situations where you should not disable the wait:

- When subsequent operations depend on resources being fully removed before starting
- When you need to free up cluster resources (CPU, memory) before installing a replacement
- When PersistentVolumeClaims must be fully released before new claims can bind to the same volumes
- When you are running in a resource-constrained environment and need to ensure resources are freed

For these cases, keep `disableWait` at its default or set it to false:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: stateful-app
  namespace: production
spec:
  interval: 5m
  chart:
    spec:
      chart: stateful-app
      version: "1.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  uninstall:
    disableWait: false
    timeout: 15m
```

The longer timeout accommodates stateful applications that may take time to drain connections and persist data before shutting down.

## Dealing with Stuck Deletions

Even with `disableWait: true`, resource deletion can get stuck if resources have finalizers. If you notice resources lingering after an uninstall, check for finalizers:

```bash
kubectl get all -n production -l app.kubernetes.io/instance=my-app -o jsonpath='{range .items[*]}{.metadata.name}: {.metadata.finalizers}{"\n"}{end}'
```

Resources with finalizers will not be deleted until the finalizer controller processes them. This is independent of the Helm wait behavior and must be addressed separately.

## Complete Lifecycle Configuration

Here is a full HelmRelease manifest showing wait configuration across all lifecycle phases:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: production
spec:
  interval: 5m
  timeout: 10m
  chart:
    spec:
      chart: my-app
      version: "2.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  install:
    disableWait: false
    remediation:
      retries: 3
  upgrade:
    disableWait: false
    remediation:
      retries: 3
      strategy: rollback
  uninstall:
    disableWait: true
    disableHooks: true
    timeout: 5m
```

This keeps wait enabled for install and upgrade (to verify resources are healthy) while disabling it for uninstall (to speed up removal).

## Conclusion

The `disableWait` option in HelmRelease uninstall configuration is a useful setting for speeding up release removal in Flux CD. By skipping the wait for resource deletion, you reduce uninstall time and speed up remediation cycles. Use `disableWait: true` for stateless applications and environments where quick recovery is more important than guaranteed resource cleanup. Keep wait enabled for stateful applications where resource ordering and cleanup guarantees are critical. Combine `disableWait` with `disableHooks` and appropriate timeouts for the most efficient uninstall configuration.
