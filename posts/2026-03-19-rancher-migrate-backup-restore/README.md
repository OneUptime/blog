# How to Migrate Rancher Using Backup and Restore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Backup, Restore, Disaster Recovery

Description: Learn how to migrate your Rancher management server to a new cluster using the Backup Operator's backup and restore workflow.

There are many reasons to migrate Rancher to a new cluster: hardware upgrades, cloud provider changes, Kubernetes version upgrades, or infrastructure consolidation. The Rancher Backup Operator provides a clean migration path by backing up your current Rancher state and restoring it to a new cluster. This guide walks through the entire migration process.

## Prerequisites

- Source cluster running Rancher v2.5+ with the Backup Operator
- A new target cluster ready for Rancher installation
- External storage (S3, GCS, or MinIO) accessible from both clusters
- kubectl access to both clusters
- Helm 3 installed
- The same Rancher version available for installation on the target cluster
- The same Rancher hostname/server URL available for reuse on the target cluster

## Step 1: Back Up the Source Rancher Installation

On the source cluster, create a backup to external storage:

```bash
kubectl create secret generic s3-creds \
  -n cattle-resources-system \
  --from-literal=accessKey=YOUR_ACCESS_KEY \
  --from-literal=secretKey=YOUR_SECRET_KEY
```

```yaml
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: rancher-migration-backup
spec:
  resourceSetName: rancher-resource-set-full
  storageLocation:
    s3:
      bucketName: rancher-migration
      folder: migration
      endpoint: s3.amazonaws.com
      region: us-east-1
      credentialSecretName: s3-creds
      credentialSecretNamespace: cattle-resources-system
```

For migration, use `rancher-resource-set-full` so Rancher secrets are included in the backup. If you enable backup encryption, keep the same `encryption-provider-config.yaml` file so it can be reused during restore.

Apply and wait for completion:

```bash
kubectl apply -f migration-backup.yaml
kubectl get backups.resources.cattle.io rancher-migration-backup -w
```

Note the backup filename from the status output.

If the source cluster is still available, export the current Rancher Helm values so you can reuse the same settings on the target cluster:

```bash
helm get values rancher -n cattle-system -o yaml > rancher-values.yaml
```

## Step 2: Prepare the Target Cluster

Set up the target cluster with the required components. Switch your kubectl context to the new cluster:

```bash
kubectl config use-context new-cluster
```

Do not install Rancher on the target cluster yet. Restoring to a new cluster where Rancher is already installed can cause problems.

## Step 3: Install the Backup Operator on the Target Cluster

Add the Rancher charts repository and install a `rancher-backup` chart version that is compatible with your Rancher version:

```bash
helm repo add rancher-charts https://charts.rancher.io
helm repo update

CHART_VERSION="chart-version"

helm install rancher-backup-crd rancher-charts/rancher-backup-crd \
  -n cattle-resources-system \
  --create-namespace \
  --version $CHART_VERSION

helm install rancher-backup rancher-charts/rancher-backup \
  -n cattle-resources-system \
  --version $CHART_VERSION
```

## Step 4: Create Storage Credentials on the Target Cluster

Create the same S3 credentials secret on the target cluster:

```bash
kubectl create secret generic s3-creds \
  -n cattle-resources-system \
  --from-literal=accessKey=YOUR_ACCESS_KEY \
  --from-literal=secretKey=YOUR_SECRET_KEY
```

If the backup was encrypted, also create the encryption secret with the same encryption configuration file that was used when the backup was created:

```bash
kubectl create secret generic encryptionconfig \
  -n cattle-resources-system \
  --from-file=./encryption-provider-config.yaml
```

## Step 5: Restore the Backup

Create the Restore resource on the target cluster. During a migration, `prune` must be set to `false`. If the backup was encrypted, add `encryptionConfigSecretName: encryptionconfig` to the spec.

```yaml
apiVersion: resources.cattle.io/v1
kind: Restore
metadata:
  name: rancher-migration-restore
spec:
  backupFilename: rancher-migration-backup-2026-03-19T10-00-00Z.tar.gz
  prune: false
  storageLocation:
    s3:
      bucketName: rancher-migration
      folder: migration
      endpoint: s3.amazonaws.com
      region: us-east-1
      credentialSecretName: s3-creds
      credentialSecretNamespace: cattle-resources-system
```

Apply and monitor:

```bash
kubectl apply -f migration-restore.yaml
kubectl get restores.resources.cattle.io rancher-migration-restore -w
```

