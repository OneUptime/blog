# How to Handle HelmRelease Has No Deployed Releases Error in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, HelmRelease, Kubernetes, GitOps, Helm, Troubleshooting, Deployment Error

Description: Learn how to resolve the HelmRelease error when Helm reports there are no deployed releases and upgrades cannot proceed.

---

## Introduction

When Flux attempts to upgrade a HelmRelease, you may encounter the error "has no deployed releases." This error means Helm cannot find a release in the "deployed" state to upgrade from. All existing release versions are either in a "failed," "pending," or "superseded" state, leaving Helm without a valid baseline for the upgrade operation.

This situation commonly occurs after a series of failed installations or upgrades, when manual Helm operations have been performed outside of Flux, or when Helm release secrets have been partially deleted. The error blocks all future upgrades and requires manual intervention to resolve.

This guide explains the root cause, walks through diagnostic steps, and provides solutions to get your HelmRelease back to a healthy state.

## Prerequisites

Before you start troubleshooting, ensure you have:

- kubectl access to the Kubernetes cluster
- The Helm CLI installed locally
- Flux CD installed and running in the cluster
- Permissions to view and delete secrets in the release namespace

## Understanding the Error

Helm maintains release history as a series of versioned secrets. Each secret represents a point-in-time snapshot of the release with a status field. When Helm performs an upgrade, it looks for the latest secret with a status of "deployed" to use as the base for the upgrade.

If all release secrets have a status of "failed" or "pending-install," there is no deployed release to upgrade from. Helm then reports the "has no deployed releases" error and refuses to proceed.

You can verify this by listing the release secrets:

```bash
kubectl get secrets -n production -l owner=helm,name=my-app --sort-by=.metadata.creationTimestamp
```

And checking the status of each:

```bash
for secret in $(kubectl get secrets -n production -l owner=helm,name=my-app -o name); do
  echo "$secret: $(kubectl get $secret -n production -o jsonpath='{.metadata.labels.status}')"
done
```

## Solution 1: Delete All Release Secrets and Let Flux Reinstall

The most straightforward solution is to remove all Helm release secrets and let Flux perform a fresh install:

```bash
kubectl delete secrets -n production -l owner=helm,name=my-app
```

Then trigger a reconciliation:

```bash
flux reconcile helmrelease my-app -n production
```

Flux will detect that no release exists and perform a fresh install. This is the cleanest approach but means you lose all release history.

## Solution 2: Configure Install Remediation to Handle the Edge Case

To prevent this from happening in the future, configure your HelmRelease with install remediation:

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
    crds: CreateReplace
    remediation:
      retries: 5
      remediateLastFailure: true
  upgrade:
    cleanupOnFail: true
    remediation:
      retries: 5
      remediateLastFailure: true
      strategy: uninstall
```

By setting the upgrade remediation strategy to `uninstall`, when upgrades fail (including the "no deployed releases" scenario), Flux will uninstall the release completely and then reinstall it on the next reconciliation.

## Solution 3: Use Helm CLI to Fix the Release State

If you want to preserve history, you can manually fix the release state using the Helm CLI:

```bash
# First, check the current release history
helm history my-app -n production

# If you see failed releases, try rolling back to a specific version
helm rollback my-app 3 -n production
```

If there is no version to roll back to, you can uninstall and let Flux reinstall:

```bash
helm uninstall my-app -n production
flux reconcile helmrelease my-app -n production
```

## Solution 4: Suspend, Clean, and Resume

For a controlled resolution in a production environment:

```bash
# Suspend the HelmRelease to stop Flux from interfering
flux suspend helmrelease my-app -n production

# Remove the broken release secrets
kubectl delete secrets -n production -l owner=helm,name=my-app

# Resume the HelmRelease to trigger a fresh install
flux resume helmrelease my-app -n production
```

Verify the release comes up healthy:

```bash
kubectl get helmrelease my-app -n production -w
```

## Preventing This Error

The best way to prevent this error is to always use Flux for managing your Helm releases and avoid manual Helm operations. If you must use the Helm CLI directly, suspend the HelmRelease first:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: production
spec:
  suspend: true
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
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
      strategy: uninstall
      remediateLastFailure: true
```

Also configure the Helm release history limit to prevent accumulation of old failed releases:

```yaml
spec:
  maxHistory: 5
```

This keeps only the last five release versions, reducing the chance of state accumulation issues.

## Conclusion

The "has no deployed releases" error occurs when Helm cannot find a deployed release to use as a baseline for upgrades. The most reliable fix is to delete the corrupted release secrets and let Flux perform a fresh install. To prevent recurrence, configure your HelmReleases with the uninstall remediation strategy and avoid manual Helm operations on Flux-managed releases. With proper remediation settings, Flux can automatically recover from most release state issues without manual intervention.
