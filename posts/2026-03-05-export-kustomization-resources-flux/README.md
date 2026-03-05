# How to Export Kustomization Resources in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Kustomize, Export, Backup, Migration

Description: Learn how to export Kustomization resource definitions from a Flux CD cluster for backup, migration, or replication purposes.

---

## Introduction

Exporting Kustomization resources from a Flux CD cluster is useful for several purposes: creating backups of your Flux configuration, migrating Flux setups between clusters, auditing the current state, or bootstrapping a new cluster with an existing configuration. The `flux export ks` command generates clean YAML definitions of your Kustomization resources, stripped of runtime status and metadata.

This guide covers how to export individual and all Kustomization resources, how to use the exported output, and practical migration workflows.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- The `flux` CLI installed and configured

## Exporting a Single Kustomization

Use `flux export ks` to export a specific Kustomization resource:

```bash
# Export a single Kustomization named "my-app"
flux export ks my-app
```

This outputs clean YAML to stdout:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m0s
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: my-repo
  timeout: 5m0s
  wait: true
```

Notice that the output contains only the spec -- no status, no runtime annotations, no managed fields. This is a clean, reusable definition.

## Saving the Export to a File

Redirect the output to a file for storage or version control:

```bash
# Export a Kustomization to a YAML file
flux export ks my-app > my-app-kustomization.yaml
```

To export a Kustomization from a specific namespace:

```bash
# Export from a specific namespace
flux export ks my-app --namespace=production > my-app-kustomization.yaml
```

## Exporting All Kustomizations

To export all Kustomization resources in a namespace, use the `--all` flag:

```bash
# Export all Kustomizations in the flux-system namespace
flux export ks --all
```

Save all exports to a single file:

```bash
# Export all Kustomizations to a file (separated by --- document markers)
flux export ks --all > all-kustomizations.yaml
```

The output contains all Kustomization resources separated by YAML document delimiters (`---`).

## Exporting to Individual Files

For better organization, export each Kustomization to its own file:

```bash
# Export each Kustomization to a separate file
for ks in $(flux get ks --no-header | awk '{print $1}'); do
  flux export ks "$ks" > "${ks}-kustomization.yaml"
  echo "Exported: ${ks}"
done
```

## Exporting All Flux Resources

For a complete backup, export all Flux resources (not just Kustomizations):

```bash
# Export all Flux resources (sources, kustomizations, receivers, alerts, etc.)
flux export source git --all > git-sources.yaml
flux export ks --all > kustomizations.yaml
flux export alert --all > alerts.yaml 2>/dev/null
flux export alert-provider --all > alert-providers.yaml 2>/dev/null
flux export receiver --all > receivers.yaml 2>/dev/null
```

Or combine them into a single backup file:

```bash
# Create a comprehensive Flux backup file
{
  echo "# Flux Git Sources"
  flux export source git --all
  echo "---"
  echo "# Flux Kustomizations"
  flux export ks --all
} > flux-backup.yaml
```

## Practical Use Cases

### Use Case 1: Cluster Migration

When migrating from one cluster to another, export the Flux configuration from the source cluster and apply it to the target:

```bash
# On the source cluster: export all Flux configuration
flux export source git --all > sources.yaml
flux export ks --all > kustomizations.yaml

# On the target cluster: ensure Flux is installed, then apply
kubectl apply -f sources.yaml
kubectl apply -f kustomizations.yaml
```

Before applying to the target cluster, make sure that:

1. Flux controllers are installed on the target cluster
2. Any referenced Secrets (Git credentials, decryption keys) exist on the target
3. Namespaces referenced in sourceRef and path exist

### Use Case 2: Auditing Current Configuration

Export and review all Kustomization configurations to audit what Flux is managing:

```bash
# Export all Kustomizations and review their configurations
flux export ks --all | grep -E "name:|path:|interval:|prune:|wait:"
```

This gives a quick summary of all managed Kustomizations and their key settings.

### Use Case 3: Version Controlling Flux Configuration

If your Flux configuration is not already in Git (for example, it was created imperatively), export it and commit it:

```bash
# Create a directory for Flux configuration
mkdir -p clusters/my-cluster/flux-system

# Export all resources
flux export source git --all > clusters/my-cluster/flux-system/sources.yaml
flux export ks --all > clusters/my-cluster/flux-system/kustomizations.yaml

# Commit to Git
git add clusters/my-cluster/flux-system/
git commit -m "Add Flux configuration for my-cluster"
git push
```

### Use Case 4: Comparing Configurations Across Clusters

Export from multiple clusters and diff them:

```bash
# Export from cluster A
KUBECONFIG=~/.kube/cluster-a flux export ks --all > cluster-a-ks.yaml

# Export from cluster B
KUBECONFIG=~/.kube/cluster-b flux export ks --all > cluster-b-ks.yaml

# Compare the configurations
diff cluster-a-ks.yaml cluster-b-ks.yaml
```

## Understanding the Export Output

The exported YAML is a clean Kubernetes resource definition. Here is what is included and excluded:

**Included:**
- `apiVersion` and `kind`
- `metadata.name` and `metadata.namespace`
- Complete `spec` with all configured fields

**Excluded:**
- `metadata.resourceVersion`, `metadata.uid`, `metadata.creationTimestamp`
- `metadata.managedFields`
- `metadata.annotations` (runtime annotations from Flux)
- `status` section

This makes the exported YAML directly reusable -- you can apply it to another cluster or store it in version control without cleanup.

## Export vs. kubectl get

You might wonder why to use `flux export ks` instead of `kubectl get kustomization -o yaml`. The difference is significant:

```bash
# kubectl output includes runtime metadata and status (noisy)
kubectl get kustomization my-app -n flux-system -o yaml

# flux export output is clean and reusable (just spec)
flux export ks my-app
```

The kubectl output includes dozens of lines of managed fields, status conditions, and runtime annotations that you would need to manually remove before reusing the YAML. The Flux export command handles this cleanup automatically.

## Automating Exports with CronJobs

For regular backups of your Flux configuration, you can create a CronJob:

```yaml
# flux-backup-cronjob.yaml - Automated Flux configuration backup
apiVersion: batch/v1
kind: CronJob
metadata:
  name: flux-backup
  namespace: flux-system
spec:
  schedule: "0 2 * * *"  # Run daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: flux-backup-sa
          containers:
            - name: backup
              image: ghcr.io/fluxcd/flux-cli:v2.4.0
              command:
                - /bin/sh
                - -c
                - |
                  # Export all Kustomizations
                  flux export ks --all > /backup/kustomizations.yaml
                  flux export source git --all > /backup/sources.yaml
                  echo "Backup completed at $(date)"
              volumeMounts:
                - name: backup-volume
                  mountPath: /backup
          volumes:
            - name: backup-volume
              persistentVolumeClaim:
                claimName: flux-backup-pvc
          restartPolicy: OnFailure
```

## Conclusion

The `flux export ks` command is an essential tool for managing Flux CD configurations. It produces clean, reusable YAML that is ready for version control, migration, or backup. Whether you are moving between clusters, auditing your GitOps setup, or creating disaster recovery procedures, exporting Kustomization resources gives you a portable snapshot of your Flux configuration. Use `--all` for comprehensive exports and combine with source exports for a complete picture.
