# How to Configure HelmRelease Uninstall with disableHooks in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, HelmRelease, Kubernetes, GitOps, Helm, Uninstall, Hooks, disableHooks

Description: Learn how to configure the disableHooks option for HelmRelease uninstall operations in Flux CD to skip hook execution during cleanup.

---

## Introduction

Helm hooks provide lifecycle management for Helm releases, executing Jobs or other resources at specific points during install, upgrade, and uninstall operations. While hooks are useful for running setup and teardown tasks, they can also cause problems during uninstallation. A failing pre-delete or post-delete hook can prevent a release from being cleanly removed, creating stuck resources and blocking subsequent deployments.

Flux CD allows you to disable hooks during the uninstall phase of a HelmRelease by setting the `disableHooks` option in the uninstall configuration. This is a targeted setting that only affects the uninstall operation, leaving hooks active for installs and upgrades where they are typically more important.

This guide explains when and how to use `disableHooks` for uninstall operations, with practical examples and considerations for production environments.

## Prerequisites

To follow this guide, you need:

- A Kubernetes cluster with Flux CD installed
- A working HelmRelease managed by Flux
- kubectl access to the cluster
- Basic understanding of Helm hooks

## How Helm Hooks Work During Uninstall

When Helm uninstalls a release, it follows this sequence:

1. Execute pre-delete hooks and wait for completion
2. Delete all release resources (Deployments, Services, ConfigMaps, etc.)
3. Execute post-delete hooks and wait for completion
4. Remove the release record from storage

If any hook fails at step 1, Helm aborts the entire uninstall. The release resources remain running, and the release stays in the cluster. This is by design, as the hook failure may indicate that prerequisites for safe deletion have not been met.

However, in a GitOps environment managed by Flux, this behavior can be counterproductive. If you are uninstalling a release because it is broken, the hooks associated with that broken release may also be broken.

## Basic disableHooks Configuration

To disable hooks during uninstall, add the `disableHooks` field to the `spec.uninstall` section:

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
    disableHooks: true
```

With this configuration, when Flux uninstalls this HelmRelease, Helm will skip both pre-delete and post-delete hooks and proceed directly to deleting the release resources.

## Selective Hook Disabling Across Lifecycle Phases

You can disable hooks for specific lifecycle phases while keeping them enabled for others. This gives you granular control:

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
  install:
    disableHooks: false
  upgrade:
    disableHooks: false
  uninstall:
    disableHooks: true
    timeout: 5m
```

This is the recommended approach for most applications. Install and upgrade hooks typically perform important tasks like database migrations or schema validation. Uninstall hooks are less critical because the application is being removed anyway.

## Combining with Remediation Strategy

When using the uninstall remediation strategy for failed upgrades, disabling uninstall hooks becomes especially important:

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
    timeout: 5m
    keepHistory: false
```

If an upgrade fails and Flux triggers the uninstall remediation, the hooks from the failed chart version might also be broken. Disabling hooks ensures the uninstall can complete regardless of the chart's hook definitions.

## When to Keep Hooks Enabled

There are scenarios where you should keep uninstall hooks enabled:

- The chart has a pre-delete hook that performs critical cleanup of external resources (DNS entries, cloud resources, certificates)
- Data backup hooks that need to run before the application is removed
- Deregistration hooks that remove the service from a service discovery system

For these cases, ensure the hooks are well-tested and have appropriate timeouts:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: critical-app
  namespace: production
spec:
  interval: 5m
  chart:
    spec:
      chart: critical-app
      version: "1.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  uninstall:
    disableHooks: false
    timeout: 15m
```

The longer timeout gives hooks adequate time to complete their cleanup tasks before Helm considers them failed.

## Troubleshooting Hook Issues

If you are already stuck with a failed uninstall due to hooks, you can resolve it by patching the HelmRelease to disable hooks:

```bash
kubectl patch helmrelease my-app -n production --type merge -p '{"spec":{"uninstall":{"disableHooks":true}}}'
```

Then force a reconciliation:

```bash
flux reconcile helmrelease my-app -n production
```

If the HelmRelease has already been removed from Git (which triggered the uninstall), you may need to use the Helm CLI directly:

```bash
helm uninstall my-app -n production --no-hooks
```

## Conclusion

The `disableHooks` option in the HelmRelease uninstall configuration is a valuable tool for ensuring clean release removal in Flux CD. For most applications, disabling uninstall hooks is the pragmatic choice, as it prevents hook failures from blocking cleanup operations. Keep hooks enabled only when they perform critical external cleanup that cannot be handled by other means. Combine `disableHooks` with the uninstall remediation strategy and appropriate timeouts for a robust deployment pipeline that can recover from failures automatically.
