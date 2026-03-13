# How to Configure HelmRelease Upgrade Remediation with Retries in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, GitOps, Kubernetes, HelmRelease, Remediation, Upgrade, Retries, Helm

Description: Learn how to configure upgrade remediation with retries and rollback strategies for Flux HelmRelease resources to handle failed Helm chart upgrades.

---

## Introduction

Helm chart upgrades can fail for many reasons: incompatible values, resource conflicts, failed readiness probes, or breaking changes in new chart versions. When an upgrade fails, you need a strategy to recover. Flux HelmRelease supports upgrade remediation with configurable retries and rollback strategies, allowing automatic recovery from failed upgrades. This guide covers how to configure these settings for reliable Helm chart lifecycle management.

## Prerequisites

- A Kubernetes cluster running version 1.25 or later
- Flux v2.3 or later installed on the cluster
- kubectl configured to access the cluster
- A Git repository connected to Flux
- An existing HelmRelease with a successful initial installation

## Understanding Upgrade Remediation

Upgrade remediation controls what Flux does when a Helm chart upgrade fails. The `spec.upgrade.remediation` field offers retries for configuring the number of upgrade retry attempts, strategy for choosing what to do on the last failure (rollback or uninstall), and remediateLastFailure for controlling whether to apply the strategy on the final retry.

## Basic Upgrade Retry Configuration

Configure a HelmRelease with upgrade retries:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: my-app
      version: "2.1.0"
      sourceRef:
        kind: HelmRepository
        name: internal
        namespace: flux-system
  upgrade:
    remediation:
      retries: 3
```

With `retries: 3`, Flux retries the upgrade up to 3 additional times after the initial failure.

## Configuring Rollback on Failure

The `strategy: rollback` setting tells Flux to roll back to the previous successful release version when the last retry fails:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: my-app
      version: "2.1.0"
      sourceRef:
        kind: HelmRepository
        name: internal
        namespace: flux-system
  upgrade:
    remediation:
      retries: 3
      strategy: rollback
      remediateLastFailure: true
```

With this configuration, when the upgrade attempt fails, Flux tries the upgrade again on the first and second retries. On the third retry (the last one), it rolls back to the previous version, then attempts the upgrade one more time.

## Rollback vs Uninstall Strategy

The `strategy` field accepts two values.

**rollback** is recommended for most cases. It reverts to the last successful Helm release. Your application returns to its previous working state with zero data loss.

```yaml
upgrade:
  remediation:
    retries: 3
    strategy: rollback
    remediateLastFailure: true
```

**uninstall** completely removes the Helm release and all its resources, then reinstalls. This is more destructive but can resolve issues where rollback fails due to corrupted Helm state.

```yaml
upgrade:
  remediation:
    retries: 3
    strategy: uninstall
    remediateLastFailure: true
```

Use `uninstall` only when rollback does not work, and be aware that it deletes PVCs depending on the chart configuration, which can cause data loss.

## Complete HelmRelease with Install and Upgrade Remediation

Configure both installation and upgrade failure handling:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: my-app
      version: "2.1.0"
      sourceRef:
        kind: HelmRepository
        name: internal
        namespace: flux-system
  install:
    createNamespace: true
    timeout: 10m
    remediation:
      retries: 3
      remediateLastFailure: true
  upgrade:
    timeout: 10m
    cleanupOnFail: true
    remediation:
      retries: 3
      strategy: rollback
      remediateLastFailure: true
  values:
    replicaCount: 3
    image:
      repository: myregistry/my-app
      tag: v2.1.0
    resources:
      requests:
        cpu: 250m
        memory: 256Mi
```

The `cleanupOnFail: true` in the upgrade section tells Helm to remove any new resources that were created during the failed upgrade. This prevents resource leaks from failed upgrade attempts.

## Upgrade Remediation for Database Charts

Database charts need careful upgrade handling to avoid data loss:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: postgresql
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: postgresql
      version: "15.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  upgrade:
    timeout: 15m
    cleanupOnFail: true
    remediation:
      retries: 3
      strategy: rollback
      remediateLastFailure: true
  values:
    primary:
      persistence:
        size: 50Gi
```

Using `strategy: rollback` instead of `uninstall` is critical here. Rollback preserves the existing PVC and data. An uninstall could delete the PVC and destroy your database.

## Upgrade Remediation for Infrastructure Charts

