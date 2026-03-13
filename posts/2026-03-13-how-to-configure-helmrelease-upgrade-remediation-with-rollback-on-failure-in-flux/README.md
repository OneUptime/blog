# How to Configure HelmRelease Upgrade Remediation with Rollback on Failure in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, HelmRelease, Kubernetes, GitOps, Helm, Rollback, Remediation

Description: Learn how to configure automatic rollback on upgrade failure for HelmRelease resources in Flux CD to keep your deployments stable.

---

## Introduction

When managing Helm releases through Flux CD, upgrade failures are inevitable. A misconfigured values file, an incompatible chart version, or a resource conflict can cause an upgrade to fail, leaving your application in a broken state. Flux provides built-in upgrade remediation strategies that allow you to automatically roll back to the last successful release when an upgrade fails.

Configuring rollback on failure ensures that your cluster self-heals without manual intervention. This is a critical capability for production environments where downtime must be minimized and human operators may not be immediately available to respond to failed deployments.

In this guide, you will learn how to configure the `upgrade.remediation` section of a HelmRelease manifest to automatically trigger a rollback when an upgrade fails, understand the available options, and see practical examples you can apply to your own clusters.

## Prerequisites

Before proceeding, make sure you have the following in place:

- A Kubernetes cluster with Flux CD installed and bootstrapped
- The Flux Helm Controller running in your cluster
- A working HelmRepository or other Helm source configured
- Basic familiarity with HelmRelease custom resources
- kubectl access to your cluster

## Understanding Upgrade Remediation in Flux

Flux HelmRelease resources support a `spec.upgrade.remediation` field that controls what happens when an upgrade fails. The remediation block lets you specify the number of retries, whether to roll back on failure, and the strategy to use.

The key fields under `spec.upgrade.remediation` are:

- `retries`: The number of times Flux will retry the upgrade before considering it failed.
- `remediateLastFailure`: Whether to remediate (rollback or uninstall) after the last retry has failed.
- `strategy`: The remediation strategy to use, either `rollback` or `uninstall`.

## Basic Rollback on Failure Configuration

Here is a minimal HelmRelease manifest that configures automatic rollback when an upgrade fails:

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
      strategy: rollback
```

In this configuration, Flux will attempt the upgrade up to three times. If all three attempts fail, it will automatically roll back to the previously successful release.

## Advanced Configuration with Additional Options

You can combine the rollback remediation with other upgrade settings for more fine-grained control:

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
      version: "3.1.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  upgrade:
    cleanupOnFail: true
    remediation:
      retries: 5
      remediateLastFailure: true
      strategy: rollback
  rollback:
    cleanupOnFail: true
    force: false
    recreate: false
```

The `cleanupOnFail` field under `upgrade` tells Helm to delete any new resources that were created during the failed upgrade. The `rollback` section configures behavior during the rollback itself, such as whether to force resource updates or recreate pods.

## Combining with Install Remediation

It is common to configure both install and upgrade remediation together so your HelmRelease is resilient from the very first deployment:

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
      version: "1.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  install:
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
      strategy: rollback
      remediateLastFailure: true
```

With this setup, if the initial install fails, Flux retries it up to three times. If a subsequent upgrade fails, Flux retries and then rolls back to the last known good state.

## Monitoring Rollback Behavior

After applying your HelmRelease, you can monitor the remediation behavior using kubectl:

```bash
kubectl get helmrelease my-app -n production -o yaml
```

Look at the `status.conditions` section for entries with type `Ready` and reason `UpgradeFailed` or `RollbackSucceeded`. You can also watch events in real time:

```bash
kubectl events --for helmrelease/my-app -n production --watch
```

Flux will emit events for each upgrade attempt, each failure, and the final rollback action, giving you full visibility into what happened.

## Common Pitfalls

One common mistake is setting `retries` to zero while expecting remediation to kick in. If retries is zero, Flux will not attempt any remediation because the upgrade is considered failed immediately without retry attempts. Always set retries to at least one.

Another pitfall is not setting `remediateLastFailure` to true. By default, this field is true for the rollback strategy, but being explicit in your manifests avoids confusion and makes your intent clear to other team members.

Finally, be aware that rollback restores the Helm release state, but it does not revert changes to resources managed outside of Helm. If your upgrade included manual changes or external dependencies, those will not be affected by the rollback.

## Conclusion

Configuring HelmRelease upgrade remediation with rollback on failure is an essential practice for running reliable GitOps workflows with Flux. By setting the `strategy` to `rollback` and configuring appropriate retry counts, you ensure that failed upgrades are automatically reverted to the last working state. This reduces downtime, minimizes the need for manual intervention, and keeps your production clusters stable. Start by adding remediation configuration to your most critical HelmReleases and expand from there as you gain confidence in the behavior.
