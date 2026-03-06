# How to Upgrade Flux CD Minor Versions Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Upgrade, Kubernetes, GitOps, minor version, Best Practices, Cluster Management

Description: A comprehensive guide to safely upgrading Flux CD between minor versions with pre-checks, testing strategies, and rollback plans.

---

## Introduction

Flux CD follows semantic versioning, where minor version upgrades (for example, v2.2.x to v2.3.x) introduce new features and may include deprecations. These upgrades require more care than patch updates because they can change behavior, introduce new CRD fields, or deprecate existing ones. This guide provides a safe, methodical approach to performing minor version upgrades.

## Understanding Flux CD Versioning

Flux CD uses semantic versioning for its CLI and each of its controllers:

- **Major version**: Breaking changes (rare, well-communicated)
- **Minor version**: New features, possible deprecations
- **Patch version**: Bug fixes and security patches

Each Flux release includes coordinated versions of all controllers:

- Source Controller
- Kustomize Controller
- Helm Controller
- Notification Controller
- Image Reflector Controller
- Image Automation Controller

## Step 1: Review the Release Notes

Before upgrading, thoroughly review the release notes for every minor version between your current version and the target version.

```bash
# Check your current Flux version
flux version

# View the installed component versions
flux version --client=false

# Check available versions
flux version --available
```

Review release notes at the Flux CD GitHub repository:

```bash
# View release notes using GitHub CLI
gh release list --repo fluxcd/flux2 --limit 10

# View specific release notes
gh release view v2.3.0 --repo fluxcd/flux2
```

## Step 2: Check for Deprecation Warnings

Before upgrading, check for any deprecation warnings in your current installation.

```bash
# Check controller logs for deprecation warnings
kubectl logs -n flux-system deploy/source-controller | grep -i deprecat
kubectl logs -n flux-system deploy/kustomize-controller | grep -i deprecat
kubectl logs -n flux-system deploy/helm-controller | grep -i deprecat

# Check events for warnings
kubectl get events -n flux-system --field-selector type=Warning

# Validate your resources against the current API versions
flux get all --all-namespaces
```

## Step 3: Backup Current State

Create a comprehensive backup before performing the upgrade.

```bash
# Export all Flux custom resources
# This captures your complete Flux configuration
flux export source git --all > backup/git-sources.yaml
flux export source helm --all > backup/helm-sources.yaml
flux export kustomization --all > backup/kustomizations.yaml
flux export helmrelease --all > backup/helmreleases.yaml
flux export image repository --all > backup/image-repos.yaml
flux export image policy --all > backup/image-policies.yaml
flux export image update --all > backup/image-updates.yaml
flux export alert --all > backup/alerts.yaml
flux export alert-provider --all > backup/alert-providers.yaml

# Export CRDs for reference
kubectl get crds -o yaml | grep -A 5 'fluxcd.io' > backup/crds.yaml

# Take a snapshot of controller deployments
kubectl get deployments -n flux-system -o yaml > backup/deployments.yaml
```

## Step 4: Test in a Non-Production Environment

Always test the upgrade in a staging or development environment first.

```yaml
# Create a test Kustomization that mirrors production
# test-cluster/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: test-cluster
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-config
  path: ./clusters/staging
  prune: true
  # Enable health checks to verify the upgrade
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: source-controller
      namespace: flux-system
    - apiVersion: apps/v1
      kind: Deployment
      name: kustomize-controller
      namespace: flux-system
    - apiVersion: apps/v1
      kind: Deployment
      name: helm-controller
      namespace: flux-system
```

## Step 5: Pre-Upgrade Validation

Run the Flux pre-checks to ensure your cluster is ready for the upgrade.

```bash
# Run comprehensive pre-flight checks
flux check --pre

# Verify all current reconciliations are healthy
flux get all --all-namespaces --status-selector ready=true

# Check for any suspended resources that need attention
flux get all --all-namespaces --status-selector suspended=true

# Ensure no reconciliations are currently failing
flux get all --all-namespaces --status-selector ready=false
```

## Step 6: Perform the Upgrade

With preparations complete, perform the actual upgrade.

### Option A: Upgrade Using the CLI

```bash
# Upgrade Flux components to the latest minor version
# The --export flag lets you preview changes before applying
flux install --export > flux-upgrade-preview.yaml

# Review the changes
diff <(kubectl get deploy -n flux-system -o yaml) flux-upgrade-preview.yaml

# Apply the upgrade
flux install

# If you use specific components, specify them
flux install \
  --components=source-controller,kustomize-controller,helm-controller,notification-controller \
  --components-extra=image-reflector-controller,image-automation-controller
```

