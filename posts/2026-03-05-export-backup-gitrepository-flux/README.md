# How to Export and Backup GitRepository Resources in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Backup, Disaster Recovery, Export

Description: Learn how to export, backup, and restore Flux CD GitRepository resources and their associated secrets for disaster recovery and migration purposes.

---

Backing up your Flux CD configuration is essential for disaster recovery, cluster migration, and auditing. GitRepository resources and their associated authentication secrets are the foundation of any Flux installation. Losing them means losing your cluster's connection to its source of truth. This guide covers how to export GitRepository resources using the Flux CLI, back up related secrets, and restore everything to a new or recovered cluster.

## Why Backup GitRepository Resources

GitRepository resources contain critical configuration:

- Repository URLs and branch references
- Authentication secret references
- Reconciliation intervals and timeout settings
- Include directives for cross-repo composition

While the GitRepository manifests themselves should be stored in Git (GitOps principle), the authentication secrets are typically not committed to version control. A comprehensive backup strategy covers both.

## Step 1: Export GitRepository Resources with Flux CLI

The `flux export` command generates clean YAML manifests from your running GitRepository resources, stripping out status fields and metadata that would prevent re-application.

Export all GitRepository resources:

```bash
# Export all GitRepository resources from the flux-system namespace
flux export source git --all > gitrepositories-backup.yaml

# Export a specific GitRepository
flux export source git my-app > my-app-gitrepository.yaml

# Export from a specific namespace
flux export source git --all --namespace=flux-system > flux-sources.yaml
```

The exported YAML looks like this:

```yaml
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  ref:
    branch: main
  secretRef:
    name: my-app-credentials
  timeout: 60s
  url: https://github.com/your-org/my-app.git
```

Notice that the export omits `status`, `creationTimestamp`, `resourceVersion`, and other cluster-specific fields, making the output directly re-applicable.

## Step 2: Export All Flux Resources Together

For a comprehensive backup, export all Flux resources, not just GitRepository sources.

Export the entire Flux configuration:

```bash
# Export all sources (Git, Helm, OCI, Bucket)
flux export source git --all > backup/git-sources.yaml
flux export source helm --all > backup/helm-sources.yaml
flux export source oci --all > backup/oci-sources.yaml

# Export all Kustomizations
flux export kustomization --all > backup/kustomizations.yaml

# Export all HelmReleases
flux export helmrelease --all > backup/helmreleases.yaml

# Export all alerts and providers
flux export alert --all > backup/alerts.yaml
flux export alert-provider --all > backup/alert-providers.yaml

# Combine everything into a single file
cat backup/*.yaml > backup/flux-full-export.yaml
```

## Step 3: Backup Authentication Secrets

Authentication secrets are not included in `flux export` output because they contain sensitive data. You must back them up separately.

Export secrets referenced by GitRepository resources:

```bash
# List all secrets referenced by GitRepository resources
kubectl get gitrepository -n flux-system -o jsonpath='{range .items[*]}{.spec.secretRef.name}{"\n"}{end}' | sort -u

# Export each referenced secret
# WARNING: This contains sensitive credentials -- encrypt before storing
kubectl get secret my-app-credentials -n flux-system -o yaml > backup/secrets/my-app-credentials.yaml
kubectl get secret github-token -n flux-system -o yaml > backup/secrets/github-token.yaml
```

For a scripted approach that backs up all referenced secrets:

```bash
#!/bin/bash
# backup-flux-secrets.sh
# Backs up all secrets referenced by GitRepository resources

NAMESPACE="flux-system"
BACKUP_DIR="backup/secrets"
mkdir -p "$BACKUP_DIR"

# Get all unique secret names referenced by GitRepository resources
SECRETS=$(kubectl get gitrepository -n "$NAMESPACE" \
  -o jsonpath='{range .items[*]}{.spec.secretRef.name}{"\n"}{end}' | sort -u)

for SECRET in $SECRETS; do
  if [ -n "$SECRET" ]; then
    echo "Backing up secret: $SECRET"
    kubectl get secret "$SECRET" -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/$SECRET.yaml"
  fi
done

echo "Backup complete. Files saved to $BACKUP_DIR/"
```

