# How to Restore etcd from Snapshot and Recover Kubernetes Cluster State

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: etcd, Kubernetes, Disaster Recovery, Restore, Cluster State

Description: Master etcd snapshot restoration to recover Kubernetes cluster state after failures. Complete guide covering restoration procedures, validation, and troubleshooting techniques.

---

When disaster strikes and your Kubernetes control plane fails, restoring etcd from a snapshot becomes your path to cluster recovery. The etcd database contains all cluster state including deployments, services, secrets, and configuration data. A successful etcd restore returns your cluster to the exact state captured in the snapshot, recovering workloads, configurations, and access controls in one operation. Understanding the restoration process ensures you can confidently recover from cluster failures with minimal downtime.

## Understanding etcd Restore Process

Restoring etcd involves creating a new etcd data directory from a snapshot file, then restarting etcd to use this restored data. The restore process creates a new etcd cluster member with the snapshot data, effectively resetting the cluster to the snapshot timestamp. All changes made after the snapshot was created will be lost, so choosing the correct snapshot is critical.

During restore, etcd generates new member IDs and cluster IDs to prevent accidental rejoining of old cluster members. This safeguard ensures clean recovery without data inconsistencies.

## Prerequisites for Restoration

Before beginning restoration, ensure you have:

1. A valid etcd snapshot file
2. Access to the control plane node
3. Stopped API server and other control plane components
4. Etcd certificates and keys
5. Sufficient disk space for the restored data directory

Verify snapshot integrity before restoration:

```bash
# Check snapshot status
ETCDCTL_API=3 etcdctl snapshot status snapshot.db -w table

# Output shows:
# +----------+----------+------------+------------+
# |   HASH   | REVISION | TOTAL KEYS | TOTAL SIZE |
# +----------+----------+------------+------------+
# | 12345678 |   987654 |      12345 |    123 MB  |
# +----------+----------+------------+------------+
```

A valid snapshot displays hash, revision, and size information.

## Stopping Control Plane Components

Before restoring etcd, stop all components that depend on it:

```bash
# On control plane node, stop services
systemctl stop kubelet
systemctl stop kube-apiserver
systemctl stop kube-controller-manager
systemctl stop kube-scheduler

# Or if using static pods
mv /etc/kubernetes/manifests /etc/kubernetes/manifests.backup
```

Wait for pods to stop:

```bash
# Check that control plane pods are gone
docker ps | grep -E "kube-apiserver|kube-controller|kube-scheduler"

# Should return no results
```

## Backing Up Current etcd Data

Before restoration, backup the current etcd data directory:

```bash
# Stop etcd
systemctl stop etcd

# Backup current data directory
mv /var/lib/etcd /var/lib/etcd.backup-$(date +%Y%m%d-%H%M%S)

# Verify backup
ls -lh /var/lib/etcd.backup-*
```

This backup allows rollback if restoration fails.

## Performing Single-Node etcd Restore

For single-node clusters or single control plane setups:

```bash
# Set required environment variables
export ETCDCTL_API=3

# Restore from snapshot
etcdctl snapshot restore snapshot.db \
  --name=master-1 \
  --initial-cluster=master-1=https://192.168.1.10:2380 \
  --initial-cluster-token=etcd-cluster-1 \
  --initial-advertise-peer-urls=https://192.168.1.10:2380 \
  --data-dir=/var/lib/etcd

# Verify restore created new data directory
ls -lh /var/lib/etcd

# Set correct permissions
chown -R etcd:etcd /var/lib/etcd
chmod -R 700 /var/lib/etcd
```

The restore creates a new etcd data directory with snapshot contents.

## Starting etcd After Restore

Start etcd with the restored data:

```bash
# Start etcd service
systemctl start etcd

# Check etcd status
systemctl status etcd

# Verify etcd is healthy
etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  endpoint health

# Output: https://127.0.0.1:2379 is healthy
```

If etcd starts successfully, proceed to start other control plane components.

## Restoring Multi-Node etcd Cluster

For multi-node etcd clusters, restore requires coordination across all members:

