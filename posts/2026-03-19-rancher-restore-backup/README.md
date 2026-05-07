# How to Restore Rancher from a Backup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Restore, Backup

Description: Learn how to restore your Rancher management server from a backup created by the Rancher Backup Operator.

When disaster strikes or you need to recover from a failed upgrade, restoring Rancher from a backup is essential. The Rancher Backup Operator provides a Restore custom resource that lets you bring your Rancher management server back to a known good state. This guide walks you through the restore process for the same local cluster and the same Rancher version that the backup was taken from. If you need to move Rancher to a fresh cluster, use Rancher's migration procedure instead.

## Prerequisites

- A backup file created by the Rancher Backup Operator (`.tar.gz` or `.tar.gz.enc` for encrypted backups)
- The Rancher Backup Operator installed on the target cluster
- kubectl access to the local (upstream) cluster with admin privileges
- Helm 3 installed on your workstation
- The same Rancher version as when the backup was taken
- If the backup was encrypted, the same encryption configuration secret available in `cattle-resources-system`

## Step 1: Prepare the Target Cluster

If you are restoring to the same cluster, ensure the Backup Operator is running. If you are restoring to a fresh cluster, do not install Rancher first; use Rancher's migration procedure instead.

Verify the operator is available:

```bash
kubectl get pods -n cattle-resources-system
```

If the operator is not installed, install it:

```bash
helm repo add rancher-charts https://charts.rancher.io
helm repo update

CHART_VERSION=<chart-version>

helm install rancher-backup-crd rancher-charts/rancher-backup-crd \
  -n cattle-resources-system \
  --create-namespace \
  --version $CHART_VERSION \
  --wait

helm install rancher-backup rancher-charts/rancher-backup \
  -n cattle-resources-system \
  --version $CHART_VERSION \
  --wait
```

Choose a `rancher-backup` chart version that is compatible with your Rancher version.

## Step 2: Make the Backup File Available

The backup file must be accessible to the Backup Operator. Depending on where your backup is stored, you have several options.

### Option A: Default Storage Location

If the backup file exists in the default storage location configured for the operator, make sure you have the exact backup filename. You will use that filename in the Restore resource.

### Option B: S3 Storage

If your backup is in S3, create the credentials secret:

```bash
kubectl create secret generic s3-creds \
  -n cattle-resources-system \
  --from-literal=accessKey=YOUR_ACCESS_KEY \
  --from-literal=secretKey=YOUR_SECRET_KEY
```

## Step 3: Let the Operator Scale Down Rancher

On same-cluster restores, the Backup Operator scales down the Rancher deployment automatically when the restore starts. You do not need to do this manually, but Rancher will be unavailable during the restore.

## Step 4: Create the Restore Resource

Create a Restore custom resource. Save the following as `restore.yaml`:

### For Default Storage Location:

```yaml
apiVersion: resources.cattle.io/v1
kind: Restore
metadata:
  name: rancher-restore-1
spec:
  backupFilename: rancher-backup-1-2026-03-19T10-00-00Z.tar.gz
  # encryptionConfigSecretName: encryptionconfig
```

### For S3 Backup:

```yaml
apiVersion: resources.cattle.io/v1
kind: Restore
metadata:
  name: rancher-restore-1
spec:
  backupFilename: rancher-backup-1-2026-03-19T10-00-00Z.tar.gz
  # encryptionConfigSecretName: encryptionconfig
  storageLocation:
    s3:
      bucketName: rancher-backups
      endpoint: s3.us-east-1.amazonaws.com
      region: us-east-1
      credentialSecretName: s3-creds
      credentialSecretNamespace: cattle-resources-system
```

Apply the restore resource:

```bash
kubectl apply -f restore.yaml
```

## Step 5: Monitor the Restore Process

Watch the restore progress:

```bash
kubectl get restore rancher-restore-1
kubectl get restore rancher-restore-1 -o yaml
```

Wait until the Restore resource reports `Completed`.

You can also watch the operator logs for detailed progress:

```bash
kubectl logs -n cattle-resources-system -l app.kubernetes.io/name=rancher-backup -f
```

To watch Rancher scale down and back up during the restore:

```bash
kubectl get pods -n cattle-system -w
```

## Step 6: Wait for Rancher to Scale Back Up

Once the restore completes successfully, the operator scales Rancher back up automatically on the same cluster.

Wait for the pods to become ready:

```bash
kubectl rollout status deployment rancher -n cattle-system
```

## Step 7: Verify the Restore

Log in to the Rancher UI and verify that:

- All clusters are visible and in the expected state
- Users and roles are intact
- Global settings match your previous configuration
- Catalogs and apps are present
- Authentication providers are configured correctly

From the command line, check that Rancher is healthy:

```bash
kubectl get pods -n cattle-system
kubectl get clusters.management.cattle.io
```

## Troubleshooting Common Issues

### Restore Fails with Version Mismatch

Ensure the Rancher version on the target cluster exactly matches the version used when the backup was created. The Kubernetes version also matters, because API versions available on the target cluster may differ from the ones stored in the backup.

### Post-Restore Resource Errors

If Rancher logs show errors after the restore, identify the specific resource causing the error and delete only that resource. Broad deletions such as removing all `clusters.management.cattle.io` resources are not recommended.

### Operator Pod Crashes

Check the operator logs for errors:

```bash
kubectl logs -n cattle-resources-system -l app.kubernetes.io/name=rancher-backup --previous
```

Ensure sufficient memory and CPU resources are allocated to the operator pod.

## Conclusion

Restoring Rancher from a backup is a straightforward process when you have a valid backup file and the Backup Operator installed. By following these steps, you can recover your Rancher management server quickly and minimize downtime. Always test your restore process in a staging environment before relying on it for production recovery.
