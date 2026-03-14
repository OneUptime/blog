# How to Back Up Helm Releases on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Helm, Backup, Kubernetes, Disaster Recovery

Description: Learn how to back up Helm releases on Talos Linux clusters to protect your application deployments and enable reliable disaster recovery.

---

Helm is the de facto package manager for Kubernetes, and if you are running workloads on Talos Linux, your Helm releases represent critical deployment state. Losing track of which charts were installed, what values were used, and which versions are running can turn a simple recovery into a multi-day headache. Backing up Helm releases properly ensures that you can restore your applications quickly and accurately after any kind of failure.

In this guide, we will walk through several approaches to backing up Helm releases on Talos Linux, from simple scripts to more sophisticated automation.

## Understanding Helm Release Storage

Before diving into backup strategies, it helps to understand where Helm stores its data. Starting with Helm 3, release information is stored as Kubernetes Secrets (by default) in the namespace where the release was installed. Each release revision gets its own Secret with metadata, chart templates, computed values, and the manifest that was applied.

You can see these secrets by running:

```bash
# List all Helm release secrets in a namespace
kubectl get secrets -n my-namespace -l owner=helm
```

The output will show secrets named something like `sh.helm.release.v1.my-release.v1`, where the last version number increments with each upgrade.

## Method 1: Exporting Helm Release Data

The most straightforward approach is to export the release information directly from Helm.

```bash
# List all releases across all namespaces
helm list --all-namespaces -o json > helm-releases-list.json

# Get detailed info for a specific release
helm get all my-release -n my-namespace > my-release-backup.txt

# Get just the values (most important for restoration)
helm get values my-release -n my-namespace -o yaml > my-release-values.yaml
```

You can script this to back up every release in your cluster:

```bash
#!/bin/bash
# backup-helm-releases.sh
# Backs up all Helm releases across all namespaces

BACKUP_DIR="helm-backups/$(date +%Y-%m-%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Save the full release list
helm list --all-namespaces -o json > "$BACKUP_DIR/releases.json"

# Iterate over each release and save its values and manifest
helm list --all-namespaces -o json | jq -r '.[] | "\(.name) \(.namespace)"' | while read name namespace; do
    echo "Backing up $name in $namespace"
    mkdir -p "$BACKUP_DIR/$namespace/$name"

    # Save the user-supplied values
    helm get values "$name" -n "$namespace" -o yaml > "$BACKUP_DIR/$namespace/$name/values.yaml"

    # Save the computed manifest
    helm get manifest "$name" -n "$namespace" > "$BACKUP_DIR/$namespace/$name/manifest.yaml"

    # Save chart info
    helm get chart "$name" -n "$namespace" > "$BACKUP_DIR/$namespace/$name/chart.yaml" 2>/dev/null

    # Save release notes
    helm get notes "$name" -n "$namespace" > "$BACKUP_DIR/$namespace/$name/notes.txt" 2>/dev/null
done

echo "Backup completed at $BACKUP_DIR"
```

## Method 2: Backing Up the Underlying Secrets

Since Helm 3 stores release data in Kubernetes Secrets, you can back up those secrets directly. This captures the complete release state including revision history.

```bash
#!/bin/bash
# backup-helm-secrets.sh
# Backs up Helm release secrets from the cluster

BACKUP_DIR="helm-secret-backups/$(date +%Y-%m-%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Get all namespaces
NAMESPACES=$(kubectl get namespaces -o jsonpath='{.items[*].metadata.name}')

for ns in $NAMESPACES; do
    # Find Helm-owned secrets in this namespace
    SECRETS=$(kubectl get secrets -n "$ns" -l owner=helm -o jsonpath='{.items[*].metadata.name}' 2>/dev/null)

    if [ -n "$SECRETS" ]; then
        mkdir -p "$BACKUP_DIR/$ns"
        for secret in $SECRETS; do
            # Export the secret as YAML
            kubectl get secret "$secret" -n "$ns" -o yaml > "$BACKUP_DIR/$ns/$secret.yaml"
        done
        echo "Backed up Helm secrets in namespace: $ns"
    fi
done
```

