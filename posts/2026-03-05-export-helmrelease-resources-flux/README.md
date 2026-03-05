# How to Export HelmRelease Resources in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Export, Migration, Backup

Description: Learn how to export HelmRelease resources in Flux CD for backup, migration, documentation, and GitOps bootstrapping.

---

## Introduction

The `flux export` command generates clean YAML manifests from existing HelmRelease resources in your cluster. This is useful for backing up configurations, migrating between clusters, bootstrapping a new GitOps repository, and documenting your current deployment state. The exported manifests are stripped of cluster-specific metadata (status, timestamps, resource versions) so they can be directly committed to Git.

## Basic Export

Export a single HelmRelease to stdout.

```bash
# Export a single HelmRelease
flux export helmrelease my-app -n default
```

You can also use the short alias `hr`.

```bash
# Using the short alias
flux export hr my-app -n default
```

This outputs a clean YAML manifest suitable for version control.

## Export to a File

Redirect the output to a file for storage or Git.

```bash
# Export a HelmRelease to a file
flux export hr my-app -n default > my-app-helmrelease.yaml
```

## Export All HelmReleases in a Namespace

Export every HelmRelease in a namespace.

```bash
# Export all HelmReleases in the default namespace
flux export hr --all -n default > all-helmreleases-default.yaml
```

The output contains all HelmReleases separated by `---` document separators.

## Export All HelmReleases Across the Cluster

Export HelmReleases from all namespaces.

```bash
# Export all HelmReleases across all namespaces
flux export hr --all -A > all-helmreleases.yaml
```

## Example Export Output

Here is what an exported HelmRelease looks like.

```bash
# Export the nginx HelmRelease
flux export hr nginx -n default
```

The output will be a clean manifest like this.

```yaml
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nginx
  namespace: default
spec:
  chart:
    spec:
      chart: nginx
      reconcileStrategy: ChartVersion
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
      version: ">=15.0.0"
  install:
    remediation:
      retries: 3
  interval: 10m0s
  timeout: 5m0s
  upgrade:
    cleanupOnFail: true
    remediation:
      retries: 3
      strategy: rollback
  values:
    replicaCount: 3
    service:
      type: ClusterIP
```

Notice that the export removes:
- `metadata.resourceVersion`
- `metadata.uid`
- `metadata.creationTimestamp`
- `metadata.generation`
- `status` section
- `metadata.annotations` (managed-by annotations)

This makes the output ready to commit directly to a Git repository.

## Export for Migration

When migrating HelmReleases to a new cluster, export from the source and apply to the destination.

```bash
# On the source cluster: export all HelmReleases
flux export hr --all -A > helmreleases-backup.yaml

# On the destination cluster: apply the exported manifests
kubectl apply -f helmreleases-backup.yaml
```

For a complete migration, you also need to export sources and other Flux resources.

```bash
# Export a complete set of Flux resources for migration
flux export source helm --all -A > helm-sources.yaml
flux export source git --all -A > git-sources.yaml
flux export hr --all -A > helmreleases.yaml
```

## Export for GitOps Bootstrapping

When setting up a new GitOps repository from an existing cluster, export all resources into a directory structure.

```bash
# Create a directory structure for your GitOps repository
mkdir -p clusters/production/{sources,releases}

# Export sources
flux export source helm --all -n flux-system > clusters/production/sources/helm-repositories.yaml

# Export HelmReleases per namespace
for ns in default production monitoring; do
  flux export hr --all -n "$ns" > "clusters/production/releases/${ns}-helmreleases.yaml"
done
```

## Export Individual Components

Export specific HelmReleases for documentation or review.

```bash
# Export infrastructure components
flux export hr cert-manager -n cert-manager > infrastructure/cert-manager.yaml
flux export hr ingress-nginx -n ingress > infrastructure/ingress-nginx.yaml

# Export application releases
flux export hr frontend -n production > apps/frontend.yaml
flux export hr backend-api -n production > apps/backend-api.yaml
```

## Comparing Exported State with Git

Use export to verify that your cluster state matches your Git repository.

```bash
# Export the current cluster state
flux export hr my-app -n default > /tmp/cluster-state.yaml

# Compare with the Git version
diff /tmp/cluster-state.yaml git-repo/helmreleases/my-app.yaml
```

This helps detect manual changes or configuration drift between the cluster and your Git source of truth.

## Export with kubectl

If the Flux CLI is not available, you can use kubectl with some cleanup.

```bash
# Export using kubectl (includes status and metadata)
kubectl get helmrelease my-app -n default -o yaml > my-app-raw.yaml
```

However, kubectl output includes status, resource versions, and other cluster-specific fields. The Flux CLI export is preferred because it produces clean, reapplicable manifests.

## Scripting Exports for Backup

Create a backup script that exports all Flux resources regularly.

```bash
#!/bin/bash
# backup-flux-resources.sh - Export all Flux resources for backup

BACKUP_DIR="flux-backup-$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

echo "Exporting Helm sources..."
flux export source helm --all -A > "$BACKUP_DIR/helm-repositories.yaml"

echo "Exporting Git sources..."
flux export source git --all -A > "$BACKUP_DIR/git-repositories.yaml"

echo "Exporting HelmReleases..."
flux export hr --all -A > "$BACKUP_DIR/helmreleases.yaml"

echo "Exporting Kustomizations..."
flux export kustomization --all -A > "$BACKUP_DIR/kustomizations.yaml"

echo "Backup complete: $BACKUP_DIR"
ls -la "$BACKUP_DIR"
```

```bash
# Run the backup script
chmod +x backup-flux-resources.sh
./backup-flux-resources.sh
```

## Export for Auditing

Use exports to document the current state of your cluster for compliance auditing.

```bash
# Generate an audit snapshot
AUDIT_DIR="audit-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$AUDIT_DIR"

# Export all HelmReleases with their current configuration
flux export hr --all -A > "$AUDIT_DIR/helmreleases.yaml"

# Also capture the live status for context
kubectl get helmreleases -A -o wide > "$AUDIT_DIR/helmrelease-status.txt"

# Capture Helm release histories
for ns in $(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}'); do
  for release in $(helm list -n "$ns" -q 2>/dev/null); do
    helm history "$release" -n "$ns" >> "$AUDIT_DIR/helm-history.txt" 2>/dev/null
  done
done
```

## Verifying Exported Manifests

After exporting, verify the manifests are valid and complete.

```bash
# Validate the exported YAML
kubectl apply --dry-run=client -f helmreleases.yaml

# Check the manifest count
grep "kind: HelmRelease" helmreleases.yaml | wc -l
```

## Conclusion

The `flux export hr` command is a powerful tool for extracting clean HelmRelease manifests from your cluster. Use it for backups before making changes, for migrating between clusters, for bootstrapping new GitOps repositories from existing deployments, and for compliance auditing. The exported manifests are stripped of cluster-specific metadata and ready to commit directly to Git, making them a reliable snapshot of your desired deployment state.
