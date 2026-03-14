# How to Set Up Disaster Recovery for etcd Clusters Running Outside Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, etcd, Disaster Recovery

Description: Implement comprehensive disaster recovery strategies for external etcd clusters that store Kubernetes state with automated backups, restore procedures, and testing workflows.

---

External etcd clusters provide separation of concerns for Kubernetes control plane data, but they require dedicated disaster recovery planning. Unlike managed Kubernetes services that handle etcd backups automatically, self-hosted etcd clusters need manual backup strategies, restore procedures, and regular testing. This guide covers implementing production-grade disaster recovery for etcd clusters running outside your Kubernetes cluster.

## Understanding etcd Disaster Scenarios

Several scenarios require etcd recovery. Complete cluster failure occurs when all nodes become unavailable simultaneously due to datacenter outages or hardware failures. Data corruption happens from storage failures or software bugs. Accidental deletions require point-in-time recovery to restore lost resources. Security incidents might need rollback to pre-compromise state.

Each scenario has different recovery requirements. Total cluster loss needs full restoration from backups. Partial failures might only require rejoining recovered nodes. Understanding these scenarios helps design appropriate recovery procedures.

## Setting Up Automated Backups

Create a backup script that runs via cron:

```bash
#!/bin/bash
# etcd-backup.sh

set -e

# Configuration
ETCD_ENDPOINTS="https://etcd-0:2379,https://etcd-1:2379,https://etcd-2:2379"
BACKUP_DIR="/backups/etcd"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/etcd-snapshot-${TIMESTAMP}.db"

# Ensure backup directory exists
mkdir -p ${BACKUP_DIR}

# Create snapshot
ETCDCTL_API=3 etcdctl snapshot save ${BACKUP_FILE} \
  --endpoints=${ETCD_ENDPOINTS} \
  --cacert=/etc/etcd/ca.crt \
  --cert=/etc/etcd/etcd-client.crt \
  --key=/etc/etcd/etcd-client.key

# Verify snapshot
ETCDCTL_API=3 etcdctl snapshot status ${BACKUP_FILE} \
  --write-out=table

# Compress backup
gzip ${BACKUP_FILE}

# Upload to S3
aws s3 cp ${BACKUP_FILE}.gz s3://my-backups/etcd/ \
  --storage-class STANDARD_IA

# Clean up local backups older than retention period
find ${BACKUP_DIR} -name "etcd-snapshot-*.db.gz" -mtime +${RETENTION_DAYS} -delete

# Log success
echo "Backup completed successfully: ${BACKUP_FILE}.gz"

# Send metrics
curl -X POST http://prometheus-pushgateway:9091/metrics/job/etcd_backup \
  --data-binary @- <<EOF
# TYPE etcd_backup_timestamp gauge
etcd_backup_timestamp $(date +%s)
# TYPE etcd_backup_size_bytes gauge
etcd_backup_size_bytes $(stat -f%z "${BACKUP_FILE}.gz")
EOF
```

Deploy as a systemd timer:

```ini
# /etc/systemd/system/etcd-backup.service
[Unit]
Description=etcd Backup Service
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/etcd-backup.sh
User=etcd
Group=etcd

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/systemd/system/etcd-backup.timer
[Unit]
Description=etcd Backup Timer
Requires=etcd-backup.service

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable the timer:

```bash
sudo systemctl daemon-reload
sudo systemctl enable etcd-backup.timer
sudo systemctl start etcd-backup.timer

# Check timer status
sudo systemctl status etcd-backup.timer
sudo systemctl list-timers
```

## Implementing Off-Site Replication

Replicate backups to multiple locations:

```bash
#!/bin/bash
# etcd-backup-replication.sh

BACKUP_FILE=$1

# Primary backup to S3
aws s3 cp ${BACKUP_FILE} s3://primary-backups/etcd/ \
  --region us-east-1

# Replicate to different region
aws s3 cp ${BACKUP_FILE} s3://disaster-recovery-backups/etcd/ \
  --region us-west-2

# Replicate to different cloud provider (Google Cloud)
gsutil cp ${BACKUP_FILE} gs://backup-bucket/etcd/

# Store copy on tape/cold storage
aws s3 cp ${BACKUP_FILE} s3://glacier-backups/etcd/ \
  --storage-class GLACIER
```

## Creating Restore Procedures

Document and script the restore process:

```bash
#!/bin/bash
# etcd-restore.sh

set -e

BACKUP_FILE=$1
RESTORE_DIR="/var/lib/etcd-restore"

if [ -z "${BACKUP_FILE}" ]; then
    echo "Usage: $0 <backup-file>"
    exit 1
fi