## Step 4: Encrypt Secret Backups

Never store unencrypted secrets in plain text or version control. Use a tool like SOPS, sealed-secrets, or age to encrypt them.

Encrypt secret backups with age:

```bash
# Generate an age key pair (do this once)
age-keygen -o age-key.txt

# Encrypt each secret backup
for f in backup/secrets/*.yaml; do
  age -r age1... -o "${f}.enc" "$f"
  rm "$f"  # Remove the unencrypted version
done
```

Encrypt with SOPS for integration with cloud KMS:

```bash
# Encrypt using AWS KMS
sops --encrypt --kms "arn:aws:kms:us-east-1:123456789012:key/your-key-id" \
  backup/secrets/my-app-credentials.yaml > backup/secrets/my-app-credentials.enc.yaml
```

## Step 5: Automate Regular Backups

Create a CronJob that runs inside your cluster to periodically export Flux resources.

A Kubernetes CronJob for automated Flux backups:

```yaml
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
                  # Export all Git sources
                  flux export source git --all > /backup/git-sources.yaml
                  # Export all Kustomizations
                  flux export kustomization --all > /backup/kustomizations.yaml
                  # Export all HelmReleases
                  flux export helmrelease --all > /backup/helmreleases.yaml
                  echo "Backup completed at $(date)"
              volumeMounts:
                - name: backup-volume
                  mountPath: /backup
          restartPolicy: OnFailure
          volumes:
            - name: backup-volume
              persistentVolumeClaim:
                claimName: flux-backup-pvc
```

## Step 6: Restore GitRepository Resources

To restore backups to a new or recovered cluster, first install Flux, then apply the exported resources.

Restore Flux resources from backup:

```bash
# Step 1: Install Flux on the target cluster
flux install

# Step 2: Restore secrets first (they must exist before GitRepository references them)
# Decrypt if encrypted
age -d -i age-key.txt backup/secrets/my-app-credentials.yaml.enc \
  | kubectl apply -f -

# Step 3: Apply GitRepository resources
kubectl apply -f backup/git-sources.yaml

# Step 4: Apply Kustomizations and HelmReleases
kubectl apply -f backup/kustomizations.yaml
kubectl apply -f backup/helmreleases.yaml

# Step 5: Verify restoration
flux get sources git
flux get kustomizations
```

## Step 7: Store Exports in Git (GitOps Backup)

The ultimate GitOps approach is to ensure all non-secret Flux resources are defined in Git. The `flux export` command can generate manifests that you commit back to your configuration repository.

Export and commit to a backup branch:

```bash
# Clone your Flux config repo
git clone https://github.com/your-org/flux-config.git
cd flux-config

# Export current state
flux export source git --all > clusters/my-cluster/sources.yaml
flux export kustomization --all > clusters/my-cluster/kustomizations.yaml

# Commit and push
git add .
git commit -m "Backup Flux resources $(date +%Y-%m-%d)"
git push
```

## Verifying Backup Integrity

Periodically test your backups by restoring to a test cluster.

Validate exported YAML without applying:

```bash
# Dry-run apply to check for errors
kubectl apply --dry-run=client -f backup/git-sources.yaml

# Validate against the Flux CRD schema
kubectl apply --dry-run=server -f backup/git-sources.yaml
```

## Summary

Exporting and backing up Flux GitRepository resources requires two parallel tracks: using `flux export source git --all` for the resource definitions and separately backing up the referenced authentication secrets. The Flux CLI produces clean, reapplicable YAML that strips cluster-specific metadata. Authentication secrets must be handled with care -- always encrypt them before storage. For a robust disaster recovery strategy, automate regular exports, encrypt sensitive data, and periodically test restoration on a separate cluster.
