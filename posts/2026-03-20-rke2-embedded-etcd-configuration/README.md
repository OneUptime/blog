# How to Configure RKE2 with Embedded etcd - Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, etcd, Embedded etcd, Kubernetes, SUSE Rancher, Cluster Storage, High Availability

Description: Learn how to configure and tune RKE2's built-in embedded etcd cluster, including snapshot schedules, compaction settings, and performance tuning for production use.

---

RKE2 ships with an embedded etcd that is automatically configured for high availability when you run at least three server nodes in an odd-sized server set. This guide covers how to tune, back up, and maintain the embedded etcd.

---

## Embedded etcd Architecture

RKE2's embedded etcd uses the same ports and security as a standalone etcd cluster but is fully managed by RKE2. Each server node runs an etcd member, and RKE2 handles certificate management and cluster bootstrapping automatically.

---

## Step 1: Enable etcd Snapshots

Configure automatic etcd snapshots in `/etc/rancher/rke2/config.yaml`:

```yaml
# /etc/rancher/rke2/config.yaml

token: my-cluster-token
tls-san:
  - "rke2.example.com"

# etcd snapshot settings

etcd-snapshot-schedule-cron: "0 */6 * * *"   # every 6 hours
etcd-snapshot-retention: 10                    # keep last 10 snapshots
etcd-snapshot-dir: /var/lib/rancher/rke2/server/db/snapshots

# Optional: push snapshots to S3
etcd-s3: true
etcd-s3-bucket: my-rke2-etcd-backups
etcd-s3-region: us-east-1
etcd-s3-access-key: <access-key>
etcd-s3-secret-key: <secret-key>
```

---

## Step 2: Configure etcd Performance Options

For clusters with higher network latency or disks under heavy write load, tune the etcd heartbeat and election timeouts:

```yaml
# Add to /etc/rancher/rke2/config.yaml

# etcd heartbeat interval in milliseconds (RKE2 default 500ms)
etcd-arg:
  - "heartbeat-interval=1000"
  # Election timeout - keep at least 10x heartbeat on all members
  - "election-timeout=10000"
  # Disk quota (8GB for large clusters)
  - "quota-backend-bytes=8589934592"
  # Compact historical data after 1 hour
  - "auto-compaction-retention=1h"
  - "auto-compaction-mode=periodic"
```

---

## Step 3: Take a Manual Snapshot

```bash
# Take a snapshot on demand
rke2 etcd-snapshot save \
  --name manual-snapshot-$(date +%Y%m%d%H%M%S)

# List available snapshots
rke2 etcd-snapshot ls
```

---

## Step 4: Check etcd Cluster Health

```bash
export ETCDCTL_API=3
ETCD_ARGS="--endpoints https://127.0.0.1:2379 \
  --cacert /var/lib/rancher/rke2/server/tls/etcd/server-ca.crt \
  --cert /var/lib/rancher/rke2/server/tls/etcd/client.crt \
  --key /var/lib/rancher/rke2/server/tls/etcd/client.key"

# Check cluster health
/var/lib/rancher/rke2/bin/etcdctl $ETCD_ARGS endpoint health

# Check member list
/var/lib/rancher/rke2/bin/etcdctl $ETCD_ARGS member list

# Check endpoint status (shows leader and db size)
/var/lib/rancher/rke2/bin/etcdctl $ETCD_ARGS endpoint status --write-out=table
```

---

## Step 5: Restore from a Snapshot

If the cluster needs to be restored from a snapshot, stop RKE2 on all server nodes first:

```bash
# On all server nodes
systemctl stop rke2-server

# On the node where you are restoring a local snapshot
rke2 server \
  --cluster-reset \
  --etcd-s3=false \
  --cluster-reset-restore-path=/var/lib/rancher/rke2/server/db/snapshots/manual-snapshot-20260320120000

# Start the restored server first
systemctl start rke2-server

# On the other server nodes, back up and remove the old database before rejoining
mv /var/lib/rancher/rke2/server/db \
  /var/lib/rancher/rke2/server/db.bak.$(date +%s)
systemctl start rke2-server
```

---

## Best Practices

- Use SSD storage for etcd data - HDD latency causes etcd heartbeat timeouts and leader elections.
- Monitor etcd database size (`db_size` metric) - when it approaches the quota, defrag or increase the quota.
- Always test restores on a non-production cluster to validate your backup process.
- Enable S3 snapshots in addition to local snapshots for disaster recovery coverage.