# Download backup if it's a remote path
if [[ ${BACKUP_FILE} == s3://* ]]; then
    LOCAL_BACKUP="/tmp/etcd-backup.db.gz"
    aws s3 cp ${BACKUP_FILE} ${LOCAL_BACKUP}
    gunzip ${LOCAL_BACKUP}
    BACKUP_FILE="${LOCAL_BACKUP%.gz}"
fi

# Stop etcd on all nodes
ssh etcd-0 "sudo systemctl stop etcd"
ssh etcd-1 "sudo systemctl stop etcd"
ssh etcd-2 "sudo systemctl stop etcd"

# Remove old data on all nodes
ssh etcd-0 "sudo rm -rf /var/lib/etcd/*"
ssh etcd-1 "sudo rm -rf /var/lib/etcd/*"
ssh etcd-2 "sudo rm -rf /var/lib/etcd/*"

# Restore snapshot on each node
for i in 0 1 2; do
    echo "Restoring etcd-${i}..."

    # Copy backup to node
    scp ${BACKUP_FILE} etcd-${i}:/tmp/restore.db

    # Restore with unique member name
    ssh etcd-${i} "ETCDCTL_API=3 etcdctl snapshot restore /tmp/restore.db \
      --name etcd-${i} \
      --initial-cluster etcd-0=https://etcd-0:2380,etcd-1=https://etcd-1:2380,etcd-2=https://etcd-2:2380 \
      --initial-cluster-token etcd-cluster-1 \
      --initial-advertise-peer-urls https://etcd-${i}:2380 \
      --data-dir /var/lib/etcd"

    # Fix permissions
    ssh etcd-${i} "sudo chown -R etcd:etcd /var/lib/etcd"
done

# Start etcd on all nodes
ssh etcd-0 "sudo systemctl start etcd"
ssh etcd-1 "sudo systemctl start etcd"
ssh etcd-2 "sudo systemctl start etcd"

# Verify cluster health
sleep 10
ETCDCTL_API=3 etcdctl endpoint health \
  --endpoints=https://etcd-0:2379,https://etcd-1:2379,https://etcd-2:2379 \
  --cacert=/etc/etcd/ca.crt \
  --cert=/etc/etcd/etcd-client.crt \
  --key=/etc/etcd/etcd-client.key

echo "Restore completed successfully"
```

Make the script executable and test it:

```bash
chmod +x /usr/local/bin/etcd-restore.sh

# Test restore in non-production environment
/usr/local/bin/etcd-restore.sh s3://my-backups/etcd/etcd-snapshot-20260209-020000.db.gz
```

## Testing Disaster Recovery Procedures

Regular testing ensures recovery procedures work when needed:

```bash
#!/bin/bash
# etcd-dr-test.sh

# 1. Create test cluster marker
kubectl create configmap dr-test-marker \
  --from-literal=timestamp="$(date +%s)" \
  --namespace=default

# 2. Take backup
/usr/local/bin/etcd-backup.sh

# 3. Note the current revision
CURRENT_REVISION=$(ETCDCTL_API=3 etcdctl endpoint status \
  --endpoints=https://etcd-0:2379 \
  --cacert=/etc/etcd/ca.crt \
  --cert=/etc/etcd/etcd-client.crt \
  --key=/etc/etcd/etcd-client.key \
  --write-out=json | jq -r '.[0].Status.header.revision')

echo "Current revision: ${CURRENT_REVISION}"

# 4. Restore from backup
LATEST_BACKUP=$(ls -t /backups/etcd/etcd-snapshot-*.db.gz | head -1)
/usr/local/bin/etcd-restore.sh ${LATEST_BACKUP}

# 5. Verify marker exists after restore
kubectl get configmap dr-test-marker --namespace=default

# 6. Check revision after restore
RESTORED_REVISION=$(ETCDCTL_API=3 etcdctl endpoint status \
  --endpoints=https://etcd-0:2379 \
  --cacert=/etc/etcd/ca.crt \
  --cert=/etc/etcd/etcd-client.crt \
  --key=/etc/etcd/etcd-client.key \
  --write-out=json | jq -r '.[0].Status.header.revision')

echo "Restored revision: ${RESTORED_REVISION}"

# 7. Verify Kubernetes functionality
kubectl get nodes
kubectl get pods --all-namespaces

# 8. Clean up test marker
kubectl delete configmap dr-test-marker --namespace=default

echo "DR test completed successfully"
```

Run DR tests monthly:

```bash
# Schedule via cron
0 3 1 * * /usr/local/bin/etcd-dr-test.sh >> /var/log/etcd-dr-test.log 2>&1
```

## Monitoring Backup Health

Create alerts for backup failures:

```yaml
# prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: etcd-backup-alerts
spec:
  groups:
  - name: etcd.backups
    interval: 60s
    rules:
    - alert: EtcdBackupFailed
      expr: time() - etcd_backup_timestamp > 86400
      for: 1h
      annotations:
        summary: "etcd backup hasn't run in 24 hours"
        description: "Last successful backup was {{ $value }}s ago"

    - alert: EtcdBackupTooLarge
      expr: etcd_backup_size_bytes > 10737418240
      annotations:
        summary: "etcd backup size exceeds 10GB"
        description: "Backup size is {{ $value }} bytes"
```

Monitor backup metrics:

```bash
# Check last backup time
curl -s http://prometheus:9090/api/v1/query?query=etcd_backup_timestamp | \
  jq -r '.data.result[0].value[1]'

# Verify backup exists
aws s3 ls s3://my-backups/etcd/ --recursive | tail -5
```

## Implementing Point-in-Time Recovery

etcd doesn't support built-in PITR, but you can approximate it with frequent snapshots:

```bash
# Take snapshots every 5 minutes for PITR
*/5 * * * * /usr/local/bin/etcd-snapshot-pitr.sh
```

```bash
#!/bin/bash
# etcd-snapshot-pitr.sh

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/backups/etcd/pitr"
RETENTION_HOURS=24

mkdir -p ${BACKUP_DIR}

# Create snapshot
ETCDCTL_API=3 etcdctl snapshot save \
  ${BACKUP_DIR}/snapshot-${TIMESTAMP}.db \
  --endpoints=https://etcd-0:2379 \
  --cacert=/etc/etcd/ca.crt \
  --cert=/etc/etcd/etcd-client.crt \
  --key=/etc/etcd/etcd-client.key

# Clean up old PITR snapshots
find ${BACKUP_DIR} -name "snapshot-*.db" -mmin +$((RETENTION_HOURS * 60)) -delete
```

Restore to specific time:

```bash
# List available snapshots
ls -lh /backups/etcd/pitr/

# Find snapshot closest to desired time
DESIRED_TIME="20260209-1430"
SNAPSHOT=$(ls /backups/etcd/pitr/snapshot-${DESIRED_TIME}*.db | head -1)

# Restore from that snapshot
/usr/local/bin/etcd-restore.sh ${SNAPSHOT}
```

## Handling Split-Brain Scenarios

If etcd clusters split due to network partitions:

```bash
# Check cluster member list on each node
for i in 0 1 2; do
    echo "=== etcd-${i} ==="
    ssh etcd-${i} "ETCDCTL_API=3 etcdctl member list \
      --endpoints=https://localhost:2379 \
      --cacert=/etc/etcd/ca.crt \
      --cert=/etc/etcd/etcd-client.crt \
      --key=/etc/etcd/etcd-client.key"
done

# Remove unhealthy members
ETCDCTL_API=3 etcdctl member remove <member-id> \
  --endpoints=https://etcd-0:2379 \
  --cacert=/etc/etcd/ca.crt \
  --cert=/etc/etcd/etcd-client.crt \
  --key=/etc/etcd/etcd-client.key

# Add member back
ETCDCTL_API=3 etcdctl member add etcd-2 \
  --peer-urls=https://etcd-2:2380 \
  --endpoints=https://etcd-0:2379,https://etcd-1:2379 \
  --cacert=/etc/etcd/ca.crt \
  --cert=/etc/etcd/etcd-client.crt \
  --key=/etc/etcd/etcd-client.key
```

## Documenting Recovery Procedures

Create a runbook with clear procedures:

```markdown
# etcd Disaster Recovery Runbook

## Complete Cluster Failure

1. Assess situation and determine recovery point
2. Retrieve latest backup from S3
3. Stop all etcd nodes
4. Clear data directories on all nodes
5. Restore snapshot on all nodes
6. Start etcd cluster
7. Verify cluster health
8. Verify Kubernetes functionality
9. Document incident

## Single Node Failure

1. Check if node can rejoin cluster
2. If yes, restart etcd service
3. If no, remove member from cluster
4. Provision new node
5. Add new member to cluster
6. Wait for data synchronization

## Data Corruption

1. Identify corruption scope
2. Stop affected node
3. Remove member from cluster
4. Clear data directory
5. Add member back
6. Allow data replication

## Contact Information

- On-call: +1-555-0100
- Escalation: platform-team@company.com
- Backup access: AWS account 123456789
```

## Creating Runbooks for Common Scenarios

Document step-by-step procedures:

```bash
# scenarios/complete-cluster-loss.md
# List recent backups
aws s3 ls s3://my-backups/etcd/ --recursive | tail -10

# Download specific backup
aws s3 cp s3://my-backups/etcd/etcd-snapshot-20260209-020000.db.gz /tmp/

# Restore cluster
/usr/local/bin/etcd-restore.sh /tmp/etcd-snapshot-20260209-020000.db.gz

# Verify restoration
kubectl get nodes
kubectl get pods --all-namespaces | head -20
```

## Conclusion

Disaster recovery for external etcd clusters requires automated backups, tested restore procedures, and comprehensive monitoring. By implementing hourly snapshots to multiple locations, documenting recovery procedures, and testing them regularly, you ensure your Kubernetes control plane data remains recoverable. The combination of automated backups, point-in-time recovery capabilities through frequent snapshots, and well-tested restore scripts provides confidence that you can recover from any disaster scenario. Regular DR testing validates your procedures work correctly and helps identify gaps before real disasters occur.