Infrastructure charts like ingress controllers and cert-manager should use rollback with generous retries:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: ingress-nginx
      version: "4.x"
      sourceRef:
        kind: HelmRepository
        name: ingress-nginx
        namespace: flux-system
  upgrade:
    timeout: 10m
    cleanupOnFail: true
    remediation:
      retries: 5
      strategy: rollback
      remediateLastFailure: true
```

More retries give the infrastructure chart more chances to succeed through transient issues.

## Unlimited Upgrade Retries

For charts that must eventually upgrade successfully:

```yaml
upgrade:
  remediation:
    retries: -1
    strategy: rollback
    remediateLastFailure: true
```

With `retries: -1`, Flux retries the upgrade indefinitely. On each failure, it rolls back and tries again. Use this cautiously, as a permanently incompatible upgrade will create an infinite retry loop.

## Monitoring Upgrade Remediation

Track upgrade attempts and rollbacks:

```bash
# Check HelmRelease status
flux get helmrelease my-app

# Check upgrade failure count
kubectl get helmrelease my-app -n flux-system -o jsonpath='{.status.upgradeFailures}'

# Check the current release version
kubectl get helmrelease my-app -n flux-system -o jsonpath='{.status.lastAppliedRevision}'

# Check Helm release history for rollbacks
helm history my-app -n default

# Watch HelmRelease events
kubectl get events -n flux-system --field-selector involvedObject.name=my-app --sort-by=.lastTimestamp
```

## Handling Rollback Failures

Sometimes the rollback itself can fail. When this happens:

```bash
# Check HelmRelease conditions
kubectl get helmrelease my-app -n flux-system -o jsonpath='{.status.conditions}' | jq .

# Check Helm release state
helm status my-app -n default

# Check for stuck resources
kubectl get all -n default -l app.kubernetes.io/instance=my-app

# Manual rollback if needed
helm rollback my-app 0 -n default

# Reset HelmRelease state
flux suspend helmrelease my-app
flux resume helmrelease my-app
```

## Setting Timeouts for Upgrade Attempts

Each upgrade attempt uses the `spec.upgrade.timeout` value. Set it based on your chart's upgrade time:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: my-app
      version: "2.1.0"
      sourceRef:
        kind: HelmRepository
        name: internal
        namespace: flux-system
  upgrade:
    timeout: 10m
    remediation:
      retries: 3
      strategy: rollback
      remediateLastFailure: true
```

The timeout applies to each individual upgrade attempt, not the total time across all retries. With 3 retries and a 10-minute timeout, the worst case is 40 minutes (4 attempts at 10 minutes each, plus rollback time).

## Debugging Upgrade Failures

When upgrades keep failing despite retries:

```bash
# Check for resource conflicts
kubectl get events -n default --sort-by=.lastTimestamp | tail -20

# Check pod status after upgrade attempt
kubectl get pods -n default -l app.kubernetes.io/instance=my-app

# Check readiness probe configuration
kubectl describe deployment my-app -n default

# Check if values are valid
helm template my-app bitnami/my-app --version 2.1.0 --values values.yaml | kubectl apply --dry-run=client -f -
```

Common upgrade failure causes include breaking changes in the chart requiring value migration, resource quota exceeded by new resource requirements, immutable field changes such as PVC storage class or Service type, new readiness probes failing due to application issues, and Helm hooks failing during pre-upgrade or post-upgrade phases.

## Best Practices

Here are guidelines for upgrade remediation. Always use `strategy: rollback` for production workloads to minimize downtime. Set `cleanupOnFail: true` to prevent resource leaks from failed upgrades. Use 3-5 retries for most charts, and unlimited for critical infrastructure. Set `remediateLastFailure: true` to trigger rollback before the final retry. Set upgrade timeouts based on the chart's typical upgrade duration. Never use `strategy: uninstall` for stateful workloads with persistent data. Monitor upgrade failure counts and alert when retries are exhausted.

## Conclusion

Upgrade remediation with retries in Flux HelmRelease provides automatic recovery from failed Helm chart upgrades. The rollback strategy is the safest option for most workloads, reverting to the last known good state when an upgrade fails. Combined with `cleanupOnFail` and appropriate timeouts, you get a resilient upgrade pipeline that handles transient failures without manual intervention. Always prefer rollback over uninstall for stateful workloads, and set retry counts based on the expected reliability of your chart upgrades.
