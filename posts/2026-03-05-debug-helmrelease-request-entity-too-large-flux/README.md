# How to Debug HelmRelease Request Entity Too Large Error in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Debugging, Request Entity Too Large, Release History

Description: Learn how to diagnose and fix the 'request entity too large' error in Flux CD HelmRelease caused by oversized Helm release secrets.

---

The "request entity too large" error is one of the more frustrating HelmRelease failures in Flux CD. It occurs when the Helm release secret -- which stores the full rendered manifests for each release version -- exceeds the Kubernetes Secret size limit of 1 MiB. This error typically surfaces after multiple upgrades when the release history grows too large, or when deploying charts that produce very large rendered output.

## Understanding the Problem

Helm stores its release state as Kubernetes Secrets (or ConfigMaps, depending on the storage driver). Each release version is stored as a separate Secret containing:

- The rendered manifests (all YAML output from `helm template`)
- The chart metadata
- The values used for the release
- Release metadata (version number, status, timestamps)

This data is base64-encoded and compressed, but for large charts or charts with many resources, a single release Secret can approach or exceed the 1 MiB limit.

```mermaid
graph TD
    A[Helm Upgrade] --> B[Render Templates]
    B --> C[Create Release Secret]
    C --> D{Secret size > 1 MiB?}
    D -->|Yes| E[request entity too large]
    D -->|No| F[Secret Created]
    F --> G[Apply Manifests]
    E --> H[Upgrade Fails]
```

## Step 1: Confirm the Error

Check the HelmRelease status for the specific error:

```bash
# Check the HelmRelease status
flux get helmrelease my-app -n default

# Look for the specific error message
kubectl describe helmrelease my-app -n default | grep -i "too large\|entity"

# Check helm-controller logs
kubectl logs -n flux-system deployment/helm-controller | grep "too large" | grep "my-app"
```

The error message typically reads: `Request entity too large: limit is 3145728` or similar.

## Step 2: Assess the Current Release History

Check how many release versions are stored and how large they are:

```bash
# List all Helm release secrets for the release
kubectl get secrets -n default -l name=my-app,owner=helm --sort-by='{.metadata.creationTimestamp}'

# Check the size of each release secret
kubectl get secrets -n default -l name=my-app,owner=helm -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.metadata.creationTimestamp}{"\n"}{end}'

# Get the size of the latest release secret in bytes
kubectl get secret -n default sh.helm.release.v1.my-app.v1 -o json | wc -c
```

## Step 3: Reduce Release History

The most common fix is to reduce the number of historical releases stored by Helm. Each release revision is kept as a separate Secret, and having many revisions compounds the storage issue.

### Set historyLimit on the HelmRelease

```yaml
# HelmRelease with limited release history
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
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  # Limit the number of Helm release versions stored
  # This controls how many release Secrets are kept
  historyLimit: 3
```

The `historyLimit` field tells Flux to clean up old release Secrets, keeping only the specified number of versions.

### Manually Clean Up Old Release Secrets

If you are already in the error state and cannot upgrade, manually remove old release Secrets:

```bash
# List all release secrets, sorted by creation time
kubectl get secrets -n default -l name=my-app,owner=helm \
  --sort-by='{.metadata.creationTimestamp}' \
  -o custom-columns='NAME:.metadata.name,CREATED:.metadata.creationTimestamp'

# Delete old release secrets, keeping only the most recent
# For example, if you have versions v1 through v20, delete v1 through v17
kubectl delete secret -n default sh.helm.release.v1.my-app.v1
kubectl delete secret -n default sh.helm.release.v1.my-app.v2
kubectl delete secret -n default sh.helm.release.v1.my-app.v3
# Continue deleting old versions...
```

Alternatively, delete all but the latest:

```bash
# Get the latest version number
LATEST=$(helm history my-app -n default --max 1 -o json | jq '.[0].revision')

# Delete all secrets except the latest
kubectl get secrets -n default -l name=my-app,owner=helm -o name | \
  grep -v "v${LATEST}$" | \
  xargs kubectl delete -n default
```

## Step 4: Reduce Chart Output Size

If the chart itself produces very large rendered output (approaching 1 MiB for a single release), you need to reduce the chart size.

### Disable Unnecessary Resources

Many charts include optional resources that can be disabled:

```yaml
# Reduce chart output by disabling unused features
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
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  values:
    # Disable optional components to reduce manifest size
    metrics:
      enabled: false
    networkPolicies:
      enabled: false
    podDisruptionBudget:
      enabled: false
    tests:
      enabled: false
```

### Split Large Charts

If you maintain the chart, consider splitting it into smaller sub-charts:

```yaml
# Deploy components as separate HelmReleases
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app-core
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app-core
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app-monitoring
  namespace: default
spec:
  dependsOn:
    - name: my-app-core
  interval: 10m
  chart:
    spec:
      chart: my-app-monitoring
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
```

## Step 5: Recover After Cleanup

After reducing the history or chart size, trigger a fresh reconciliation:

```bash
# Suspend the HelmRelease
flux suspend helmrelease my-app -n default

# Resume to trigger reconciliation
flux resume helmrelease my-app -n default

# Watch for successful upgrade
flux get helmrelease my-app -n default --watch
```

## Step 6: Prevent Future Occurrences

Add the following configuration to all HelmReleases as a preventive measure:

```yaml
# Preventive configuration
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  # Keep only 3 release versions
  historyLimit: 3
  chart:
    spec:
      chart: my-app
      sourceRef:
        kind: HelmRepository
        name: my-repo
        namespace: flux-system
  upgrade:
    # Clean up new resources on failed upgrade to reduce state
    cleanupOnFail: true
```

## Monitoring Release Secret Sizes

You can set up a periodic check to monitor release secret sizes:

```bash
# Script to check all Helm release secret sizes across namespaces
kubectl get secrets --all-namespaces -l owner=helm -o json | \
  jq -r '.items[] | "\(.metadata.namespace)/\(.metadata.name)\t\(.data | tostring | length)"' | \
  sort -t$'\t' -k2 -n -r | \
  head -20
```

## Quick Reference: Recovery Steps

```bash
# 1. Confirm the error
kubectl describe helmrelease my-app -n default | grep "too large"

# 2. Count release secrets
kubectl get secrets -n default -l name=my-app,owner=helm | wc -l

# 3. Delete old secrets (keep last 2-3)
kubectl get secrets -n default -l name=my-app,owner=helm --sort-by='{.metadata.creationTimestamp}' -o name | head -n -3 | xargs kubectl delete -n default

# 4. Add historyLimit to HelmRelease (in Git)
# historyLimit: 3

# 5. Reset the HelmRelease
flux suspend helmrelease my-app -n default
flux resume helmrelease my-app -n default
```

## Best Practices

1. **Always set historyLimit.** Default to 3-5 for most releases to prevent unbounded history growth.
2. **Monitor secret sizes.** Set up alerts for release secrets approaching the 1 MiB limit.
3. **Split large charts.** If a single chart produces hundreds of resources, consider breaking it into smaller charts.
4. **Clean up regularly.** Include release history cleanup in your operational runbooks.
5. **Disable unused chart features.** Every disabled optional component reduces the rendered output size.

## Conclusion

The "request entity too large" error in Flux is caused by Helm release Secrets exceeding the Kubernetes 1 MiB limit. The primary fix is setting `historyLimit` on your HelmRelease to prevent unbounded history growth. For charts with inherently large output, consider splitting them into smaller sub-charts or disabling unused features. Regular monitoring and cleanup of release Secrets prevent this issue from recurring.