```bash
# On first control plane node (192.168.1.10)
etcdctl snapshot restore snapshot.db \
  --name=master-1 \
  --initial-cluster=master-1=https://192.168.1.10:2380,master-2=https://192.168.1.11:2380,master-3=https://192.168.1.12:2380 \
  --initial-cluster-token=etcd-cluster-restored \
  --initial-advertise-peer-urls=https://192.168.1.10:2380 \
  --data-dir=/var/lib/etcd

# On second control plane node (192.168.1.11)
etcdctl snapshot restore snapshot.db \
  --name=master-2 \
  --initial-cluster=master-1=https://192.168.1.10:2380,master-2=https://192.168.1.11:2380,master-3=https://192.168.1.12:2380 \
  --initial-cluster-token=etcd-cluster-restored \
  --initial-advertise-peer-urls=https://192.168.1.11:2380 \
  --data-dir=/var/lib/etcd

# On third control plane node (192.168.1.12)
etcdctl snapshot restore snapshot.db \
  --name=master-3 \
  --initial-cluster=master-1=https://192.168.1.10:2380,master-2=https://192.168.1.11:2380,master-3=https://192.168.1.12:2380 \
  --initial-cluster-token=etcd-cluster-restored \
  --initial-advertise-peer-urls=https://192.168.1.12:2380 \
  --data-dir=/var/lib/etcd
```

Use the same snapshot file on all nodes and ensure initial-cluster lists all members.

## Starting Control Plane Components

After etcd is running, start other components:

```bash
# Restore manifests
mv /etc/kubernetes/manifests.backup /etc/kubernetes/manifests

# Or start services manually
systemctl start kube-apiserver
systemctl start kube-controller-manager
systemctl start kube-scheduler
systemctl start kubelet

# Wait for API server to be ready
until kubectl cluster-info &>/dev/null; do
  echo "Waiting for API server..."
  sleep 5
done

echo "Control plane is ready"
```

## Validating Cluster State After Restore

Comprehensively verify the restored cluster:

```bash
# Check node status
kubectl get nodes

# Verify all system pods are running
kubectl get pods -n kube-system

# Check deployments
kubectl get deployments --all-namespaces

# Verify services
kubectl get services --all-namespaces

# Check persistent volumes
kubectl get pv

# Verify secrets and configmaps
kubectl get secrets,configmaps --all-namespaces | wc -l
```

Compare resource counts with pre-failure cluster to ensure completeness.

## Verifying Workload Functionality

Test that restored applications function correctly:

```bash
# Check pod status
kubectl get pods --all-namespaces | grep -v "Running\|Completed"

# Test internal DNS resolution
kubectl run test-dns --image=busybox --rm -it --restart=Never -- \
  nslookup kubernetes.default

# Test service connectivity
kubectl run test-svc --image=curlimages/curl --rm -it --restart=Never -- \
  curl http://my-service.default.svc.cluster.local

# Verify persistent data
kubectl exec -it my-stateful-pod -- ls -la /data
```

These tests validate that the cluster operates normally after restore.

## Handling Restore Failures

Common restoration issues and solutions:

**etcd fails to start after restore:**

```bash
# Check etcd logs
journalctl -u etcd -n 100 --no-pager

# Common issues:
# 1. Incorrect permissions
chown -R etcd:etcd /var/lib/etcd
chmod -R 700 /var/lib/etcd

# 2. Port conflicts
netstat -tulpn | grep 2379

# 3. Certificate issues
etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  member list
```

**API server can't connect to etcd:**

```bash
# Verify etcd is listening
ss -tulpn | grep 2379

# Check API server configuration
cat /etc/kubernetes/manifests/kube-apiserver.yaml | grep etcd-servers

# Test etcd connectivity
curl --cacert /etc/kubernetes/pki/etcd/ca.crt \
     --cert /etc/kubernetes/pki/etcd/server.crt \
     --key /etc/kubernetes/pki/etcd/server.key \
     https://127.0.0.1:2379/health
```

**Cluster state is inconsistent:**

```bash
# Check etcd member health
etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  endpoint status -w table

# Verify all members show same revision
# If revisions differ, restore failed on some members
```

## Automating Restore Procedures

Create a restore script for rapid recovery:

```bash
#!/bin/bash
# etcd-restore.sh

set -e

SNAPSHOT_FILE=$1
BACKUP_DIR="/var/lib/etcd.backup-$(date +%Y%m%d-%H%M%S)"

if [ -z "$SNAPSHOT_FILE" ]; then
  echo "Usage: $0 <snapshot-file>"
  exit 1
fi

echo "Starting etcd restore from: $SNAPSHOT_FILE"

# Verify snapshot
echo "Verifying snapshot integrity..."
ETCDCTL_API=3 etcdctl snapshot status $SNAPSHOT_FILE -w table

# Stop control plane
echo "Stopping control plane components..."
mv /etc/kubernetes/manifests /etc/kubernetes/manifests.backup
sleep 10

systemctl stop etcd

# Backup current data
echo "Backing up current etcd data..."
mv /var/lib/etcd $BACKUP_DIR

# Restore from snapshot
echo "Restoring from snapshot..."
ETCDCTL_API=3 etcdctl snapshot restore $SNAPSHOT_FILE \
  --name=master-1 \
  --initial-cluster=master-1=https://192.168.1.10:2380 \
  --initial-cluster-token=etcd-cluster-restored-$(date +%s) \
  --initial-advertise-peer-urls=https://192.168.1.10:2380 \
  --data-dir=/var/lib/etcd

# Set permissions
chown -R etcd:etcd /var/lib/etcd
chmod -R 700 /var/lib/etcd

# Start etcd
echo "Starting etcd..."
systemctl start etcd
sleep 5

# Verify etcd health
if etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  endpoint health &>/dev/null; then
  echo "etcd is healthy"
else
  echo "ERROR: etcd health check failed"
  # Rollback
  systemctl stop etcd
  rm -rf /var/lib/etcd
  mv $BACKUP_DIR /var/lib/etcd
  exit 1
fi

# Start control plane
echo "Starting control plane components..."
mv /etc/kubernetes/manifests.backup /etc/kubernetes/manifests

# Wait for API server
echo "Waiting for API server..."
until kubectl cluster-info &>/dev/null; do
  sleep 5
done

echo "Restore complete. Verifying cluster state..."
kubectl get nodes
kubectl get pods -n kube-system

echo "etcd restore successful!"
```

Make the script executable:

```bash
chmod +x etcd-restore.sh
```

## Testing Restore Procedures

Regular restore testing validates your disaster recovery capability:

```bash
#!/bin/bash
# test-etcd-restore.sh

# Download latest snapshot from S3
aws s3 cp s3://my-backups/latest-snapshot.db /tmp/test-snapshot.db

# Create test VM or namespace
# ... provision test environment ...

# Perform restore in test environment
./etcd-restore.sh /tmp/test-snapshot.db

# Validate cluster state
kubectl get all --all-namespaces

# Document results
echo "Restore test completed at $(date)" >> restore-test-log.txt

# Cleanup test environment
# ... tear down test resources ...
```

Schedule monthly restore tests to ensure procedures remain current.

## Documenting Restore Procedures

Maintain clear documentation:

```markdown
# etcd Restore Runbook

## Prerequisites
- [ ] Access to control plane nodes
- [ ] Root/sudo privileges
- [ ] etcd snapshot file available
- [ ] etcd certificates in /etc/kubernetes/pki/etcd/

## Restore Steps

1. Download latest snapshot:
   ```bash
   aws s3 cp s3://backups/etcd-snapshot-latest.db /root/snapshot.db
   ```

2. Verify snapshot:
   ```bash
   etcdctl snapshot status /root/snapshot.db -w table
   ```

3. Execute restore script:
   ```bash
   ./etcd-restore.sh /root/snapshot.db
   ```

4. Verify cluster health:
   ```bash
   kubectl get nodes
   kubectl get pods --all-namespaces
   ```

## Rollback Procedure
If restore fails, rollback to backup:
```bash
systemctl stop etcd
rm -rf /var/lib/etcd
mv /var/lib/etcd.backup-TIMESTAMP /var/lib/etcd
systemctl start etcd
```

## Contacts
- On-call: +1-555-0100
- Slack: #incident-response
```

## Conclusion

Mastering etcd restoration ensures you can recover your Kubernetes cluster from catastrophic failures. Understand the restore process thoroughly, including stopping dependencies, performing the restore, and validating cluster state. Automate restoration procedures through scripts, test regularly in non-production environments, and maintain clear documentation for incident response. Combined with regular automated backups, a well-practiced restore process provides the confidence and capability to recover quickly from cluster failures, protecting your applications and maintaining service availability even during disasters.
