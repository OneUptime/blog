# How to Migrate from Helm v2 Tiller-Based Releases to Helm v3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Helm, Kubernetes, Migration, DevOps

Description: Complete guide to migrating from Helm 2 with Tiller to Helm 3's improved architecture, including automated conversion tools and handling edge cases during the transition.

---

Helm 3 removed the server-side component Tiller, fundamentally changing how Helm interacts with Kubernetes clusters. This architectural shift improved security and simplified operations, but it also means existing Helm 2 releases need careful migration. This guide provides a comprehensive approach to transitioning your Helm 2 deployments to Helm 3.

## Why Migrate from Helm 2 to Helm 3

Helm 2 relied on Tiller, a cluster-side component that managed releases. This created several problems including security concerns around Tiller's cluster-admin permissions, complexity in multi-tenant environments, and additional operational overhead.

Helm 3 eliminated Tiller entirely, using Kubernetes RBAC directly. It stores release information as Secrets in the same namespace as the release, improving security and making the system more transparent. Chart schemas, library charts, and improved upgrade strategies make Helm 3 significantly more powerful.

The good news is that Helm provides official migration tools to automate most of the conversion process.

## Pre-Migration Assessment

Before starting the migration, inventory your existing Helm 2 releases across all namespaces:

```bash
# List all Helm 2 releases
helm2 list --all --all-namespaces

# Export release details to CSV for tracking
helm2 list --all --all-namespaces --output json | \
  jq -r '.Releases[] | [.Name, .Namespace, .Status, .Chart] | @csv' > releases.csv
```

Check your Helm 2 version:

```bash
helm2 version
```

Ensure you have Helm 3 installed alongside Helm 2. Many systems use aliases or different binary names to run both versions simultaneously:

```bash
# Install Helm 3
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify both versions
helm2 version --short
helm3 version --short
```

## Installing the 2to3 Plugin

Helm provides an official plugin to automate the migration process:

```bash
# Install the Helm 2to3 plugin
helm3 plugin install https://github.com/helm/helm-2to3

# Verify plugin installation
helm3 plugin list
```

This plugin handles the conversion of Helm 2 release data to Helm 3 format, including configuration migration and cleanup.

## Step 1: Migrate Helm Configuration

First, migrate your Helm 2 configuration, including repository settings and plugins:

```bash
# Backup Helm 2 config
cp -r ~/.helm ~/.helm.backup

# Migrate config
helm3 2to3 move config

# Verify repositories migrated
helm3 repo list
```

This command copies your Helm 2 repository configurations, starters, and plugins to Helm 3's configuration directory. Your original Helm 2 config remains unchanged.

If you have custom plugin configurations, verify they work with Helm 3:

```bash
# Test plugins
helm3 plugin list
helm3 <plugin-command> --help
```

## Step 2: Migrate Individual Releases

The core migration step converts Helm 2 release metadata to Helm 3 Secrets. You can migrate releases one at a time or in bulk.

Migrate a single release:

```bash
# Dry run first
helm3 2to3 convert RELEASE_NAME --dry-run

# Actual migration
helm3 2to3 convert RELEASE_NAME

# Verify the conversion
helm3 list -n NAMESPACE
helm3 history RELEASE_NAME -n NAMESPACE
```

For clusters with many releases, create a migration script:

```bash
#!/bin/bash
# migrate-all-releases.sh

# Get all Helm 2 releases
RELEASES=$(helm2 list --all --all-namespaces --output json | jq -r '.Releases[] | .Name')

for release in $RELEASES; do
  echo "Migrating release: $release"

  # Get namespace for the release
  namespace=$(helm2 list --all --all-namespaces --output json | \
    jq -r ".Releases[] | select(.Name==\"$release\") | .Namespace")

  # Migrate with error handling
  if helm3 2to3 convert "$release" --namespace "$namespace"; then
    echo "Successfully migrated $release in namespace $namespace"
  else
    echo "Failed to migrate $release in namespace $namespace" >> migration-errors.log
  fi
done
```

Make it executable and run:

```bash
chmod +x migrate-all-releases.sh
./migrate-all-releases.sh
```

## Handling Failed Releases

Helm 2 releases in FAILED state need special attention. You have two options: delete them before migration or convert them and fix afterward.

To delete failed releases before migration:

```bash
# List failed releases
helm2 list --all --failed

# Delete a failed release
helm2 delete --purge FAILED_RELEASE_NAME
```

To migrate and then fix failed releases:

```bash
# Migrate the failed release
helm3 2to3 convert FAILED_RELEASE_NAME

# Check release status
helm3 status FAILED_RELEASE_NAME -n NAMESPACE

# Attempt rollback or upgrade
helm3 rollback FAILED_RELEASE_NAME -n NAMESPACE
```

## Step 3: Migrate Tiller Data

After converting all releases, migrate the Tiller data store itself:

