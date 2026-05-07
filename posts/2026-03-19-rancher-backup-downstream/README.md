# How to Back Up Downstream Cluster Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Backup

Description: Learn how to back up workloads and resources running on Rancher-managed downstream clusters using Velero.

The Rancher Backup Operator protects the management server, but it does not back up workloads running on downstream clusters. To protect your application deployments, services, persistent volumes, and other resources on managed clusters, you need a workload-level backup solution. This guide shows you how to use Velero to back up downstream cluster resources managed by Rancher.

## Prerequisites

- Rancher-managed downstream clusters
- kubectl access to downstream clusters
- Helm 3 installed
- Velero CLI installed
- An AWS S3 bucket for backups
- Rancher v2.5 or later

## Step 1: Install Velero on Downstream Clusters

You can install Velero on each downstream cluster through Rancher or directly via Helm.

### Install via Rancher UI

1. In Rancher, navigate to the downstream cluster.
2. Go to **Apps** > **Charts**.
3. Search for **Velero** in an enabled chart repository.
4. Click **Install** and configure the storage backend.

### Install via Helm

Switch to the downstream cluster context:

```bash
kubectl config use-context downstream-cluster-1
```

Add the Velero Helm chart:

```bash
helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts
helm repo update
```

The Helm example below uses AWS S3.

Create the credentials file for AWS S3:

```bash
cat > velero-credentials.txt << 'EOF'
[default]
aws_access_key_id=YOUR_ACCESS_KEY
aws_secret_access_key=YOUR_SECRET_KEY
EOF
```

Install Velero:

```bash
helm install velero vmware-tanzu/velero \
  -n velero \
  --create-namespace \
  --set configuration.backupStorageLocation[0].name=default \
  --set configuration.backupStorageLocation[0].provider=aws \
  --set configuration.backupStorageLocation[0].bucket=downstream-backups \
  --set configuration.backupStorageLocation[0].config.region=us-east-1 \
  --set configuration.volumeSnapshotLocation[0].name=default \
  --set configuration.volumeSnapshotLocation[0].provider=aws \
  --set configuration.volumeSnapshotLocation[0].config.region=us-east-1 \
  --set-file credentials.secretContents.cloud=./velero-credentials.txt \
  --set initContainers[0].name=velero-plugin-for-aws \
  --set initContainers[0].image=velero/velero-plugin-for-aws:v1.12.2 \
  --set initContainers[0].volumeMounts[0].mountPath=/target \
  --set initContainers[0].volumeMounts[0].name=plugins
```

Verify the installation:

```bash
kubectl get pods -n velero
```

## Step 2: Create a One-Time Backup

Back up all resources in a specific namespace:

```bash
velero backup create app-backup-1 \
  --include-namespaces production \
  --wait
```

Back up the entire cluster:

```bash
velero backup create full-cluster-backup \
  --wait
```

Back up specific resource types:

```bash
velero backup create deployments-backup \
  --include-resources deployments,services,configmaps,secrets \
  --include-namespaces production,staging \
  --wait
```

## Step 3: Set Up Scheduled Backups

Create a scheduled backup that runs daily:

```bash
velero schedule create daily-backup \
  --schedule="0 2 * * *" \
  --include-namespaces production \
  --ttl 720h
```

Create a full cluster backup weekly:

```bash
velero schedule create weekly-full-backup \
  --schedule="0 3 * * 0" \
  --ttl 2160h
```

List schedules:

```bash
velero schedule get
```

## Step 4: Back Up Persistent Volumes

To include persistent volume snapshots in your backups, ensure the storage plugin you installed supports snapshots. With the AWS configuration shown above, verify that the default `VolumeSnapshotLocation` exists:

```bash
kubectl get volumesnapshotlocations.velero.io -n velero
```

Create a backup with volume snapshots:

```bash
velero backup create pv-backup \
  --include-namespaces production \
  --snapshot-volumes \
  --wait
```

## Step 5: Verify Backups

Check backup status:

```bash
velero backup describe app-backup-1 --details
```

List all backups:

```bash
velero backup get
```

Check for errors or warnings:

```bash
velero backup logs app-backup-1
```

## Step 6: Restore from a Backup

Restore to the same cluster:

```bash
velero restore create --from-backup app-backup-1 --wait
```

Restore to a different namespace:

```bash
velero restore create --from-backup app-backup-1 \
  --namespace-mappings production:production-restored \
  --wait
```

Restore specific resources:

```bash
velero restore create --from-backup app-backup-1 \
  --include-resources deployments,services \
  --wait
```

## Step 7: Deploy Across Multiple Downstream Clusters

To manage Velero across all your Rancher-managed clusters, create a Fleet GitRepo resource. Save as `velero-fleet.yaml`:

```yaml
apiVersion: fleet.cattle.io/v1alpha1
kind: GitRepo
metadata:
  name: velero-deployment
  namespace: fleet-default
spec:
  repo: https://github.com/your-org/fleet-velero
  branch: main
  paths:
  - velero
  targets:
  - name: all-clusters
    clusterSelector:
      matchLabels:
        backup: enabled
```

This deploys Velero configuration to all clusters labeled with `backup: enabled`.

## Step 8: Monitor Backup Status Across Clusters

Create a monitoring dashboard that checks backup status across all configured cluster contexts. You can use your kubeconfig contexts to query backup information:

```bash
kubectl config get-contexts -o name | while read -r cluster; do
  echo "Cluster: $cluster"
  kubectl --context "$cluster" get backups.velero.io -n velero 2>/dev/null || echo "  Velero not installed"
done
```

## Best Practices

- Install Velero on every downstream cluster that runs production workloads.
- Use separate S3 buckets or prefixes per cluster to avoid conflicts.
- Set appropriate TTL values to manage storage costs.
- Include persistent volume snapshots for stateful applications.
- Test restores regularly to verify backup integrity.
- Use Fleet or GitOps to manage Velero configuration consistently across clusters.

## Conclusion

While the Rancher Backup Operator protects your management server, downstream cluster workloads need their own backup solution. Velero integrates well with Rancher-managed clusters and provides comprehensive workload-level backup and restore capabilities. By combining Rancher management backups with Velero workload backups, you achieve full coverage for your entire Kubernetes infrastructure.
