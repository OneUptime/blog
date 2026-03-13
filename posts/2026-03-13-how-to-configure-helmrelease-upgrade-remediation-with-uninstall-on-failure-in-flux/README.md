# HelmRelease Upgrade Remediation with Uninstall on Failure in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, HelmRelease, Kubernetes, GitOps, Helm, Uninstall, Remediation

Description: Learn how to configure HelmRelease upgrade remediation with the uninstall strategy in Flux CD to cleanly remove failed releases.

---

## Introduction

Flux CD provides two remediation strategies for handling failed HelmRelease upgrades: rollback and uninstall. While rollback reverts to the previous release, the uninstall strategy takes a more aggressive approach by completely removing the failed Helm release and allowing Flux to reinstall it from scratch on the next reconciliation cycle.

The uninstall remediation strategy is particularly useful when a rollback would not resolve the issue, such as when persistent volume claims, custom resource definitions, or other stateful resources have been corrupted during the failed upgrade. A clean uninstall followed by a fresh install can resolve issues that a simple rollback cannot.

This guide walks you through configuring the uninstall remediation strategy, explains when to use it over rollback, and provides production-ready YAML examples.

## Prerequisites

Before you begin, ensure you have:

- A running Kubernetes cluster with Flux CD bootstrapped
- The Flux Helm Controller deployed and operational
- A configured HelmRepository or other chart source
- kubectl access to your cluster
- Familiarity with HelmRelease manifests

## How the Uninstall Strategy Works

When you set the remediation strategy to `uninstall`, Flux will attempt the upgrade a specified number of times. If all retries are exhausted, Flux uninstalls the Helm release entirely. On the next reconciliation interval, Flux sees that no release exists and performs a fresh install using the chart and values defined in the HelmRelease manifest.

This creates a cycle of: upgrade attempt, failure, retry, uninstall, and then reinstall. The reinstall uses the current desired state from your Git repository, which means any fixes you push to Git will be picked up automatically.

## Basic Uninstall on Failure Configuration

Here is a straightforward HelmRelease that uses the uninstall remediation strategy:

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
  upgrade:
    remediation:
      retries: 3
      strategy: uninstall
```

After three failed upgrade attempts, Flux will uninstall the release. On the next reconciliation (within 10 minutes), it will attempt a fresh install.

## Advanced Configuration with Uninstall Options

You can control how the uninstall behaves by adding an `uninstall` section to your HelmRelease:

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
  install:
    remediation:
      retries: 3
  upgrade:
    cleanupOnFail: true
    remediation:
      retries: 3
      remediateLastFailure: true
      strategy: uninstall
  uninstall:
    timeout: 5m
    disableHooks: true
    keepHistory: false
```

Setting `disableHooks` to true in the uninstall section prevents pre-delete and post-delete hooks from running during the uninstall. This is helpful when hooks themselves are part of the problem causing the failure. The `keepHistory` field set to false ensures that the Helm release history is fully cleaned up.

## When to Use Uninstall vs Rollback

Choose the uninstall strategy when:

- The release state is corrupted beyond what a rollback can fix
- CRDs or cluster-scoped resources need a clean slate
- Persistent state from previous releases is causing conflicts
- You want to ensure the install path is exercised rather than the upgrade path

Choose rollback when:

- You want minimal disruption and the previous release was healthy
- Stateful resources like persistent volumes need to be preserved
- Downtime must be as brief as possible

Here is a comparison manifest showing both strategies side by side for different environments:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: staging
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
      retries: 2
      strategy: uninstall
---
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
      retries: 5
      strategy: rollback
```

This pattern uses uninstall for staging where a fresh install is acceptable, and rollback for production where stability is paramount.

## Monitoring the Uninstall and Reinstall Cycle

To observe the remediation behavior, check the HelmRelease status:

```bash
kubectl get helmrelease my-app -n default -o jsonpath='{.status.conditions}' | jq .
```

You will see condition entries with reasons like `UpgradeFailed`, `UninstallSucceeded`, and eventually `InstallSucceeded` when the fresh install completes. Flux also emits Kubernetes events that you can watch:

```bash
kubectl events --for helmrelease/my-app -n default --watch
```

## Important Considerations

Be aware that the uninstall strategy causes downtime. Between the uninstall and the next reconciliation, your application will not be running. For applications that cannot tolerate any downtime, use the rollback strategy instead.

Also note that any persistent volume claims created by the Helm chart may be deleted during uninstall, depending on the reclaim policy. If your application uses persistent storage, make sure your storage class has the appropriate reclaim policy or use the rollback strategy.

## Conclusion

The uninstall remediation strategy in Flux provides a clean-slate approach to handling failed upgrades. By removing the broken release and allowing Flux to reinstall it, you can resolve issues that rollback alone cannot fix. Use this strategy in non-production environments or for stateless applications where brief downtime is acceptable. For production workloads with strict uptime requirements, consider the rollback strategy instead. Whichever approach you choose, configuring upgrade remediation is a best practice that every Flux-managed HelmRelease should include.
