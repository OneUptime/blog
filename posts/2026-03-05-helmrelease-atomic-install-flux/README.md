# How to Configure HelmRelease Atomic Install in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Atomic Install, Rollback

Description: Learn how to configure atomic installs for Flux HelmRelease resources to ensure all-or-nothing Helm deployments with automatic rollback on failure.

---

Managing Helm releases in production requires confidence that a failed deployment will not leave your cluster in a broken state. Flux CD supports atomic installs through the HelmRelease custom resource, which tells Helm to roll back automatically if any part of the installation fails. This guide walks you through configuring atomic installs, explaining when and why you should use them, and showing practical examples.

## What Is an Atomic Install?

When Helm performs an atomic install, it treats the entire release as a single transaction. If any resource fails to deploy or any post-install hook fails, Helm automatically rolls back all changes. Without atomic mode, a partially failed release can leave dangling resources in your cluster that require manual cleanup.

## Prerequisites

Before proceeding, make sure you have:

- A running Kubernetes cluster with Flux CD installed
- The Flux CLI (`flux`) installed locally
- A GitOps repository connected to Flux
- Basic familiarity with HelmRelease and HelmRepository resources

## Setting Up a HelmRepository

First, define a HelmRepository source. This example uses the Bitnami charts repository for a sample application.

```yaml
# helmrepository.yaml - Defines the Helm chart source for Flux to pull from
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  interval: 30m
  url: https://charts.bitnami.com/bitnami
```

## Configuring Atomic Install on a HelmRelease

The key to atomic installs lies in the `install` and `upgrade` sections of the HelmRelease spec. Here is a complete HelmRelease that deploys an NGINX chart with atomic behavior enabled.

```yaml
# helmrelease-atomic.yaml - HelmRelease with atomic install and upgrade enabled
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx-atomic
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: nginx
      version: "18.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
      interval: 10m
  # Install configuration - atomic ensures rollback on install failure
  install:
    # When atomic is true, Helm will roll back the entire install if it fails
    atomic: true
    # Timeout for the install operation
    timeout: 5m
    # Number of install retries before giving up
    remediation:
      retries: 3
  # Upgrade configuration - atomic ensures rollback on upgrade failure
  upgrade:
    # When atomic is true, Helm will roll back to the previous release on upgrade failure
    atomic: true
    # Timeout for the upgrade operation
    timeout: 5m
    # Clean up custom resources on failed upgrade
    cleanupOnFail: true
    # Remediation strategy for failed upgrades
    remediation:
      retries: 3
      # Rollback to the last successful release on failure
      strategy: rollback
  # Values to pass to the Helm chart
  values:
    replicaCount: 2
    service:
      type: ClusterIP
```

## Understanding the Atomic Configuration Fields

The `install.atomic` field ensures that if the initial installation of the chart fails, Helm will automatically delete all resources it created. This prevents partial deployments from polluting your cluster.

The `upgrade.atomic` field works similarly for upgrades. If an upgrade fails, Helm rolls back to the previous successful release version. Combined with `cleanupOnFail: true`, any new resources created during the failed upgrade are also removed.

The `remediation` block tells Flux how many times to retry before giving up. The `strategy: rollback` setting under `upgrade.remediation` instructs Flux to roll back to the last successful release state after exhausting all retries.

## Combining Atomic with Other Safety Features

You can combine atomic installs with additional safety mechanisms for maximum reliability.

```yaml
# helmrelease-atomic-full.yaml - Full safety configuration with atomic, tests, and force
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx-safe
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: nginx
      version: "18.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
      interval: 10m
  install:
    atomic: true
    timeout: 5m
    # Create the target namespace if it does not exist
    createNamespace: true
    remediation:
      retries: 3
  upgrade:
    atomic: true
    timeout: 5m
    cleanupOnFail: true
    # Force resource updates through delete and recreate if patch fails
    force: false
    remediation:
      retries: 3
      strategy: rollback
  # Run Helm tests after install/upgrade
  test:
    enable: true
    # Timeout for running Helm tests
    timeout: 2m
  # Rollback configuration when remediation triggers a rollback
  rollback:
    timeout: 5m
    # Re-create resources that were deleted during rollback
    recreate: true
    # Clean up resources created by the failed release
    cleanupOnFail: true
  values:
    replicaCount: 2
    service:
      type: ClusterIP
```

## When to Use Atomic Installs

Atomic installs are best suited for production environments where consistency is critical. If a chart deploys multiple interdependent resources (Deployments, Services, ConfigMaps, Secrets), a partial failure could leave the application in an inconsistent state. Atomic mode prevents this.

However, atomic installs come with a trade-off: they increase deployment time on failure because Helm must perform a full rollback. In development environments where you want fast iteration and can tolerate partial failures, you may choose to leave atomic disabled.

## Verifying Atomic Behavior

After applying your HelmRelease, check its status with the Flux CLI.

```bash
# Check the status of the HelmRelease
flux get helmrelease nginx-atomic

# View detailed conditions and events
kubectl describe helmrelease nginx-atomic -n default

# Check the Helm release history to see rollback events
helm history nginx-atomic -n default
```

If a deployment fails and atomic is enabled, you will see a rollback event in the Helm history and a corresponding condition on the HelmRelease resource.

## Debugging Failed Atomic Installs

When an atomic install fails and rolls back, Flux records the failure reason in the HelmRelease status conditions. Use the following commands to investigate.

```bash
# Get detailed status including failure messages
kubectl get helmrelease nginx-atomic -n default -o yaml

# Check Flux logs for the helm-controller
kubectl logs -n flux-system deploy/helm-controller --tail=50

# Look for events in the target namespace
kubectl get events -n default --sort-by='.lastTimestamp'
```

## Summary

Configuring atomic installs on Flux HelmRelease resources provides a robust safety net for Helm deployments. By setting `atomic: true` on both the `install` and `upgrade` sections, combined with proper remediation strategies, you ensure that failed deployments are automatically rolled back, keeping your cluster in a consistent state. This pattern is essential for production GitOps workflows where reliability and consistency are non-negotiable.
