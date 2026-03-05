# How to Export HelmRepository and HelmChart Resources in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRepository, HelmChart, Export, Backup

Description: Learn how to export HelmRepository and HelmChart resources from a running Flux cluster for backup, migration, or version control purposes.

---

## Introduction

When managing Helm-based deployments with Flux CD, there are situations where you need to export your existing HelmRepository and HelmChart resources. Whether you are migrating to a new cluster, creating backups, or auditing your current configuration, the Flux CLI provides built-in commands to export these resources in a clean, reusable YAML format.

This guide walks you through exporting HelmRepository and HelmChart resources using the `flux export` command, and covers practical scenarios where exporting is essential.

## Prerequisites

Before you begin, make sure you have the following:

- A Kubernetes cluster with Flux CD installed
- The `flux` CLI installed and configured
- `kubectl` access to the cluster
- At least one HelmRepository and HelmChart resource deployed

## Understanding Flux Export

The `flux export` command outputs Flux resources in a format that can be directly applied to another cluster or committed to a Git repository. Unlike `kubectl get -o yaml`, the exported output strips cluster-specific metadata such as `resourceVersion`, `uid`, and `managedFields`, giving you clean, portable manifests.

## Exporting HelmRepository Resources

### Export a Single HelmRepository

To export a specific HelmRepository by name, use the following command.

```bash
# Export a single HelmRepository named "bitnami" from the "flux-system" namespace
flux export source helm bitnami --namespace=flux-system
```

This produces output similar to the following.

```yaml
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  interval: 10m0s
  url: https://charts.bitnami.com/bitnami
```

### Export All HelmRepository Resources

To export every HelmRepository resource across a namespace, omit the name argument and use the `--all` flag.

```bash
# Export all HelmRepository resources in the flux-system namespace
flux export source helm --all --namespace=flux-system
```

### Export All HelmRepository Resources Across All Namespaces

If your HelmRepository resources are spread across multiple namespaces, you can iterate over all namespaces.

```bash
# Export all HelmRepository resources from every namespace
flux export source helm --all --all-namespaces
```

## Exporting HelmChart Resources

### Export a Single HelmChart

To export a specific HelmChart resource, use the `flux export source chart` command.

```bash
# Export a single HelmChart named "flux-system-nginx" from the flux-system namespace
flux export source chart flux-system-nginx --namespace=flux-system
```

This produces output similar to the following.

```yaml
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmChart
metadata:
  name: flux-system-nginx
  namespace: flux-system
spec:
  chart: nginx
  interval: 5m0s
  reconcileStrategy: ChartVersion
  sourceRef:
    kind: HelmRepository
    name: bitnami
  version: "*"
```

### Export All HelmChart Resources

To export all HelmChart resources in a namespace, use the `--all` flag.

```bash
# Export all HelmChart resources in the flux-system namespace
flux export source chart --all --namespace=flux-system
```

### Export Across All Namespaces

```bash
# Export all HelmChart resources from every namespace
flux export source chart --all --all-namespaces
```

## Saving Exports to Files

In most cases, you want to save the exported resources to files for version control or backup purposes.

### Save Individual Resources

```bash
# Save a single HelmRepository export to a file
flux export source helm bitnami --namespace=flux-system > helmrepository-bitnami.yaml
```

### Save All Resources to a Single File

```bash
# Export all Helm sources and charts into a single file
flux export source helm --all --namespace=flux-system > helm-repositories.yaml
flux export source chart --all --namespace=flux-system >> helm-repositories.yaml
```

### Save to Separate Files per Resource

You can use a script to export each resource into its own file, which is useful for organizing a Git repository.

```bash
# Export each HelmRepository into its own YAML file
for name in $(flux get sources helm --all-namespaces -o json | jq -r '.[] | .name'); do
  flux export source helm "$name" --namespace=flux-system > "helmrepository-${name}.yaml"
  echo "Exported HelmRepository: $name"
done
```

## Full Cluster Export

When migrating an entire Flux installation, you can combine exports of all source types into a comprehensive backup.

```bash
# Create a directory for the backup
mkdir -p flux-backup/sources

# Export all source types
flux export source helm --all --all-namespaces > flux-backup/sources/helm-repositories.yaml
flux export source chart --all --all-namespaces > flux-backup/sources/helm-charts.yaml
flux export source git --all --all-namespaces > flux-backup/sources/git-repositories.yaml

echo "Backup complete. Files saved to flux-backup/sources/"
```

## Restoring Exported Resources

Once you have exported resources, you can apply them to a new cluster.

```bash
# Apply all exported Helm sources to the new cluster
kubectl apply -f flux-backup/sources/helm-repositories.yaml
kubectl apply -f flux-backup/sources/helm-charts.yaml

# Verify the resources were created
flux get sources helm --all-namespaces
flux get sources chart --all-namespaces
```

## Using Export for Drift Detection

You can use the export command to detect configuration drift by comparing the live state with what is stored in Git.

```bash
# Compare live state with the version stored in Git
diff <(flux export source helm bitnami -n flux-system) helmrepository-bitnami.yaml
```

If there is no output, the live state matches the stored version. Any differences indicate drift that should be investigated.

## Common Issues

### Export Returns Empty Output

If an export command returns nothing, verify that the resource exists.

```bash
# List all HelmRepository resources to confirm the name
flux get sources helm --all-namespaces
```

### Permission Errors

The `flux export` command requires read access to the Flux custom resources. Ensure your kubeconfig has sufficient RBAC permissions.

```bash
# Verify your access level
kubectl auth can-i get helmrepositories.source.toolkit.fluxcd.io --namespace=flux-system
```

## Conclusion

The `flux export` command is an essential tool for managing Flux CD deployments. It provides clean, reusable YAML output that strips away cluster-specific metadata, making it ideal for backups, migrations, and version control. By incorporating regular exports into your workflow, you can maintain a reliable record of your Helm source configurations and recover quickly from cluster issues.