To restore from these backups, you simply apply the secret manifests back to the cluster:

```bash
# Restore Helm secrets for a specific namespace
kubectl apply -f helm-secret-backups/2026-03-03-120000/my-namespace/
```

## Method 3: Using Velero for Automated Backups

For production Talos Linux clusters, you probably want something more robust than shell scripts. Velero is a popular backup tool for Kubernetes that works well on Talos.

First, install Velero with a storage provider:

```bash
# Install Velero with S3-compatible storage
velero install \
    --provider aws \
    --plugins velero/velero-plugin-for-aws:v1.8.0 \
    --bucket my-talos-backups \
    --secret-file ./cloud-credentials \
    --backup-storage-location-config region=us-east-1,s3Url=https://s3.amazonaws.com \
    --use-node-agent
```

Create a backup schedule that includes Helm secrets:

```bash
# Create a scheduled backup that targets Helm release secrets
velero schedule create helm-backup \
    --schedule="0 2 * * *" \
    --include-resources secrets \
    --selector owner=helm \
    --ttl 720h
```

You can also create on-demand backups before making changes:

```bash
# Take a one-time backup before a major upgrade
velero backup create pre-upgrade-helm \
    --include-resources secrets \
    --selector owner=helm
```

## Method 4: GitOps-Based Backup with Flux or ArgoCD

If you are using a GitOps workflow on your Talos Linux cluster, your Helm releases are already defined in Git. This is arguably the best backup strategy because Git itself serves as your backup and version history.

With Flux, your HelmRelease resources look like this:

```yaml
# helmrelease.yaml stored in your Git repository
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
      version: "1.2.3"
      sourceRef:
        kind: HelmRepository
        name: my-charts
  values:
    replicas: 3
    image:
      tag: "v2.1.0"
    resources:
      requests:
        memory: "256Mi"
        cpu: "250m"
```

With this approach, restoring a Helm release is as simple as pointing Flux at your Git repository on a new cluster.

## Storing Backups Off-Cluster

Regardless of which method you use, you need to store backups outside the cluster. Here is a simple approach using rclone to sync backups to S3:

```bash
#!/bin/bash
# sync-helm-backups.sh
# Syncs local Helm backups to S3

BACKUP_DIR="helm-backups"
S3_BUCKET="s3:my-talos-backups/helm"

# Run the backup script first
./backup-helm-releases.sh

# Sync to S3
rclone sync "$BACKUP_DIR" "$S3_BUCKET" \
    --transfers 10 \
    --checkers 20 \
    --log-level INFO

echo "Backups synced to S3"
```

## Restoring Helm Releases

When you need to restore, the process depends on which backup method you used:

```bash
# Restore from exported values (Method 1)
# You need to know the chart repo and version
helm repo add my-repo https://charts.example.com
helm install my-release my-repo/my-chart \
    -n my-namespace \
    -f helm-backups/2026-03-03/my-namespace/my-release/values.yaml

# Restore from secrets (Method 2)
kubectl apply -f helm-secret-backups/2026-03-03/my-namespace/

# Restore from Velero (Method 3)
velero restore create --from-backup helm-backup-20260303020000
```

## Setting Up a CronJob on Talos

You can run your backup script as a Kubernetes CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: helm-backup
  namespace: backup-system
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: helm-backup-sa
          containers:
          - name: backup
            image: alpine/helm:3.14
            command: ["/bin/sh", "-c"]
            args:
            - |
              # Run backup script
              helm list --all-namespaces -o json > /backups/releases.json
              # Additional backup logic here
            volumeMounts:
            - name: backup-storage
              mountPath: /backups
          volumes:
          - name: backup-storage
            persistentVolumeClaim:
              claimName: backup-pvc
          restartPolicy: OnFailure
```

## Final Thoughts

Backing up Helm releases on Talos Linux does not have to be complicated. Start with simple scripted exports of your release values, and as your cluster grows, move toward automated solutions like Velero or GitOps. The key is making sure your backups are stored outside the cluster and tested regularly. A backup you have never restored from is just a hope, not a plan.
