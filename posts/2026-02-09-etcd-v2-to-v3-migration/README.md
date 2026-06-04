# How to Plan and Execute Kubernetes etcd Migration from v2 to v3 Storage Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, etcd, Storage

Description: Learn how to safely migrate Kubernetes etcd from the deprecated v2 storage backend to v3 with backup strategies, data migration, and validation procedures.

---

Kubernetes originally supported the etcd v2 storage backend but now requires etcd3. Migrating between storage backends requires careful planning to avoid data loss. This guide shows you how to migrate etcd from v2 to v3 safely during a controlled maintenance window.

## Understanding etcd v2 vs v3

The v3 API provides better performance and features than v2.

```bash
#!/bin/bash
# Check current etcd version

ETCDCTL_API=3 etcdctl version
etcdctl --version

# Check whether the legacy v2 keyspace is reachable

ETCDCTL_API=2 etcdctl ls / 2>/dev/null
if [ $? -eq 0 ]; then
  echo "Legacy etcd v2 keyspace is reachable"
else
  echo "Legacy etcd v2 keyspace is not reachable"
fi
```

Kubernetes v1.13 and later require the etcd3 storage backend.

## Backing Up etcd v2 Data

Create comprehensive backups before migration.

```bash
#!/bin/bash
# Backup etcd v2 data

BACKUP_DIR="/var/backups/etcd/v2-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup v2 data directory. Add --wal-dir if WAL files are stored separately.
ETCDCTL_API=2 etcdctl backup \
  --data-dir /var/lib/etcd \
  --backup-dir "$BACKUP_DIR/data"

# Keep a key inventory for validation
ETCDCTL_API=2 etcdctl ls / --recursive > "$BACKUP_DIR/keys.txt"

echo "Backup created at $BACKUP_DIR"
```

Always backup before migration.

## Migrating to etcd v3

Perform the storage backend migration.

```bash
#!/bin/bash
# Migrate etcd storage

# Stop Kubernetes API servers and any clients writing to etcd
systemctl stop kube-apiserver

# Stop etcd before offline migration
systemctl stop etcd

# Migrate data from v2 to v3 with etcdctl v3.4 or earlier
ETCDCTL_API=3 etcdctl migrate \
  --data-dir=/var/lib/etcd \
  --wal-dir=/var/lib/etcd/member/wal

# Restart etcd
systemctl start etcd

# Verify migration
ETCDCTL_API=3 etcdctl get /registry --prefix --keys-only

# Restart API server with v3 storage
systemctl start kube-apiserver

# Verify cluster health
kubectl get --raw='/readyz?verbose'
```

The migrate command converts v2 data to v3 format, but it was removed in etcd v3.5. Use etcdctl v3.4 or earlier for this step.

## Updating Kubernetes Configuration

Update Kubernetes components to use etcd v3.

```yaml
# /etc/kubernetes/manifests/kube-apiserver.yaml
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
spec:
  containers:
  - name: kube-apiserver
    command:
    - kube-apiserver
    - --etcd-servers=https://127.0.0.1:2379
    - --storage-backend=etcd3  # Changed from etcd2
    - --etcd-prefix=/registry
```

Ensure all components reference v3.

## Validating Migration

Verify data integrity after migration.

```bash
#!/bin/bash
# Validation script

# Check etcd v3 data
ETCDCTL_API=3 etcdctl get /registry --prefix --keys-only | head -20

# Verify Kubernetes resources
kubectl get all --all-namespaces
kubectl get nodes

# Check for errors
kubectl get events --all-namespaces | grep -i error

echo "Migration validation complete"
```

Ensure all Kubernetes resources are accessible.

## Rolling Back if Needed

Restore from backup if issues occur.

```bash
#!/bin/bash
# Rollback procedure

BACKUP_DIR="/var/backups/etcd/v2-20260209-100000"

# Stop Kubernetes API servers and etcd
systemctl stop kube-apiserver etcd

# Move failed data aside and restore the v2 backup data directory
mv /var/lib/etcd /var/lib/etcd.failed.$(date +%Y%m%d-%H%M%S)
cp -a "$BACKUP_DIR/data" /var/lib/etcd

# Restart etcd and the API server with v2 configuration
systemctl start etcd kube-apiserver

echo "Rolled back to etcd v2"
```

Have a tested rollback plan ready.

## Monitoring etcd Performance

Track etcd metrics after migration.

```yaml
# Prometheus rules for etcd
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: etcd-monitoring
spec:
  groups:
  - name: etcd
    rules:
    - alert: EtcdHighLatency
      expr: histogram_quantile(0.99, rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m])) > 0.5
      annotations:
        summary: "etcd experiencing high latency"
```

Monitor etcd health closely after migration.

## Conclusion

Migrating etcd from v2 to v3 is required for modern Kubernetes. Check current etcd version and storage backend in use. Create comprehensive backups before migration. Use etcdctl v3.4 or earlier with the migrate command to convert v2 data to v3 format. Update Kubernetes component configurations to specify etcd3 storage backend. Validate that all resources are accessible after migration. Have a tested rollback procedure ready. Monitor etcd performance and latency after migration. Plan the migration during a maintenance window to minimize risk. Test the entire procedure in a non-production environment first.
