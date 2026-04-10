# How to Automate Ceph Backup Scheduling with Cron

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Backup, Cron, Automation, Scheduling

Description: Automate Ceph backup scheduling using cron and Kubernetes CronJobs to export RBD snapshots, CephFS backups, and RGW data on a regular schedule.

---

Consistent backup scheduling is critical for data protection in Ceph clusters. This guide shows how to automate backups at multiple levels using cron on bare-metal and Kubernetes CronJobs on Rook deployments.

## Ceph Backup Strategy

A complete Ceph backup strategy covers three data types:

- RBD volumes: snapshot and export to an S3-compatible store
- CephFS: rsync or ceph-fuse based backup to remote storage
- RGW data: S3 replication or export using rclone

## RBD Snapshot and Export Script

```bash
#!/bin/bash
# backup-rbd.sh

set -euo pipefail

NAMESPACE="${CEPH_NAMESPACE:-rook-ceph}"
POOL="${RBD_POOL:-replicapool}"
IMAGE="${RBD_IMAGE:?RBD image name required}"
S3_BUCKET="${S3_BUCKET:?S3 bucket required}"
S3_ENDPOINT="${S3_ENDPOINT:-https://s3.amazonaws.com}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SNAPSHOT_NAME="backup-$TIMESTAMP"

rbd_cmd() {
  kubectl -n "$NAMESPACE" exec deploy/rook-ceph-tools -- rbd "$@"
}

# Create snapshot
echo "Creating snapshot: $SNAPSHOT_NAME"
rbd_cmd snap create "$POOL/$IMAGE@$SNAPSHOT_NAME"

# Export snapshot to S3
echo "Exporting to S3..."
rbd_cmd export "$POOL/$IMAGE@$SNAPSHOT_NAME" - | \
  aws s3 cp - "s3://$S3_BUCKET/rbd/$IMAGE/$SNAPSHOT_NAME.img" \
  --endpoint-url "$S3_ENDPOINT"

# Remove old snapshots (retention)
echo "Cleaning up old snapshots..."
rbd_cmd snap ls "$POOL/$IMAGE" --format json | python3 -c "
import sys, json
from datetime import datetime, timedelta
snaps = json.load(sys.stdin)
cutoff = datetime.now() - timedelta(days=$RETENTION_DAYS)
for snap in snaps:
    name = snap['name']
    if name.startswith('backup-'):
        ts_str = name.replace('backup-', '')
        try:
            ts = datetime.strptime(ts_str, '%Y%m%d-%H%M%S')
            if ts < cutoff:
                print(name)
        except ValueError:
            pass
" | while read -r snap; do
  echo "Removing old snapshot: $snap"
  rbd_cmd snap rm "$POOL/$IMAGE@$snap"
done

echo "Backup complete: $SNAPSHOT_NAME"
```

## Kubernetes CronJob for RBD Backup

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rbd-backup
  namespace: rook-ceph
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: rook-ceph-backup
          containers:
            - name: backup
              image: rook/ceph:v1.13.0
              command: ["/bin/bash", "/scripts/backup-rbd.sh"]
              env:
                - name: RBD_POOL
                  value: replicapool
                - name: RBD_IMAGE
                  value: mysql-data
                - name: S3_BUCKET
                  valueFrom:
                    secretKeyRef:
                      name: backup-config
                      key: s3-bucket
              volumeMounts:
                - name: backup-scripts
                  mountPath: /scripts
          volumes:
            - name: backup-scripts
              configMap:
                name: backup-scripts
          restartPolicy: OnFailure
```

## RGW Data Backup with Rclone

```bash
#!/bin/bash
# backup-rgw.sh

SOURCE_ENDPOINT="${SOURCE_ENDPOINT:?}"
SOURCE_ACCESS_KEY="${SOURCE_ACCESS_KEY:?}"
SOURCE_SECRET_KEY="${SOURCE_SECRET_KEY:?}"
DEST_BUCKET="${DEST_BUCKET:?}"

# Configure rclone source
cat > /tmp/rclone.conf << EOF
[ceph-source]
type = s3
provider = Ceph
endpoint = $SOURCE_ENDPOINT
access_key_id = $SOURCE_ACCESS_KEY
secret_access_key = $SOURCE_SECRET_KEY

[backup-dest]
type = s3
provider = AWS
region = us-east-1
EOF

# Sync all buckets
for bucket in $(rclone --config /tmp/rclone.conf lsd ceph-source: | awk '{print $5}'); do
  echo "Backing up bucket: $bucket"
  rclone --config /tmp/rclone.conf sync \
    "ceph-source:$bucket" \
    "backup-dest:$DEST_BUCKET/rgw/$bucket" \
    --transfers 8 \
    --checkers 16 \
    --log-level INFO
done
```

## Monitoring Backup Jobs

```bash
# Check CronJob status
kubectl -n rook-ceph get cronjobs
kubectl -n rook-ceph get jobs --sort-by=.metadata.creationTimestamp | tail -5

# Check last job logs
kubectl -n rook-ceph logs job/rbd-backup-<timestamp>
```

## Summary

Automating Ceph backups with Kubernetes CronJobs ensures consistent, repeatable data protection without manual intervention. By combining RBD snapshot exports, RGW sync with rclone, and configurable retention policies, you can meet RPO requirements across all data types stored in your Ceph cluster.
