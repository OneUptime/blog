# How to Roll Back a HelmRelease to a Previous Revision in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, HelmRelease, Rollback, Helm, Kubernetes, GitOps

Description: A step-by-step guide to rolling back HelmRelease resources to a previous revision in Flux CD.

---

Helm releases maintain a revision history, making it possible to roll back to a previously working version. With Flux CD managing your HelmReleases, rolling back requires understanding how Flux interacts with the Helm release lifecycle. This guide covers manual rollbacks, automated remediation, and best practices for HelmRelease rollback.

## How HelmRelease Revisions Work in Flux CD

Every time Flux upgrades a HelmRelease, Helm creates a new revision. These revisions are stored as Kubernetes Secrets in the release namespace.

```bash
# View Helm release history
helm history my-app -n default

# Example output:
# REVISION  STATUS      CHART           APP VERSION  DESCRIPTION
# 1         superseded  my-app-1.0.0    1.0.0        Install complete
# 2         superseded  my-app-1.1.0    1.1.0        Upgrade complete
# 3         deployed    my-app-1.2.0    1.2.0        Upgrade complete (current)

# View the Helm release secrets
kubectl get secrets -n default -l owner=helm,name=my-app
```

## Method 1: Rollback via Git Revert

The GitOps-native way to roll back a HelmRelease is to revert the Git commit that changed the chart version or values.

### Step 1: Find the Commit That Changed the HelmRelease

```bash
# Find commits that modified the HelmRelease file
git log --oneline -- clusters/production/apps/my-app/helmrelease.yaml

# Example output:
# c3d4e5f Update my-app chart to 1.2.0 (broken)
# a1b2c3d Update my-app chart to 1.1.0
# 8f9a0b1 Initial my-app HelmRelease

# View what changed
git show c3d4e5f -- clusters/production/apps/my-app/helmrelease.yaml
```

### Step 2: Revert the Commit

```bash
# Revert the commit that upgraded the chart
git revert c3d4e5f --no-edit

# Push to trigger Flux
git push origin main

# Force reconciliation
flux reconcile source git flux-system -n flux-system
flux reconcile helmrelease my-app -n default

# Watch the rollback progress
flux get helmrelease my-app -n default -w
```

## Method 2: Update the HelmRelease Version in Git

Instead of reverting, directly update the chart version to the previous working version.

```yaml
# clusters/production/apps/my-app/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 30m
  chart:
    spec:
      chart: my-app
      # Roll back by changing the version to the last known good
      version: "1.1.0"  # Changed from 1.2.0 back to 1.1.0
      sourceRef:
        kind: HelmRepository
        name: my-charts
        namespace: flux-system
  values:
    replicaCount: 3
    image:
      repository: registry.example.com/my-app
      # Also revert the image tag if it was changed
      tag: "v1.1.0"  # Changed from v1.2.0 back to v1.1.0
```

```bash
# Commit and push the version change
git add clusters/production/apps/my-app/helmrelease.yaml
git commit -m "Rollback my-app HelmRelease from 1.2.0 to 1.1.0"
git push origin main

# Trigger reconciliation
flux reconcile helmrelease my-app -n default
```

## Method 3: Use Helm CLI for Emergency Rollback

In an emergency, you can use the Helm CLI directly. Note that Flux will detect the drift and may re-apply the current Git state, so you must also fix Git.

```bash
# Step 1: Suspend Flux to prevent it from re-applying
flux suspend helmrelease my-app -n default

# Step 2: Roll back using Helm CLI
helm rollback my-app 2 -n default
# This rolls back to revision 2 (my-app-1.1.0)

# Step 3: Verify the rollback
helm status my-app -n default
kubectl get pods -n default -l app=my-app

# Step 4: Fix the HelmRelease in Git to match
# (edit helmrelease.yaml to version 1.1.0 and push)

# Step 5: Resume Flux
flux resume helmrelease my-app -n default
```

## Method 4: Configure Automated Rollback

Set up HelmRelease remediation so Flux automatically rolls back on failure.

```yaml
# clusters/production/apps/my-app/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 30m
  chart:
    spec:
      chart: my-app
      version: "1.2.0"
      sourceRef:
        kind: HelmRepository
        name: my-charts
        namespace: flux-system

  # Configure install remediation
  install:
    remediation:
      # Number of retries before giving up
      retries: 3

  # Configure upgrade remediation
  upgrade:
    remediation:
      # Number of retries before rolling back
      retries: 3
      # Strategy: rollback to last successful release
      strategy: rollback
    # Clean up resources from failed upgrade
    cleanupOnFail: true
    # Force resource updates even if conflicts exist
    force: false

  # Configure rollback behavior
  rollback:
    # Timeout for the rollback operation
    timeout: 5m
    # Recreate resources if needed during rollback
    recreate: false
    # Run hooks during rollback
    disableHooks: false
    # Wait for rollback to complete
    disableWait: false
    # Clean up resources created during failed upgrade
    cleanupOnFail: true

  # Test hooks run after install/upgrade
  test:
    enable: true
    # If tests fail, trigger rollback
    ignoreFailures: false

  values:
    replicaCount: 3
    image:
      repository: registry.example.com/my-app
      tag: "v1.2.0"
```

### Understanding Remediation Strategies

