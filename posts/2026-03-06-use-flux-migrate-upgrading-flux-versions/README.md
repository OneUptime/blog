# How to Use flux migrate for Upgrading Flux Versions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, fluxcd, GitOps, Kubernetes, CLI, Migrate, Upgrade, Version-management

Description: Learn how to use the flux migrate command to safely upgrade between Flux CD versions and migrate deprecated API resources.

---

## Introduction

As Flux CD evolves, APIs change, new features are added, and older resource versions get deprecated. The `flux migrate` command helps you upgrade your Flux resources to newer API versions, ensuring compatibility with the latest Flux controllers. This guide covers how to plan and execute Flux migrations safely.

## Prerequisites

- Flux CLI installed (latest version recommended)
- A running Kubernetes cluster with Flux installed
- kubectl configured with cluster access
- A Git repository containing your Flux resource definitions
- Backup of your current Flux resources

## Understanding Flux API Evolution

Flux CD resources go through standard Kubernetes API versioning stages:

```mermaid
graph LR
    A[v1alpha1] --> B[v1beta1]
    B --> C[v1beta2]
    C --> D[v1]
    D --> E[Stable / GA]
```

When Flux controllers are upgraded, they may stop supporting older API versions. The `flux migrate` command rewrites your resource manifests to use the latest API versions.

## When to Migrate

You need to run migrations when:

- Upgrading Flux to a new minor or major version
- Flux deprecation warnings appear in controller logs
- `flux check` reports API version incompatibilities
- You see validation errors after upgrading controllers

## Checking for Deprecated APIs

Before migrating, identify which resources need updates:

```bash
# Check Flux installation health (will report API issues)
flux check

# Look for deprecation warnings in controller logs
kubectl logs -n flux-system deployment/kustomize-controller --tail=100 | grep -i deprecat

# Check for older API versions in your manifests
grep -r "v1beta1\|v1beta2\|v1alpha1" ./clusters/ --include="*.yaml"
```

## Basic Migration

The `flux migrate` command scans your manifests and updates API versions:

```bash
# Migrate manifests in a directory (dry-run first)
flux migrate -f ./clusters/production/ --dry-run

# Apply the migration (modifies files in place)
flux migrate -f ./clusters/production/
```

## Migrating Specific Resource Types

### Kustomization API Migration

Kustomizations migrated from `v1beta2` to `v1`:

```bash
# Before migration (old API version)
cat <<'YAML'
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./deploy
  prune: true
  sourceRef:
    kind: GitRepository
    name: my-app
YAML

# After migration (new API version)
cat <<'YAML'
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./deploy
  prune: true
  sourceRef:
    kind: GitRepository
    name: my-app
YAML
```

### GitRepository API Migration

```bash
# Before migration
cat <<'YAML'
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 1m
  ref:
    branch: main
  url: https://github.com/myorg/my-app
YAML

# After migration
cat <<'YAML'
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 1m
  ref:
    branch: main
  url: https://github.com/myorg/my-app
YAML
```

### HelmRelease API Migration

HelmReleases migrated from `v2beta1` to `v2`:

```bash
# Before migration
cat <<'YAML'
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: nginx
      version: ">=15.0.0"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
YAML

# After migration
cat <<'YAML'
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: nginx
      version: ">=15.0.0"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
YAML
```

## Step-by-Step Upgrade Process

Here is the recommended process for a full Flux upgrade:

```bash
#!/bin/bash
# flux-upgrade.sh
# Complete Flux upgrade workflow

set -euo pipefail

CLUSTER_PATH="./clusters/production"

echo "=== Flux Upgrade Process ==="
echo ""

# Step 1: Backup current state
echo "Step 1: Backing up current Flux resources..."
BACKUP_DIR="./flux-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "${BACKUP_DIR}"
flux export source all -A > "${BACKUP_DIR}/sources.yaml" 2>/dev/null || true
flux export kustomization -A > "${BACKUP_DIR}/kustomizations.yaml" 2>/dev/null || true
flux export helmrelease -A > "${BACKUP_DIR}/helmreleases.yaml" 2>/dev/null || true
echo "  Backup saved to: ${BACKUP_DIR}"
echo ""

# Step 2: Check current versions
echo "Step 2: Current versions:"
flux version
echo ""

# Step 3: Upgrade the CLI
echo "Step 3: Upgrade the Flux CLI to the latest version"
echo "  Run: brew upgrade fluxcd/tap/flux  (macOS)"
echo "  Or:  curl -s https://fluxcd.io/install.sh | sudo bash  (Linux)"
echo ""

# Step 4: Run pre-flight checks
echo "Step 4: Running pre-flight checks..."
flux check --pre
echo ""

# Step 5: Migrate manifests (dry-run first)
echo "Step 5: Checking for API migrations (dry-run)..."
flux migrate -f "${CLUSTER_PATH}" --dry-run 2>&1 || echo "  No migrations needed."
echo ""

# Step 6: Apply migrations
echo "Step 6: Apply API migrations..."
flux migrate -f "${CLUSTER_PATH}" --yes 2>&1 || echo "  No migrations needed."
echo ""

# Step 7: Upgrade cluster components
echo "Step 7: Upgrading cluster components..."
flux install
echo ""

# Step 8: Verify the upgrade
echo "Step 8: Verifying upgrade..."
flux version
flux check
echo ""

echo "=== Upgrade Complete ==="
```

## Handling Breaking Changes

Some upgrades introduce breaking changes that require manual intervention:

```bash
# Check the Flux release notes for breaking changes
# https://github.com/fluxcd/flux2/releases

# Common breaking changes to watch for:

# 1. Field renames
# Old: spec.validation (removed in v1)
# New: No replacement (validation is always enabled)

# 2. Default value changes
# Some default values change between versions
# Review your resources after migration

# 3. Removed features
# Check if any features you use have been removed
```

## Migrating Notification Resources

Notification APIs also undergo version changes:

```bash
# Migrate alert and provider resources
# Before (v1beta2)
cat <<'YAML'
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: my-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSources:
    - kind: Kustomization
      name: '*'
  eventSeverity: error
YAML

# After (v1beta3)
cat <<'YAML'
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: my-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSources:
    - kind: Kustomization
      name: '*'
  eventSeverity: error
YAML
```

## Automated Migration Script

Here is a script for bulk migration across multiple directories:

```bash
#!/bin/bash
# bulk-migrate.sh
# Migrate all Flux manifests across multiple cluster directories

set -euo pipefail

BASE_PATH="./clusters"
LOG_FILE="./migration-$(date +%Y%m%d-%H%M%S).log"

echo "=== Flux Bulk Migration ===" | tee "${LOG_FILE}"
echo "Base path: ${BASE_PATH}" | tee -a "${LOG_FILE}"
echo "" | tee -a "${LOG_FILE}"

# Find all directories containing Flux manifests
DIRS=$(find "${BASE_PATH}" -name "*.yaml" -exec grep -l "toolkit.fluxcd.io" {} \; | \
  xargs -I{} dirname {} | sort -u)

for DIR in ${DIRS}; do
  echo "Processing: ${DIR}" | tee -a "${LOG_FILE}"

  # Dry-run first
  DRY_OUTPUT=$(flux migrate -f "${DIR}" --dry-run 2>&1 || true)

  if echo "${DRY_OUTPUT}" | grep -q "migrated"; then
    echo "  Changes needed:" | tee -a "${LOG_FILE}"
    echo "${DRY_OUTPUT}" | tee -a "${LOG_FILE}"

    # Apply the migration
    flux migrate -f "${DIR}" --yes 2>&1 | tee -a "${LOG_FILE}"
    echo "  Migration applied." | tee -a "${LOG_FILE}"
  else
    echo "  No changes needed." | tee -a "${LOG_FILE}"
  fi

  echo "" | tee -a "${LOG_FILE}"
done

echo "Migration complete. Log saved to: ${LOG_FILE}"
```

## Manual Migration with sed

For simple API version updates, you can use sed as a fallback:

```bash
# Update Kustomization API version from v1beta2 to v1
find ./clusters/ -name "*.yaml" -exec \
  sed -i '' 's|kustomize.toolkit.fluxcd.io/v1|kustomize.toolkit.fluxcd.io/v1|g' {} \;

# Update GitRepository API version from v1beta2 to v1
find ./clusters/ -name "*.yaml" -exec \
  sed -i '' 's|source.toolkit.fluxcd.io/v1|source.toolkit.fluxcd.io/v1|g' {} \;

# Update HelmRelease API version from v2beta1 to v2
find ./clusters/ -name "*.yaml" -exec \
  sed -i '' 's|helm.toolkit.fluxcd.io/v2|helm.toolkit.fluxcd.io/v2|g' {} \;

# Update HelmRepository API version
find ./clusters/ -name "*.yaml" -exec \
  sed -i '' 's|source.toolkit.fluxcd.io/v1|source.toolkit.fluxcd.io/v1|g' {} \;
```

Note: The `sed` approach only handles API version strings. The `flux migrate` command is preferred because it can also handle field renames and structural changes.

## Validating After Migration

After migrating, validate your resources:

```bash
# Validate manifests with kubectl dry-run
find ./clusters/ -name "*.yaml" -exec kubectl apply --dry-run=server -f {} \;

# Check that Flux can reconcile the migrated resources
flux reconcile kustomization flux-system --namespace=flux-system

# Watch for reconciliation errors
flux get kustomizations -A
flux get helmreleases -A
flux get sources all -A

# Check controller logs for errors
kubectl logs -n flux-system deployment/kustomize-controller --tail=50
kubectl logs -n flux-system deployment/source-controller --tail=50
```

## Rollback Strategy

If the migration causes issues, roll back:

```bash
# Option 1: Restore from backup
kubectl apply -f ./flux-backup-20260306-120000/sources.yaml
kubectl apply -f ./flux-backup-20260306-120000/kustomizations.yaml
kubectl apply -f ./flux-backup-20260306-120000/helmreleases.yaml

# Option 2: Revert Git changes
git checkout -- ./clusters/
git push

# Option 3: Downgrade Flux controllers
# Install the previous version of the CLI
curl -s https://fluxcd.io/install.sh | sudo FLUX_VERSION=2.3.0 bash

# Downgrade cluster components
flux install
```

## Best Practices

1. **Always backup first**: Export all Flux resources before migrating.
2. **Use dry-run mode**: Run `flux migrate -f <path> --dry-run` first to preview changes.
3. **Migrate in staging first**: Test migrations in non-production environments.
4. **Upgrade CLI before controllers**: The new CLI understands both old and new APIs.
5. **Read release notes**: Check for breaking changes before upgrading.
6. **Validate after migration**: Use `kubectl apply --dry-run=server` to catch errors early.
7. **Commit migrations separately**: Keep migration commits separate from feature changes for easy rollback.

## Summary

The `flux migrate` command simplifies the process of upgrading Flux CD resources to newer API versions. By following a structured upgrade process -- backup, dry-run, migrate, upgrade controllers, validate -- you can safely evolve your Flux installation without disrupting your deployed workloads. Always test migrations in a non-production environment first and maintain backups for quick rollback if needed.
