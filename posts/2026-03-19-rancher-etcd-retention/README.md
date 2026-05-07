# How to Configure etcd Snapshot Retention in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, etcd, Backup

Description: Learn how to configure etcd snapshot retention policies in Rancher to balance storage usage with recovery point coverage.

etcd snapshots can accumulate quickly and consume significant disk space if retention is not properly configured. Rancher lets you control how many snapshots to keep and how often they are taken for RKE2 clusters, and older Rancher releases expose equivalent settings for RKE1 clusters. This guide covers configuring retention policies to balance storage with recovery needs.

## Prerequisites

- Rancher v2.5 or later for RKE2 clusters
- RKE2 managed clusters, or an older Rancher release that still supports RKE1 clusters
- Admin access to Rancher

## Step 1: Understand Retention Settings

Rancher provides two key settings for snapshot management:

- **Snapshot Interval/Schedule**: How often snapshots are taken (e.g., every 6 hours).
- **Snapshot Retention**: How many snapshots are kept before older ones are automatically deleted.

The combination determines your recovery window. For example, snapshots every 6 hours with a retention of 5 gives you a 30-hour recovery window.

## Step 2: Configure Retention for RKE2 Clusters via UI

1. In Rancher, go to **Cluster Management**.
2. Find the RKE2 cluster and click the three-dot menu.
3. Select **Edit Config**.
4. Navigate to the **etcd** section.
5. Set the recurring snapshot cron schedule to your desired interval:
   - `0 */6 * * *` for every 6 hours
   - `0 */12 * * *` for every 12 hours
   - `0 0 * * *` for daily
6. Set **Snapshot Retention** to the number of snapshots to keep.
7. Click **Save**.

## Step 3: Configure Retention for RKE2 Clusters via YAML

Edit the cluster resource directly:

```yaml
apiVersion: provisioning.cattle.io/v1
kind: Cluster
metadata:
  name: my-cluster
  namespace: fleet-default
spec:
  rkeConfig:
    etcd:
      snapshotScheduleCron: "0 */6 * * *"
      snapshotRetention: 10
      disableSnapshots: false
```

Apply the changes:

```bash
kubectl apply -f cluster.yaml
```

## Step 4: Configure Retention for RKE Clusters

For RKE1 clusters on older Rancher releases, update the cluster configuration through the Rancher API or UI. RKE1 reached end of life on July 31, 2025, and Rancher v2.12 and later no longer support downstream RKE1 clusters:

```yaml
services:
  etcd:
    backup_config:
      interval_hours: 6
      retention: 12
```

The `backup_config.retention` field specifies the number of snapshots to keep. Legacy `services.etcd.creation` and `services.etcd.retention` settings were used in RKE releases before v0.2.0.

## Step 5: Configure S3 Retention Separately

When using S3 for etcd snapshots on RKE2 clusters, `snapshotRetention` controls scheduled local snapshots. In Rancher versions that expose the underlying RKE2 `etcd-s3-retention` setting, you can set S3 retention separately:

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
        cloudCredentialName: fleet-default:s3-credential
    machineGlobalConfig:
      etcd-s3-retention: 10
```

The `snapshotRetention` setting controls scheduled local snapshot retention. `etcd-s3-retention` configures S3 retention separately when supported by your Rancher/RKE2 version. If your version does not expose separate S3 retention, use S3 lifecycle policies:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket etcd-snapshots \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "RetainSnapshots",
        "Status": "Enabled",
        "Filter": {"Prefix": ""},
        "Expiration": {"Days": 90},
        "Transitions": [
          {"Days": 31, "StorageClass": "STANDARD_IA"},
          {"Days": 60, "StorageClass": "GLACIER"}
        ]
      }
    ]
  }'
```

## Step 6: Retention Sizing Guidelines

Use this table to determine appropriate retention settings based on your requirements:

| RPO Target | Snapshot Interval | Retention Count | Recovery Window |
|------------|------------------|-----------------|-----------------|
| 1 hour | `0 * * * *` | 24 | 24 hours |
| 4 hours | `0 */4 * * *` | 12 | 48 hours |
| 6 hours | `0 */6 * * *` | 10 | 60 hours |
| 12 hours | `0 */12 * * *` | 14 | 7 days |
| 24 hours | `0 0 * * *` | 30 | 30 days |

Consider these factors when choosing settings:

- **Disk space**: Each snapshot can range from a few MB to several GB depending on cluster size.
- **Recovery window**: Longer windows provide more rollback options but use more storage.
- **Compliance**: Some regulations require minimum retention periods.

## Step 7: Monitor Disk Usage

Check how much space etcd snapshots are consuming on control plane nodes:

```bash
# RKE2

du -sh /var/lib/rancher/rke2/server/db/snapshots/

# RKE
du -sh /opt/rke/etcd-snapshots/
```

Set up an alert for the filesystem that contains your snapshot directory:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: etcd-disk-alerts
  namespace: cattle-monitoring-system
spec:
  groups:
  - name: etcd-storage
    rules:
    - alert: EtcdSnapshotDiskHigh
      expr: |
        (node_filesystem_avail_bytes{mountpoint="/var/lib/rancher"} /
         node_filesystem_size_bytes{mountpoint="/var/lib/rancher"}) < 0.15
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "etcd snapshot disk usage above 85%"
```

Adjust the `mountpoint` label to match the filesystem that backs your snapshot directory.

## Step 8: Clean Up Old Snapshots Manually

If you need to manually clean up snapshots that were not deleted by the retention policy:

### On RKE2 Nodes

```bash
# List snapshots visible to this node
rke2 etcd-snapshot ls

# Delete specific snapshots by name
rke2 etcd-snapshot delete <SNAPSHOT-NAME>
```

### Via the Rancher UI

1. Navigate to the cluster.
2. Go to **Snapshots**.
3. If your Rancher version exposes snapshot actions there, select the snapshots you want to delete.
4. Click **Delete**.

### In S3

```bash
aws s3 rm s3://etcd-snapshots/cluster-1/ --recursive \
  --exclude "*" --include "etcd-snapshot-2026-01*"
```

## Step 9: Verify Retention Is Working

After the retention policy has had time to take effect, verify that older scheduled snapshots are being cleaned up:

```bash
# Check snapshots visible to this node
rke2 etcd-snapshot ls

# Check all tracked snapshot files in the cluster
kubectl get etcdsnapshotfile
```

Recurring snapshot retention is enforced per node, not cluster-wide, and on-demand snapshots are not pruned automatically.

## Best Practices

- Set retention high enough to cover your recovery window but low enough to avoid disk pressure.
- Use S3 storage for snapshots to offload disk space from control plane nodes.
- Monitor disk usage on control plane nodes and alert before space runs out.
- Combine local and S3 retention for defense in depth.
- Document your retention policy and review it periodically.
- Take manual snapshots before cluster upgrades regardless of automated schedule.

## Conclusion

Properly configured etcd snapshot retention balances the need for recovery options with practical storage constraints. By setting appropriate intervals and retention counts based on your RPO requirements, and combining local snapshots with S3 storage and lifecycle policies, you can maintain reliable recovery points without running into storage issues.
