# How to Fix 'upgrade retries exhausted' Error in Flux CD HelmRelease

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, HelmRelease, Upgrade retries exhausted, Helm, Rollback, Troubleshooting, Kubernetes, GitOps

Description: A practical guide to resolving the 'upgrade retries exhausted' error in Flux CD HelmRelease with rollback and remediation strategies.

---

## Introduction

The "upgrade retries exhausted" error in Flux CD occurs when a HelmRelease upgrade fails repeatedly and exhausts all configured retry attempts. Unlike install failures, upgrade failures mean there is an existing working release that failed to transition to a new version. This guide covers the common causes and shows you how to configure proper remediation strategies.

## Understanding the Error

Check the HelmRelease status:

```bash
# List all HelmReleases with their status
flux get helmreleases -A

# Get the detailed error
kubectl describe helmrelease <name> -n <namespace>

# Check Helm history for the release
helm history <release-name> -n <namespace>
```

The error typically looks like:

```text
upgrade retries exhausted
```

With an underlying message such as:

```text
Helm upgrade failed: cannot patch "my-deployment" with kind Deployment: ...
```

## Cause 1: Immutable Field Changes

Kubernetes does not allow changes to certain fields after resource creation. Helm upgrade will fail when trying to modify these fields.

### Diagnosing

```bash
# Look for immutable field errors
kubectl logs -n flux-system deploy/helm-controller --tail=200 | grep -i "immutable\|cannot patch\|field is immutable"
```

Common immutable fields include:
- `spec.selector` in Deployments and StatefulSets
- `spec.volumeClaimTemplates` in StatefulSets
- `spec.ports[*].nodePort` in Services (when already assigned)

### Fix: Force Resource Replacement

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: my-namespace
spec:
  interval: 10m
  chart:
    spec:
      chart: my-chart
      version: "2.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  upgrade:
    # Force resource replacement for immutable field changes
    force: true
    # Note: force: true will delete and recreate resources
    # This causes brief downtime
```

### Fix: Delete the Conflicting Resource Manually

If you do not want to use `force: true` globally:

```bash
# Delete the specific resource that has immutable field conflict
kubectl delete deployment <name> -n <namespace>

# Then force Flux to reconcile
flux reconcile helmrelease <name> -n <namespace>
```

## Cause 2: Failed Helm Hooks

Pre-upgrade or post-upgrade hooks that fail will cause the upgrade to fail.

### Diagnosing

```bash
# Check for failed hook Jobs
kubectl get jobs -n <namespace> | grep -i "hook\|pre-\|post-"

# Look at the Job logs
kubectl logs job/<hook-job-name> -n <namespace>

# Check helm-controller logs for hook errors
kubectl logs -n flux-system deploy/helm-controller --tail=200 | grep -i "hook"
```

### Fix: Clean Up Failed Hook Jobs

```bash
# Delete failed hook Jobs so helm can create new ones
kubectl delete job -n <namespace> -l "helm.sh/hook"

# Force reconciliation
flux reconcile helmrelease <name> -n <namespace>
```

### Fix: Disable Hooks During Upgrade

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: my-namespace
spec:
  interval: 10m
  chart:
    spec:
      chart: my-chart
      version: "2.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  upgrade:
    # Skip hooks during upgrade if they are causing issues
    disableHooks: true
```

## Cause 3: Resource Conflicts with Other Controllers

Another controller (such as an operator or another HelmRelease) may own or modify resources that this chart also manages.

### Diagnosing

```bash
# Check resource annotations for ownership
kubectl get deployment <name> -n <namespace> -o yaml | grep -A3 "annotations"
# Look for: meta.helm.sh/release-name and meta.helm.sh/release-namespace

# Check if another HelmRelease manages the same resources
flux get helmreleases -n <namespace>
```

### Fix: Adopt Existing Resources

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: my-namespace
spec:
  interval: 10m
  chart:
    spec:
      chart: my-chart
      version: "2.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  upgrade:
    # Force ownership of resources
    force: true
  # Use server-side apply to handle ownership conflicts
  install:
    crds: CreateReplace
```

Or manually fix ownership annotations:

```bash
# Update the Helm ownership annotations on the conflicting resource
kubectl annotate deployment <name> -n <namespace> \
  meta.helm.sh/release-name=<helm-release-name> \
  meta.helm.sh/release-namespace=<namespace> \
  --overwrite
```

## Cause 4: Out of Memory or Disk During Upgrade

The upgrade process itself can fail if the cluster is resource-constrained.

### Diagnosing

```bash
# Check helm-controller resource usage
kubectl top pod -n flux-system -l app=helm-controller