```yaml
# Strategy: rollback
# Rolls back to the last successful Helm release revision
upgrade:
  remediation:
    retries: 3
    strategy: rollback

# Strategy: uninstall
# Uninstalls the release and reinstalls from scratch
upgrade:
  remediation:
    retries: 3
    strategy: uninstall
```

## Method 5: Roll Back Values Only

Sometimes the chart version is fine but the values caused the issue.

```yaml
# clusters/production/apps/my-app/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 30m
  chart:
    spec:
      chart: my-app
      version: "1.2.0"  # Keep the same chart version
      sourceRef:
        kind: HelmRepository
        name: my-charts
        namespace: flux-system
  values:
    # Roll back just the values that caused the issue
    replicaCount: 3
    image:
      repository: registry.example.com/my-app
      tag: "v1.2.0"
    # Revert the problematic configuration change
    resources:
      requests:
        cpu: 200m
        memory: 256Mi  # Was changed to 64Mi causing OOM
      limits:
        cpu: "1"
        memory: 512Mi  # Was changed to 128Mi causing OOM

    # Revert environment variable changes
    env:
      - name: LOG_LEVEL
        value: "info"  # Was changed to "debug" causing disk pressure
      - name: MAX_CONNECTIONS
        value: "100"  # Was changed to "10000" causing port exhaustion
```

```bash
# Commit and push the values rollback
git add clusters/production/apps/my-app/helmrelease.yaml
git commit -m "Rollback my-app values: restore memory limits and env vars"
git push origin main

# Force reconciliation
flux reconcile helmrelease my-app -n default
```

## Monitoring HelmRelease Rollbacks

### Set Up Alerts for Rollback Events

```yaml
# alerts/helmrelease-rollback-alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack-helm
  namespace: flux-system
spec:
  type: slack
  channel: helm-alerts
  secretRef:
    name: slack-webhook-url
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: helmrelease-rollback
  namespace: flux-system
spec:
  providerRef:
    name: slack-helm
  eventSeverity: error
  eventSources:
    - kind: HelmRelease
      name: "*"
      namespace: default
  # Alert on upgrade failures and rollbacks
  inclusionList:
    - ".*[Uu]pgrade.*fail.*"
    - ".*[Rr]ollback.*"
    - ".*[Rr]emediat.*"
```

### Check Rollback History

```bash
# View the Flux HelmRelease conditions
kubectl get helmrelease my-app -n default -o yaml | \
  grep -A 20 "conditions:"

# Check Helm release history for rollback entries
helm history my-app -n default

# View Flux events for the HelmRelease
kubectl get events -n default \
  --field-selector involvedObject.kind=HelmRelease,involvedObject.name=my-app \
  --sort-by=.lastTimestamp

# Check Flux logs for rollback details
flux logs --kind=HelmRelease --name=my-app --namespace=default --since=30m
```

## Verifying a Successful Rollback

```bash
# Step 1: Confirm the HelmRelease is healthy
flux get helmrelease my-app -n default
# Should show: Ready True

# Step 2: Check the deployed chart version
helm list -n default -f my-app
# Should show version 1.1.0 (or whatever you rolled back to)

# Step 3: Verify pods are running with the correct image
kubectl get pods -n default -l app=my-app \
  -o custom-columns="POD:.metadata.name,IMAGE:.spec.containers[0].image,STATUS:.status.phase"

# Step 4: Run Helm tests if configured
helm test my-app -n default

# Step 5: Check application health
kubectl exec deployment/my-app -n default -- \
  wget -q -O- http://localhost:8080/health
```

## Best Practices for HelmRelease Rollbacks

### Always Configure Remediation

```yaml
# Every production HelmRelease should have remediation configured
spec:
  upgrade:
    remediation:
      retries: 3
      strategy: rollback
  rollback:
    cleanupOnFail: true
```

### Keep Sufficient Release History

```yaml
# Increase Helm history limit for more rollback options
spec:
  # Keep last 10 releases (default is 10)
  # Decrease only if you have storage concerns
  historyLimit: 10
```

### Use Version Constraints

```yaml
# Use version constraints to prevent unexpected major upgrades
spec:
  chart:
    spec:
      chart: my-app
      # Only allow patch versions within 1.1.x
      version: ">=1.1.0 <1.2.0"
      sourceRef:
        kind: HelmRepository
        name: my-charts
        namespace: flux-system
```

### Test Before Production

```yaml
# Run Helm test hooks to validate releases
spec:
  test:
    enable: true
    ignoreFailures: false
  # Configure post-install and post-upgrade test hooks in your chart
  # templates/tests/test-connection.yaml in your Helm chart
```

## Summary

Rolling back a HelmRelease in Flux CD can be done through:

1. **Git revert** - Revert the commit that changed the HelmRelease (preferred GitOps approach)
2. **Version change** - Update the chart version in Git to a previous version
3. **Helm CLI** - Use `helm rollback` for emergencies (must also fix Git)
4. **Automated remediation** - Configure `upgrade.remediation.strategy: rollback`
5. **Values rollback** - Revert only the values without changing the chart version

Always configure remediation on production HelmReleases so Flux can automatically roll back failed upgrades. After any rollback, verify the release is healthy using `flux get helmrelease`, `helm list`, and application health checks.
