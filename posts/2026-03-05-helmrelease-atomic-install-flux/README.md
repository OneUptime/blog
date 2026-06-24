# How to Configure HelmRelease Atomic Install in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Atomic Install, Rollback

Description: Learn how to configure atomic installs for Flux HelmRelease resources to ensure all-or-nothing Helm deployments with automatic rollback on failure.

---

Managing Helm releases in production requires confidence that a failed deployment will not leave your cluster in a broken state. Flux CD supports failure remediation through the HelmRelease custom resource, which can uninstall a failed install or roll back a failed upgrade. This guide walks you through configuring remediation, explaining when and why you should use it, and showing practical examples.

## What Is an Atomic Install?

When Helm performs an atomic install with the Helm CLI, it deletes the installation on failure. Flux HelmRelease does not expose Helm's `--atomic` flag directly. Instead, Flux provides remediation settings: failed installs can be uninstalled between retries, and failed upgrades can be rolled back to the last successful release. Without remediation, a partially failed release can leave dangling resources in your cluster that require manual cleanup.

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

## Configuring Remediation on a HelmRelease

The key to failure remediation lies in the `install` and `upgrade` sections of the HelmRelease spec. Here is a complete HelmRelease that deploys an NGINX chart with install cleanup and upgrade rollback behavior enabled.

```yaml
# helmrelease-remediation.yaml - HelmRelease with install and upgrade remediation enabled
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx-remediated
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: nginx
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
      interval: 10m
  # Install configuration - remediation uninstalls a failed install between retries
  install:
    # Timeout for the install operation
    timeout: 5m
    # Number of install retries before giving up
    remediation:
      retries: 3
  # Upgrade configuration - remediation rolls back on upgrade failure
  upgrade:
    # Timeout for the upgrade operation
    timeout: 5m
    # Clean up new resources created during a failed upgrade
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

## Understanding the Remediation Configuration Fields

The `install.remediation.retries` field tells Flux how many install retries to attempt before giving up. With the default `RemediateOnFailure` install strategy, Flux performs an uninstall between failed install attempts. This prevents partial deployments from polluting your cluster.

The `upgrade.remediation.strategy: rollback` field tells Flux to roll back to the previous successful release version when an upgrade fails. Combined with `cleanupOnFail: true`, any new resources created during the failed upgrade are also removed.

The `remediation` block tells Flux how many times to retry before giving up. The `strategy: rollback` setting under `upgrade.remediation` instructs Flux to roll back to the last successful release state between retries and when the last retry fails.

## Combining Remediation with Other Safety Features

You can combine remediation with additional safety mechanisms for maximum reliability.

```yaml
# helmrelease-remediation-full.yaml - Full safety configuration with remediation and tests
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
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
      interval: 10m
  install:
    timeout: 5m
    # Create the target namespace if it does not exist
    createNamespace: true
    remediation:
      retries: 3
  upgrade:
    timeout: 5m
    cleanupOnFail: true
    # Keep force disabled unless replacement updates are required
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
    # Clean up resources created by the failed release
    cleanupOnFail: true
  values:
    replicaCount: 2
    service:
      type: ClusterIP
```

## When to Use Remediation

Failure remediation is best suited for production environments where consistency is critical. If a chart deploys multiple interdependent resources (Deployments, Services, ConfigMaps, Secrets), a partial failure could leave the application in an inconsistent state. Remediation helps prevent this.

However, remediation comes with a trade-off: it increases deployment time on failure because Flux must perform an uninstall or rollback. In development environments where you want fast iteration and can tolerate partial failures, you may choose to keep remediation minimal.

## Verifying Remediation Behavior

After applying your HelmRelease, check its status with the Flux CLI.

```bash
# Check the status of the HelmRelease
flux get helmreleases nginx-remediated -n default

# View detailed conditions and events
kubectl describe helmrelease nginx-remediated -n default

# Check the Helm release history to see rollback events
helm history nginx-remediated -n default
```

If an upgrade fails and rollback remediation is enabled, you will see a rollback event in the Helm history and a corresponding condition on the HelmRelease resource. For install failures, Flux records the failure and uninstall remediation in the HelmRelease status and Kubernetes events.

## Debugging Failed Remediation

When an install or upgrade fails and remediation runs, Flux records the failure reason in the HelmRelease status conditions. Use the following commands to investigate.

```bash
# Get detailed status including failure messages
kubectl get helmrelease nginx-remediated -n default -o yaml

# Check Flux logs for the helm-controller
kubectl logs -n flux-system deploy/helm-controller --tail=50

# Look for events in the target namespace
kubectl get events -n default --sort-by='.lastTimestamp'
```

## Summary

Configuring remediation on Flux HelmRelease resources provides a robust safety net for Helm deployments. By setting install remediation retries and using `strategy: rollback` for upgrades, you ensure that failed deployments are cleaned up or rolled back, keeping your cluster in a consistent state. This pattern is essential for production GitOps workflows where reliability and consistency are non-negotiable.
