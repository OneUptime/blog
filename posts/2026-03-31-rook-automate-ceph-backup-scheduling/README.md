# How to Automate Ceph Backup Scheduling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Backup, Snapshot, Automation

Description: Learn how to automate Ceph backup scheduling using Kubernetes CronJobs to create RBD snapshots, export data, and manage retention policies.

---

Regular automated backups protect against data loss from user errors, application bugs, and storage failures. Ceph provides snapshot primitives that can be combined with Kubernetes CronJobs to create a complete automated backup pipeline.

## Backup Strategy Options

Choose the right backup approach for your data type:

| Data Type | Backup Method |
|-----------|--------------|
| RBD block volumes | RBD snapshots + export |
| CephFS filesystem | CephFS snapshots + rsync |
| RGW objects | S3 replication or export |
| All | Velero with Rook CSI |

## Automating RBD Snapshots with CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rbd-snapshot-daily
  namespace: rook-ceph
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: snapshot
            image: quay.io/ceph/ceph:v18.2.0
            command:
            - /bin/bash
            - -c
            - |
              set -euo pipefail
              POOL="mypool"
              VOLUME="myvolume"
              SNAP_NAME="backup-$(date +%Y%m%d-%H%M%S)"

              echo "Creating snapshot $SNAP_NAME"
              rbd snap create $POOL/$VOLUME@$SNAP_NAME

              echo "Snapshot created successfully"
              rbd snap ls $POOL/$VOLUME
            volumeMounts:
            - name: ceph-config
              mountPath: /etc/ceph
            - name: ceph-keyring
              mountPath: /etc/ceph/keyring
          volumes:
          - name: ceph-config
            configMap:
              name: rook-ceph-config
          - name: ceph-keyring
            secret:
              secretName: rook-ceph-admin-secret
          restartPolicy: OnFailure
```

## Snapshot Retention Policy

Automatically prune old snapshots:

```bash
#!/bin/bash
POOL="mypool"
VOLUME="myvolume"
KEEP_DAYS=7

# List snapshots older than KEEP_DAYS
CUTOFF=$(date -d "-${KEEP_DAYS} days" +%Y%m%d)

rbd snap ls $POOL/$VOLUME --format json | \
  python3 -c "
import json, sys
snaps = json.load(sys.stdin)
cutoff = '$CUTOFF'
for snap in snaps:
    name = snap['name']
    if name.startswith('backup-') and name.split('-')[1] < cutoff:
        print(name)
" | while read snap_name; do
  echo "Removing old snapshot: $snap_name"
  rbd snap rm $POOL/$VOLUME@$snap_name
done
```

## Exporting Backups to External Storage

```bash
#!/bin/bash
POOL="mypool"
VOLUME="myvolume"
S3_BUCKET="s3://my-backup-bucket"
SNAP=$(rbd snap ls $POOL/$VOLUME --format json | \
  python3 -c "import json,sys; snaps=json.load(sys.stdin); print(snaps[-1]['name'])")

echo "Exporting snapshot $SNAP to S3"
rbd export $POOL/$VOLUME@$SNAP - | \
  aws s3 cp - $S3_BUCKET/$VOLUME/$SNAP.img \
  --storage-class STANDARD_IA
```

## Using Velero for Application-Consistent Backups

```bash
# Install Velero with Rook CSI plugin
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --bucket backup-bucket \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1

# Create backup schedule
velero schedule create daily-backup \
  --schedule="0 1 * * *" \
  --ttl 720h \
  --include-namespaces production
```

## Monitoring Backup Jobs

```bash
# Check CronJob status
kubectl -n rook-ceph get cronjobs
kubectl -n rook-ceph get jobs | sort -k5 -r | head -10

# Alert on backup failure
kubectl -n rook-ceph get jobs | grep "0/1" | grep -v "0s"
```

Prometheus alert for failed backups:

```yaml
- alert: CephBackupJobFailed
  expr: kube_job_status_failed{namespace="rook-ceph", job_name=~"rbd-snapshot.*"} > 0
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Ceph backup job {{ $labels.job_name }} failed"
```

## Summary

Automating Ceph backup scheduling with Kubernetes CronJobs creates a reliable, hands-off backup pipeline. Combining snapshot creation with retention policies and external export to S3 provides both fast recovery from recent snapshots and durable long-term storage. Alerting on job failures ensures backup problems are caught immediately rather than discovered during a recovery scenario.