### Option B: Upgrade Using GitOps

If you manage Flux itself via GitOps, update the manifests in your repository.

```yaml
# clusters/production/flux-system/gotk-components.yaml
# Update the Flux components manifest
# Generate the updated manifest:
# flux install --export > clusters/production/flux-system/gotk-components.yaml
```

```bash
# Generate updated manifests for a specific version
flux install --version=v2.3.0 --export > clusters/production/flux-system/gotk-components.yaml

# Commit and push the changes
git add clusters/production/flux-system/gotk-components.yaml
git commit -m "Upgrade Flux CD to v2.3.0"
git push origin main
```

## Step 7: Update CRDs

Minor version upgrades may include CRD changes. Ensure CRDs are updated as part of the upgrade process.

```bash
# Check if CRDs need updating
kubectl get crds -o custom-columns=NAME:.metadata.name,VERSION:.metadata.labels.app\\.kubernetes\\.io/version \
  | grep fluxcd

# Apply updated CRDs from the new version
flux install --crds=CreateReplace

# Verify CRD versions after upgrade
kubectl get crds | grep fluxcd
```

## Step 8: Post-Upgrade Verification

After the upgrade, run a comprehensive set of checks.

```bash
# Verify all Flux components are running the new version
flux version

# Run health checks
flux check

# Verify all sources are reconciling
flux get sources all --all-namespaces

# Verify all Kustomizations are healthy
flux get kustomizations --all-namespaces

# Verify all HelmReleases are healthy
flux get helmreleases --all-namespaces

# Check controller logs for errors
kubectl logs -n flux-system deploy/source-controller --tail=20
kubectl logs -n flux-system deploy/kustomize-controller --tail=20
kubectl logs -n flux-system deploy/helm-controller --tail=20

# Force reconciliation of critical resources
flux reconcile kustomization flux-system -n flux-system
```

## Step 9: Monitor After Upgrade

Set up monitoring to catch any issues that surface after the upgrade.

```yaml
# alert.yaml
# Configure alerts for reconciliation failures after upgrade
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: post-upgrade-monitor
  namespace: flux-system
spec:
  # Send alerts for any reconciliation failure
  eventSeverity: error
  # Monitor all Flux resource types
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
    - kind: GitRepository
      name: "*"
    - kind: HelmRepository
      name: "*"
  providerRef:
    name: slack-provider
---
# alert-provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack-provider
  namespace: flux-system
spec:
  type: slack
  channel: flux-alerts
  secretRef:
    name: slack-webhook-url
```

## Step 10: Handle API Version Migrations

Minor versions may introduce new API versions. Update your resources to use the latest stable API versions.

```yaml
# Before: using older API version
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  url: https://charts.bitnami.com/bitnami
  interval: 10m

---
# After: updated to stable API version
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  url: https://charts.bitnami.com/bitnami
  interval: 10m
```

```bash
# Find resources using beta API versions
kubectl get helmrepositories.source.toolkit.fluxcd.io -A -o yaml | grep apiVersion
kubectl get kustomizations.kustomize.toolkit.fluxcd.io -A -o yaml | grep apiVersion
kubectl get helmreleases.helm.toolkit.fluxcd.io -A -o yaml | grep apiVersion
```

## Upgrade Checklist

1. Review release notes for all versions between current and target
2. Check for deprecation warnings in controller logs
3. Backup all Flux custom resources
4. Test the upgrade in a non-production environment
5. Run pre-flight checks with `flux check --pre`
6. Perform the upgrade (CLI or GitOps)
7. Update CRDs if needed
8. Verify all components are running new versions
9. Run post-upgrade health checks
10. Monitor for reconciliation failures
11. Update resources to use latest API versions
12. Document the upgrade for team reference

## Troubleshooting

### Controllers Not Starting After Upgrade

```bash
# Check for resource constraint issues
kubectl describe deploy -n flux-system source-controller

# Check for RBAC issues with new features
kubectl get clusterrolebinding | grep flux

# Review controller events
kubectl get events -n flux-system --sort-by=.lastTimestamp
```

### Reconciliation Failures After Upgrade

```bash
# Identify failing resources
flux get all --all-namespaces --status-selector ready=false

# Force reconciliation
flux reconcile kustomization --all -n flux-system

# Check if CRD changes caused schema validation failures
kubectl describe kustomization <name> -n <namespace>
```

## Conclusion

Upgrading Flux CD minor versions safely requires preparation, testing, and monitoring. By following a structured approach with backups, staging environment testing, and post-upgrade verification, you can minimize risk and downtime. Always review release notes carefully, as minor versions may introduce behavioral changes that affect your deployments.