Watch the operator logs for progress:

```bash
kubectl logs -n cattle-resources-system --tail 100 -f -l app.kubernetes.io/instance=rancher-backup
```

Once the `Restore` resource reaches the `Completed` state, continue with the cert-manager and Rancher installation.

If the source and target clusters use different Kubernetes distributions, such as K3s to RKE2, update the local cluster object before installing Rancher:

```bash
kubectl edit clusters.management.cattle.io local
```

Then make these changes:

1. Change `status.driver` to `imported`.
2. Remove `status.provider`.
3. Remove the entire `status.version` map.
4. Remove the `provider.cattle.io` label from `metadata.labels`.
5. Remove the `management.cattle.io/current-cluster-controllers-version` annotation from `metadata.annotations`.
6. Remove the entire `spec.rke2Config` or `spec.k3sConfig` map, if present.

## Step 6: Install cert-manager

If your Rancher installation uses Rancher-generated certificates or Let's Encrypt, install cert-manager before bringing Rancher up. Use a cert-manager version supported by your Rancher version:

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true

kubectl get pods --namespace cert-manager
```

Wait until the `cert-manager`, `cert-manager-cainjector`, and `cert-manager-webhook` pods are running.

## Step 7: Install Rancher on the Target Cluster

Install the same Rancher version that was running on the source cluster, reuse the original hostname, and apply the saved Helm values from the source cluster:

```bash
helm repo add rancher-latest https://releases.rancher.com/server-charts/latest
helm repo update

helm install rancher rancher-latest/rancher \
  -n cattle-system \
  --create-namespace \
  -f rancher-values.yaml \
  --set hostname=rancher.yourdomain.com \
  --version x.y.z

kubectl rollout status deployment rancher -n cattle-system
```

Use the same hostname that was configured as the Rancher server URL on the source cluster. If you are not reusing a saved `rancher-values.yaml` file, make sure the TLS and other Helm settings on the target match the source installation.

## Step 8: Update DNS

Update your DNS records so the original Rancher hostname points to the new cluster's load balancer or ingress. You must reuse the same hostname that was configured as the Rancher server URL on the source cluster.

## Step 9: Reconnect Downstream Clusters

After migration, downstream clusters reconnect to the new Rancher server after the hostname points to the new cluster and the original Rancher server is no longer serving that hostname.

On the original cluster, scale the old Rancher deployment down:

```bash
kubectl scale deployment rancher -n cattle-system --replicas=0
```

If the original Rancher server was running in Docker, stop the old Rancher container instead.

If clusters still show as disconnected, restart the `cattle-cluster-agent` on the downstream cluster:

```bash
kubectl rollout restart deployment cattle-cluster-agent -n cattle-system
```

## Step 10: Verify the Migration

Confirm everything is working on the new cluster:

```bash
kubectl get clusters.management.cattle.io
kubectl get pods -n cattle-system
kubectl get nodes
```

Check the Rancher UI for:

- All clusters visible and connected
- Users and roles intact
- Catalogs and applications present
- Global settings correct
- Authentication providers configured

## Post-Migration Cleanup

Once you have verified the migration is successful:

1. Keep the source cluster available for a few days as a fallback, but leave the original Rancher server scaled down.
2. Set up new scheduled backups on the target cluster.
3. Decommission the source cluster only after confirming everything works.
4. Remove the migration backup from S3 when no longer needed.

## Troubleshooting

### Downstream Clusters Not Reconnecting

If downstream clusters cannot connect after DNS is updated, first confirm that the original Rancher server is scaled down or stopped and that the original hostname now resolves to the new cluster. Then restart the `cattle-cluster-agent` on each downstream cluster:

```bash
kubectl rollout restart deployment cattle-cluster-agent -n cattle-system
```

### Version Mismatch Errors

The Rancher version on the target must match the source exactly. Check the Rancher version in the backup metadata and install the matching version. Also make sure the `rancher-backup` chart version is compatible with that Rancher version.

### Certificate Issues

If you are using Let's Encrypt or custom certificates, ensure the TLS configuration and Helm values on the target cluster match the source installation. If you use Rancher-generated certificates or Let's Encrypt, install cert-manager before bringing Rancher up.

## Conclusion

Migrating Rancher using the Backup Operator provides a reliable and repeatable process for moving your management server between clusters. By backing up to external storage, restoring on a new cluster, and updating DNS, you can complete the migration with minimal downtime and ensure all your cluster configurations, users, and settings are preserved.
