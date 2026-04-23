# How to Back Up and Restore RKE2 etcd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, etcd, Backup, Restore, Kubernetes, Disaster Recovery, SUSE Rancher

Description: Learn how to create scheduled and manual etcd backups for RKE2 clusters, store snapshots locally or in S3, and restore a cluster from an etcd snapshot after a failure.

---

RKE2 includes built-in snapshot functionality for clusters using embedded etcd. Regular backups are essential for recovering from etcd data loss, accidental deletions, or cluster-wide failures.

---

## Step 1: Configure Automatic etcd Snapshots

RKE2 supports scheduled snapshots via the server configuration file:

```yaml
# /etc/rancher/rke2/config.yaml (on all server nodes)

etcd-snapshot-schedule-cron: "0 */6 * * *"   # Every 6 hours
etcd-snapshot-retention: 10                   # Keep last 10 snapshots
etcd-snapshot-dir: /var/lib/rancher/rke2/server/db/snapshots
```

Restart RKE2 to apply:

```bash
systemctl restart rke2-server
```

---

## Step 2: Save Snapshots to S3

```yaml
# /etc/rancher/rke2/config.yaml
etcd-snapshot-schedule-cron: "0 */6 * * *"
etcd-snapshot-retention: 10
etcd-s3-retention: 10
etcd-s3: true
etcd-s3-bucket: my-rke2-etcd-backups
etcd-s3-region: us-west-2
etcd-s3-access-key: AKIAIOSFODNN7EXAMPLE
etcd-s3-secret-key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

---

## Step 3: Create a Manual Snapshot

```bash
# Create a snapshot manually
rke2 etcd-snapshot save \
  --name manual-backup-$(date +%Y%m%d-%H%M%S)

# List snapshots visible from this node
rke2 etcd-snapshot ls

# List snapshots from S3
rke2 etcd-snapshot ls \
  --etcd-s3 \
  --etcd-s3-bucket my-rke2-etcd-backups \
  --etcd-s3-region us-west-2
```

---

## Step 4: Restore from a Snapshot

Restoration must be performed on a single server node with the cluster stopped:

```bash
# Step 1: Stop RKE2 on ALL server nodes
systemctl stop rke2-server

# Step 2: On the primary server node, restore the snapshot
rke2 server \
  --cluster-reset \
  --cluster-reset-restore-path=/var/lib/rancher/rke2/server/db/snapshots/<SNAPSHOT-NAME> \
  --etcd-s3=false

# Step 3: After restoration completes, start RKE2 on the primary node
systemctl start rke2-server

# Step 4: Verify the primary node is running
kubectl get nodes
```

---

## Step 5: Rejoin Other Server Nodes

After restoring the primary node, the other server nodes need to rejoin:

```bash
# On each additional server node:

# Remove the old RKE2 server database directory
rm -rf /var/lib/rancher/rke2/server/db/

# Start RKE2 (it will rejoin the restored cluster)
systemctl start rke2-server

# Verify all nodes rejoin
kubectl get nodes -w
```

---

## Step 6: Restore from S3

```bash
# List available S3 snapshots
rke2 etcd-snapshot ls \
  --etcd-s3 \
  --etcd-s3-bucket my-rke2-etcd-backups \
  --etcd-s3-region us-west-2

# Restore from S3
rke2 server \
  --cluster-reset \
  --cluster-reset-restore-path=<SNAPSHOT-NAME> \
  --etcd-s3 \
  --etcd-s3-bucket my-rke2-etcd-backups \
  --etcd-s3-region us-west-2
```

---

## Step 7: Verify After Restoration

```bash
# Check cluster state
kubectl get nodes
kubectl get pods -A

# Verify etcd cluster health
/var/lib/rancher/rke2/bin/etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/var/lib/rancher/rke2/server/tls/etcd/server-ca.crt \
  --cert=/var/lib/rancher/rke2/server/tls/etcd/client.crt \
  --key=/var/lib/rancher/rke2/server/tls/etcd/client.key \
  endpoint health
```

---

## Best Practices

- Take a manual snapshot before any major cluster change (upgrades, adding nodes, policy changes) in addition to the scheduled snapshots.
- Always store snapshots off-cluster (S3 or another storage system) - local snapshots are lost if the node fails.
- Back up `/var/lib/rancher/rke2/server/token` with your snapshots. It is required when restoring to new hosts.
- Test your restore procedure in a staging environment regularly - a backup is only useful if the restore works.
