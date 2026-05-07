# How to Back Up etcd in Rancher-Managed Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Backup, etcd

Description: Learn how to configure and manage etcd backups for Rancher-managed RKE and RKE2 clusters to protect cluster state.

etcd is the backbone of every Kubernetes cluster, storing all cluster state including deployments, services, secrets, and configurations. Losing etcd data means losing your entire cluster configuration. Rancher provides built-in etcd snapshot management for RKE and RKE2 clusters. This guide covers configuring etcd backups through Rancher.

## Prerequisites

- Rancher v2.5 or later
- RKE or RKE2 managed clusters
- Admin access to Rancher
- kubectl access to the management cluster

## Step 1: Enable etcd Snapshots via the Rancher UI

For RKE2/K3s clusters managed by Rancher:

1. Log in to Rancher.
2. Click **☰ > Cluster Management**.
3. Go to the downstream cluster, click the three-dot menu, and select **Edit Config**.
4. Scroll to the **etcd** section.
5. Ensure **Recurring etcd Snapshots** is enabled.
6. Configure the snapshot interval and retention count.
7. Click **Save**.

## Step 2: Configure etcd Snapshots for RKE Clusters

For RKE clusters, etcd snapshot configuration is part of the cluster YAML. Edit the cluster configuration:

```yaml
services:
  etcd:
    snapshot: true
    backup_config:
      enabled: true
      interval_hours: 6
      retention: 6
      safe_timestamp: true
      timeout: 300
```

Apply through the Rancher UI by editing the cluster YAML, or through the API.

## Step 3: Configure etcd Snapshots for RKE2 Clusters

For RKE2 clusters provisioned through Rancher, configure snapshots in the cluster spec:

```yaml
apiVersion: provisioning.cattle.io/v1
kind: Cluster
metadata:
  name: my-rke2-cluster
  namespace: fleet-default
spec:
  rkeConfig:
    etcd:
      snapshotScheduleCron: "0 */6 * * *"
      snapshotRetention: 5
      disableSnapshots: false
```

## Step 4: Take a Manual etcd Snapshot

### Via the Rancher UI

1. Navigate to the cluster in Rancher.
2. Go to **Snapshots** under the cluster menu.
3. Click **Snapshot Now** to take an immediate snapshot.

### Via the RKE2 CLI

On an RKE2 control plane node, run:

```bash
rke2 etcd-snapshot save --name manual-snapshot-$(date +%Y%m%d)
```

### Via the Rancher API

```bash
curl -X POST \
  'https://rancher.yourdomain.com/v3/clusters/CLUSTER_ID?action=backupEtcd' \
  -H 'Authorization: Bearer YOUR_API_TOKEN' \
  -H 'Content-Type: application/json'
```

## Step 5: List etcd Snapshots

### Via the Rancher UI

Navigate to the cluster and go to **Snapshots** to see all available snapshots with timestamps and sizes.

### Via kubectl

For Rancher-provisioned RKE2/K3s clusters, list the Rancher `ETCDSnapshot` resources from the management cluster:

```bash
kubectl get etcdsnapshots.rke.cattle.io -n CLUSTER_NAMESPACE
```

For RKE clusters:

```bash
kubectl get etcdbackups.management.cattle.io -n CLUSTER_NAMESPACE
```

### On the RKE2 Node

```bash
rke2 etcd-snapshot list
```

## Step 6: Store etcd Snapshots in S3

Configure S3 storage for etcd snapshots to protect against local disk failures.

### For RKE Clusters

Edit the cluster configuration:

```yaml
services:
  etcd:
    backup_config:
      enabled: true
      interval_hours: 6
      retention: 12
      s3backupconfig:
        access_key: "YOUR_ACCESS_KEY"
        secret_key: "YOUR_SECRET_KEY"
        bucket_name: "etcd-snapshots"
        region: "us-east-1"
        endpoint: "s3.amazonaws.com"
        folder: "cluster-1"
```

### For RKE2 Clusters

Configure S3 in the cluster spec:

```yaml
spec:
  rkeConfig:
    etcd:
      snapshotScheduleCron: "0 */6 * * *"
      snapshotRetention: 5
      s3:
        bucket: etcd-snapshots
        region: us-east-1
        endpoint: s3.amazonaws.com
        folder: cluster-1
        cloudCredentialName: fleet-default:s3-credential-secret
```

Create the referenced secret first. `cloudCredentialName` must be in `namespace:name` format:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: s3-credential-secret
  namespace: fleet-default
type: Opaque
stringData:
  accessKey: YOUR_ACCESS_KEY
  secretKey: YOUR_SECRET_KEY
```

## Step 7: Verify etcd Snapshot Integrity

After a snapshot is taken, verify it is valid:

```bash
# On the RKE2 control plane node

/var/lib/rancher/rke2/bin/etcdutl snapshot status \
  /var/lib/rancher/rke2/server/db/snapshots/SNAPSHOT_NAME \
  -w table
```

Expected output shows hash, revision, total keys, and total size:

```plaintext
+----------+----------+------------+------------+
|   HASH   | REVISION | TOTAL KEYS | TOTAL SIZE |
+----------+----------+------------+------------+
| 3f8bd5e8 |   145892 |       1024 |     5.2 MB |
+----------+----------+------------+------------+
```

## Step 8: Monitor etcd Snapshot Health

For RKE2, enable `supervisor-metrics: true` so snapshot metrics are exposed, then alert when snapshots stop succeeding:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: etcd-snapshot-alerts
  namespace: cattle-monitoring-system
spec:
  groups:
  - name: etcd-snapshots
    rules:
    - alert: EtcdSnapshotTooOld
      expr: |
        increase(rke2_etcd_snapshot_save_duration_seconds_count{status="success"}[7h]) == 0
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "No successful RKE2 etcd snapshot in the last 7 hours"
```

## Snapshot Storage Locations

By default, etcd snapshots are stored locally on the control plane nodes:

- **RKE**: `/opt/rke/etcd-snapshots/`
- **RKE2**: `/var/lib/rancher/rke2/server/db/snapshots/`
- **K3s**: `/var/lib/rancher/k3s/server/db/snapshots/`

For production environments, always configure S3 storage in addition to local snapshots.

## Best Practices

- Take snapshots at least every 6 hours for production clusters.
- Store snapshots in S3 or equivalent external storage.
- Retain at least 5-7 snapshots to allow rollback to different points in time.
- Monitor snapshot creation and alert on failures.
- Test restoring from snapshots regularly.
- Take a manual snapshot before any cluster upgrade or major change.

## Conclusion

etcd backups are your safety net for Kubernetes cluster state. By configuring regular snapshots through Rancher, storing them externally in S3, and monitoring their health, you ensure that your clusters can be recovered from data loss or corruption. Combined with Rancher management server backups, etcd snapshots provide comprehensive protection for your entire Kubernetes infrastructure.