```bash
# This removes Tiller but keeps release history
helm3 2to3 cleanup --dry-run

# Actual cleanup
helm3 2to3 cleanup
```

This command performs several actions:
- Removes Tiller deployment from kube-system
- Deletes Tiller service account and RBAC resources
- Cleans up ConfigMaps used for Helm 2 release storage
- Preserves release history already converted to Helm 3 format

## Updating Chart Repositories

Helm 3 uses a different directory structure for chart repositories. Update your repository URLs if they've changed:

```bash
# Remove old stable repo (deprecated)
helm3 repo remove stable

# Add new Artifact Hub repositories
helm3 repo add bitnami https://charts.bitnami.com/bitnami
helm3 repo add stable https://charts.helm.sh/stable

# Update repo indexes
helm3 repo update
```

## Handling Chart API Version Changes

Helm 3 uses apiVersion v2 in Chart.yaml. If you maintain custom charts, update them:

```yaml
# Old Chart.yaml (Helm 2)
apiVersion: v1
name: myapp
version: 1.0.0
description: My application

# New Chart.yaml (Helm 3)
apiVersion: v2
name: myapp
version: 1.0.0
description: My application
type: application
```

Helm 3 charts can still be installed by Helm 2, but Helm 2 charts should be updated to take advantage of new features.

## Validating the Migration

After migration, thoroughly validate each release:

```bash
# Check release status
helm3 status RELEASE_NAME -n NAMESPACE

# Compare with Helm 2 output (before cleanup)
helm2 status RELEASE_NAME

# Verify all resources exist
kubectl get all -n NAMESPACE -l release=RELEASE_NAME

# Test application functionality
kubectl exec -n NAMESPACE POD_NAME -- wget -O- http://localhost:8080/health
```

Check that Helm 3 can manage the migrated releases:

```bash
# Test upgrade
helm3 upgrade RELEASE_NAME CHART_NAME --reuse-values -n NAMESPACE

# Test rollback
helm3 rollback RELEASE_NAME -n NAMESPACE
```

## Updating CI/CD Pipelines

Update your continuous deployment pipelines to use Helm 3:

```yaml
# GitLab CI example
deploy:
  stage: deploy
  image: alpine/helm:3.12.0
  script:
    - helm upgrade --install myapp ./chart \
        --namespace production \
        --create-namespace \
        --wait
```

Remove Tiller initialization steps from pipeline scripts:

```bash
# Old Helm 2 pipeline (remove these)
# helm init --client-only
# kubectl create serviceaccount tiller -n kube-system

# New Helm 3 pipeline (no initialization needed)
helm upgrade --install myapp ./chart -n production
```

## Troubleshooting Common Issues

If a release fails to migrate due to corrupted data:

```bash
# Export Helm 2 release metadata
kubectl get configmap -n kube-system | grep RELEASE_NAME

# Manually inspect the data
kubectl get configmap -n kube-system CONFIGMAP_NAME -o yaml

# If corrupted, delete and redeploy
helm2 delete --purge RELEASE_NAME
helm3 install RELEASE_NAME CHART_NAME -n NAMESPACE
```

For releases with custom hooks, verify hook execution:

```bash
# Helm 3 uses different hook annotations
helm3 get hooks RELEASE_NAME -n NAMESPACE

# Test hooks manually
kubectl apply -f hook-manifest.yaml
```

## Namespace-Scoped Releases

Helm 3 releases are namespace-scoped, unlike Helm 2's cluster-wide Tiller. This means you can have releases with the same name in different namespaces:

```bash
# Deploy same app to multiple namespaces
helm3 install myapp ./chart -n dev
helm3 install myapp ./chart -n staging
helm3 install myapp ./chart -n production

# List releases per namespace
helm3 list -n dev
helm3 list -n staging
```

## Rolling Back if Needed

If you need to roll back the migration before running cleanup:

```bash
# Helm 2 releases are still functional until cleanup
# Reinstall Tiller if removed
kubectl apply -f tiller-deployment.yaml

# Continue using Helm 2
helm2 list
```

After cleanup, rolling back requires restoring from backups:

```bash
# Restore Helm 2 ConfigMaps from backup
kubectl apply -f helm2-configmaps-backup.yaml

# Redeploy Tiller
helm2 init
```

## Best Practices

Always perform migrations during maintenance windows. Test the entire process in non-production environments first.

Document which releases have been migrated using labels:

```bash
helm3 upgrade RELEASE_NAME --reuse-values \
  --set labels.helm-version=v3 \
  --set labels.migration-date=$(date +%Y-%m-%d)
```

Keep Helm 2 binaries available for a transition period to handle any unexpected issues. Create comprehensive backups of all release metadata before starting.

## Conclusion

Migrating from Helm 2 to Helm 3 is straightforward with the official 2to3 plugin. The process involves migrating configuration, converting releases, and cleaning up Tiller resources. The improved security model and feature set of Helm 3 make this migration worthwhile for any Kubernetes operation still running Helm 2.