# Check for OOMKilled events
kubectl describe pod -n flux-system -l app=helm-controller | grep -i "oom\|killed\|memory"
```

### Fix: Increase Helm Controller Resources

```bash
# Patch the helm-controller deployment with more resources
kubectl patch deployment helm-controller -n flux-system --type=json \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value": "1Gi"}]'
```

## Configuring Upgrade Remediation

Proper remediation configuration is critical for handling upgrade failures gracefully:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: my-namespace
spec:
  interval: 10m
  chart:
    spec:
      chart: my-chart
      version: "2.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  # Configure upgrade behavior
  upgrade:
    # Number of retries before remediation kicks in
    retries: 3
    # Clean up new resources on upgrade failure
    cleanupOnFail: true
    # Remediation strategy
    remediation:
      # Number of retries before taking remediation action
      retries: 3
      # Rollback to the last successful release on failure
      strategy: rollback
      # Or use uninstall strategy to start fresh
      # strategy: uninstall
  # Configure rollback behavior (used when strategy is rollback)
  rollback:
    # Keep the rollback release history
    cleanupOnFail: true
    # Recreate resources if needed during rollback
    force: false
    # Disable hooks during rollback
    disableHooks: false
```

## Remediation Strategies Explained

### Rollback Strategy

The rollback strategy reverts to the last successful Helm release:

```yaml
spec:
  upgrade:
    remediation:
      retries: 3
      # Roll back to previous working version
      strategy: rollback
  rollback:
    cleanupOnFail: true
    timeout: 5m
```

This is the safest option for production workloads because it restores the known-working state.

### Uninstall Strategy

The uninstall strategy removes the release entirely and lets Flux reinstall:

```yaml
spec:
  upgrade:
    remediation:
      retries: 3
      # Uninstall and reinstall from scratch
      strategy: uninstall
  install:
    remediation:
      retries: 3
```

Use this when the release state is corrupted beyond what a rollback can fix.

## Resetting After Retries Are Exhausted

Once retries are exhausted, you need to manually intervene:

### Option 1: Suspend, Fix, Resume

```bash
# Suspend to stop reconciliation
flux suspend helmrelease <name> -n <namespace>

# Fix the underlying issue (update values, fix chart, etc.)
# Then apply the fixed HelmRelease manifest
kubectl apply -f fixed-helmrelease.yaml

# Resume reconciliation
flux resume helmrelease <name> -n <namespace>
```

### Option 2: Manual Helm Rollback

```bash
# Check the release history
helm history <release-name> -n <namespace>

# Roll back to a working revision
helm rollback <release-name> <revision-number> -n <namespace>

# Force Flux to reconcile with the new state
flux reconcile helmrelease <name> -n <namespace>
```

### Option 3: Clean Slate

```bash
# Uninstall the Helm release manually
helm uninstall <release-name> -n <namespace>

# Delete the HelmRelease and recreate it
kubectl delete helmrelease <name> -n <namespace>
kubectl apply -f helmrelease.yaml

# Or force reconciliation
flux reconcile helmrelease <name> -n <namespace>
```

## Testing Upgrades Safely

Before pushing upgrade changes to Git:

```bash
# Render the new version and diff against the current state
helm template <release-name> <chart> \
  --version <new-version> \
  --namespace <namespace> \
  --values values.yaml > new-rendered.yaml

# Compare with current state
helm get manifest <release-name> -n <namespace> > current.yaml
diff current.yaml new-rendered.yaml

# Try a dry-run upgrade
helm upgrade <release-name> <chart> \
  --version <new-version> \
  --namespace <namespace> \
  --values values.yaml \
  --dry-run
```

## Prevention Best Practices

1. **Always configure remediation**: Never deploy a HelmRelease without upgrade remediation
2. **Use version pinning**: Pin chart versions to avoid unexpected upgrades
3. **Test locally first**: Run `helm upgrade --dry-run` before pushing changes
4. **Monitor releases**: Set up alerts for HelmRelease failures
5. **Keep release history small**: Large history can cause issues (see "request entity too large" error)

```yaml
# Recommended production HelmRelease template
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: my-namespace
spec:
  interval: 10m
  chart:
    spec:
      chart: my-chart
      version: "1.2.3"  # Always pin versions
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
      strategy: rollback
  rollback:
    cleanupOnFail: true
```

## Summary

The "upgrade retries exhausted" error means a Helm chart upgrade failed repeatedly. The most common causes are immutable field changes, failed hooks, and resource conflicts. Configure proper remediation with rollback strategies to handle failures gracefully. When retries are exhausted, you need to manually intervene by either suspending and resuming the HelmRelease, performing a manual Helm rollback, or doing a clean reinstall.
