# How to Back Up Rancher Using the Backup Operator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Backup

Description: Learn how to install and use the Rancher Backup Operator to create reliable backups of your Rancher management server configuration and resources.

Protecting your Rancher management server is critical for maintaining control over your Kubernetes infrastructure. The Rancher Backup Operator provides a native way to back up Rancher resources, including cluster configurations, catalogs, users, and roles. In this guide, you will learn how to install the Backup Operator and create your first backup.

## Prerequisites

Before you begin, make sure you have the following:

- A running Rancher v2.5 or later installation on a Kubernetes cluster
- kubectl access to the local (upstream) Rancher cluster
- Helm 3 installed on your workstation
- Cluster admin privileges on the Rancher management cluster
- An existing Kubernetes StorageClass or PersistentVolume for storing backups

## Step 1: Install the Rancher Backup Operator via Helm

The Backup Operator is distributed as a Helm chart. Add the Rancher charts repository and install the operator.

```bash
helm repo add rancher-charts https://charts.rancher.io
helm repo update
```

Install the backup operator into the `cattle-resources-system` namespace and configure persistent storage for backups:

```bash
helm install rancher-backup-crd rancher-charts/rancher-backup-crd \
  -n cattle-resources-system \
  --create-namespace \
  --wait

helm install rancher-backup rancher-charts/rancher-backup \
  -n cattle-resources-system \
  --set persistence.enabled=true \
  --set persistence.storageClass=<storage-class-name> \
  --wait
```

Verify that the operator pod is running:

```bash
kubectl get pods -n cattle-resources-system
```

You should see output similar to:

```plaintext
NAME                              READY   STATUS    RESTARTS   AGE
rancher-backup-5d4b8c7f9d-abcde   1/1     Running   0          30s
```

## Step 2: Install from the Rancher UI

Alternatively, you can install the Backup Operator through the Rancher UI:

1. Log in to Rancher and go to **Cluster Management**.
2. Open the `local` cluster with **Explore**.
3. Go to **Apps** > **Charts**.
4. Search for **Rancher Backups**.
5. Click **Install** and follow the prompts.
6. Select the target namespace (default is `cattle-resources-system`).
7. Configure a default storage location using an existing StorageClass or PersistentVolume.
8. Click **Install** to deploy the operator.

## Step 3: Create a Backup Resource

Once the operator is running, create a Backup custom resource to trigger a backup. Save the following YAML as `backup.yaml`:

```yaml
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: rancher-backup-1
spec:
  resourceSetName: rancher-resource-set-basic
  retentionCount: 5
```

Apply the backup resource:

```bash
kubectl apply -f backup.yaml
```

## Step 4: Monitor Backup Progress

Check the status of the backup:

```bash
kubectl get backups.resources.cattle.io rancher-backup-1 -o yaml
```

Look for the `status` section in the output. A successful backup will show:

```yaml
status:
  backupType: One-time
  conditions:
  - lastUpdateTime: "2026-03-19T10:00:00Z"
    message: Completed
    status: "True"
    type: Ready
  filename: rancher-backup-1-752ecd87-d958-4d20-8350-072f8d090045-2026-03-19T10-00-00Z.tar.gz
  storageLocation: PV
```

The backup file is stored as a `.tar.gz` archive. It is only encrypted if you configure `encryptionConfigSecretName`. With the Helm example above, backups are stored in the PersistentVolumeClaim mounted at `/var/lib/backups` in the operator pod.

## Step 5: List Existing Backups

To see all backups that have been created:

```bash
kubectl get backups.resources.cattle.io
```

This lists all Backup resources along with their status.

## Step 6: Verify the Backup File

To confirm the backup file exists, exec into the operator pod:

```bash
BACKUP_POD=$(kubectl get pods -n cattle-resources-system -l app.kubernetes.io/name=rancher-backup -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n cattle-resources-system $BACKUP_POD -- ls -la /var/lib/backups/
```

You should see the `.tar.gz` backup file listed.

## Step 7: Configure a Storage Location (Optional)

For production environments, you should store backups externally rather than on the local PersistentVolume. You can configure an S3-compatible storage location. First, create a Secret with your credentials:

```bash
kubectl create secret generic s3-creds \
  -n cattle-resources-system \
  --from-literal=accessKey=YOUR_ACCESS_KEY \
  --from-literal=secretKey=YOUR_SECRET_KEY
```

Then update the Backup resource to reference the storage location:

```yaml
apiVersion: resources.cattle.io/v1
kind: Backup
metadata:
  name: rancher-backup-s3
spec:
  resourceSetName: rancher-resource-set-basic
  retentionCount: 10
  storageLocation:
    s3:
      bucketName: rancher-backups
      endpoint: s3.us-east-1.amazonaws.com
      region: us-east-1
      credentialSecretName: s3-creds
      credentialSecretNamespace: cattle-resources-system
```

## What Gets Backed Up

The Rancher Backup Operator backs up the Rancher application resources defined by the selected ResourceSet:

- `rancher-resource-set-basic` includes Rancher management resources without secrets
- `rancher-resource-set-full` includes the same Rancher management resources plus essential secrets

Note that the Backup Operator does not back up downstream cluster workloads or etcd data. Those require separate backup strategies.

## Best Practices

- Always store backups in an external location such as S3 or MinIO for production environments.
- Set a reasonable `retentionCount` to avoid running out of storage.
- Test your backups regularly by performing a restore to a staging environment.
- Monitor backup status using alerts or monitoring tools.
- Document your backup and restore procedures for your operations team.

## Conclusion

The Rancher Backup Operator provides a straightforward way to protect your Rancher management server configuration. By installing the operator and creating Backup resources, you can ensure that your Rancher setup can be recovered quickly in the event of a failure. In subsequent guides, we will cover restoring from backups, scheduling automated backups, and configuring external storage destinations.
