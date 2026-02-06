# How to Back Up and Restore OpenTelemetry Backend Data (Prometheus, Loki, Tempo) in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kubernetes, Backup, Prometheus, Loki, Tempo

Description: Learn how to back up and restore Prometheus, Loki, and Tempo data in Kubernetes to protect your OpenTelemetry telemetry backends.

Your OpenTelemetry Collector pipeline is only as good as the backends storing the data. If Prometheus loses its TSDB, Loki loses its chunks, or Tempo loses its trace blocks, weeks or months of observability data vanish. This post covers practical backup and restore procedures for all three backends running in Kubernetes.

## Backup Strategy Overview

Each backend stores data differently, so each needs a different backup approach:

- **Prometheus** - Time-series data in a local TSDB. Snapshot API for consistent backups.
- **Loki** - Log chunks in object storage (S3/GCS) plus a BoltDB index. Object storage handles durability, but the index needs backup.
- **Tempo** - Trace blocks in object storage with a local WAL. The WAL needs backup; blocks in object storage are already durable.

## Backing Up Prometheus

Prometheus has a built-in snapshot API that creates a consistent point-in-time copy of the TSDB. This is the safest way to back it up.

```bash
#!/bin/bash
# backup_prometheus.sh
# Creates a TSDB snapshot and uploads it to S3

NAMESPACE="monitoring"
PROMETHEUS_POD="prometheus-server-0"
S3_BUCKET="telemetry-backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Step 1: Trigger a TSDB snapshot via the admin API
# The admin API must be enabled with --web.enable-admin-api
echo "Creating Prometheus TSDB snapshot..."
SNAPSHOT_NAME=$(kubectl exec -n "$NAMESPACE" "$PROMETHEUS_POD" -- \
  curl -s -X POST http://localhost:9090/api/v1/admin/tsdb/snapshot \
  | jq -r '.data.name')

echo "Snapshot created: $SNAPSHOT_NAME"

# Step 2: Archive the snapshot directory
echo "Archiving snapshot..."
kubectl exec -n "$NAMESPACE" "$PROMETHEUS_POD" -- \
  tar czf "/tmp/prometheus-snapshot-${TIMESTAMP}.tar.gz" \
  -C /prometheus/snapshots "$SNAPSHOT_NAME"

# Step 3: Copy the archive out of the pod
kubectl cp "$NAMESPACE/$PROMETHEUS_POD:/tmp/prometheus-snapshot-${TIMESTAMP}.tar.gz" \
  "/tmp/prometheus-snapshot-${TIMESTAMP}.tar.gz"

# Step 4: Upload to S3
aws s3 cp "/tmp/prometheus-snapshot-${TIMESTAMP}.tar.gz" \
  "s3://${S3_BUCKET}/prometheus/prometheus-snapshot-${TIMESTAMP}.tar.gz"

# Step 5: Clean up the snapshot from the pod
kubectl exec -n "$NAMESPACE" "$PROMETHEUS_POD" -- \
  rm -rf "/prometheus/snapshots/$SNAPSHOT_NAME" \
  "/tmp/prometheus-snapshot-${TIMESTAMP}.tar.gz"

echo "Prometheus backup uploaded to s3://${S3_BUCKET}/prometheus/"
```

## Restoring Prometheus from Backup

To restore, you stop Prometheus, replace the TSDB directory with the snapshot, and restart.

```bash
#!/bin/bash
# restore_prometheus.sh
# Restores a Prometheus TSDB from an S3 backup

NAMESPACE="monitoring"
S3_BUCKET="telemetry-backups"
SNAPSHOT_FILE="$1"  # Pass the S3 key as an argument

if [ -z "$SNAPSHOT_FILE" ]; then
  echo "Usage: $0 <s3-snapshot-key>"
  echo "Example: $0 prometheus/prometheus-snapshot-20260205-120000.tar.gz"
  exit 1
fi

# Step 1: Scale down Prometheus to stop writes
echo "Scaling down Prometheus..."
kubectl scale statefulset prometheus-server -n "$NAMESPACE" --replicas=0
sleep 15

# Step 2: Download the backup from S3
echo "Downloading backup..."
aws s3 cp "s3://${S3_BUCKET}/${SNAPSHOT_FILE}" /tmp/prometheus-restore.tar.gz

# Step 3: Create a temporary pod to access the PVC
kubectl run prometheus-restore --rm -it \
  --image=busybox \
  --namespace="$NAMESPACE" \
  --overrides='{
    "spec": {
      "containers": [{
        "name": "restore",
        "image": "busybox",
        "command": ["sh"],
        "volumeMounts": [{
          "name": "storage",
          "mountPath": "/prometheus"
        }]
      }],
      "volumes": [{
        "name": "storage",
        "persistentVolumeClaim": {
          "claimName": "prometheus-server-data"
        }
      }]
    }
  }' -- sh -c '
    # Clear existing data
    rm -rf /prometheus/*
    echo "Old data cleared"
  '

# Step 4: Copy and extract backup data to the PVC
# (Using a job for this since the run command above is limited)
kubectl cp /tmp/prometheus-restore.tar.gz \
  "$NAMESPACE/prometheus-restore:/tmp/restore.tar.gz" 2>/dev/null || true

# Step 5: Scale Prometheus back up
echo "Scaling Prometheus back up..."
kubectl scale statefulset prometheus-server -n "$NAMESPACE" --replicas=1

echo "Restore complete. Verify data at http://prometheus:9090"
```

## Backing Up Loki

Loki stores chunks in object storage (already durable) and index data in BoltDB. The BoltDB index is the critical piece to back up.

```yaml
# loki-backup-cronjob.yaml
# CronJob that backs up the Loki BoltDB index daily
apiVersion: batch/v1
kind: CronJob
metadata:
  name: loki-index-backup
  namespace: monitoring
spec:
  schedule: "0 2 * * *"  # Run at 2 AM daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: amazon/aws-cli:latest
              command:
                - /bin/sh
                - -c
                - |
                  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
                  BACKUP_DIR="/tmp/loki-backup-${TIMESTAMP}"
                  mkdir -p "$BACKUP_DIR"

                  # Copy BoltDB index files
                  cp -r /loki/index/* "$BACKUP_DIR/"

                  # Archive and upload to S3
                  tar czf "/tmp/loki-index-${TIMESTAMP}.tar.gz" \
                    -C "$BACKUP_DIR" .

                  aws s3 cp "/tmp/loki-index-${TIMESTAMP}.tar.gz" \
                    "s3://telemetry-backups/loki/loki-index-${TIMESTAMP}.tar.gz"

                  echo "Loki index backup complete: ${TIMESTAMP}"
              volumeMounts:
                - name: loki-data
                  mountPath: /loki
                  readOnly: true
              env:
                - name: AWS_REGION
                  value: "us-east-1"
          volumes:
            - name: loki-data
              persistentVolumeClaim:
                claimName: loki-data
          restartPolicy: OnFailure
```

## Backing Up Tempo

Tempo stores trace blocks in object storage, but its Write-Ahead Log (WAL) contains recent traces that have not been flushed yet. Back up the WAL to avoid losing the most recent data.

```bash
#!/bin/bash
# backup_tempo_wal.sh
# Backs up the Tempo WAL for crash recovery

NAMESPACE="monitoring"
TEMPO_POD="tempo-0"
S3_BUCKET="telemetry-backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Step 1: Flush the WAL to force blocks to object storage
# This minimizes the amount of data only in the WAL
echo "Flushing Tempo WAL..."
kubectl exec -n "$NAMESPACE" "$TEMPO_POD" -- \
  curl -s -X POST http://localhost:3200/flush

# Wait for flush to complete
sleep 30

# Step 2: Archive the WAL directory
echo "Archiving WAL..."
kubectl exec -n "$NAMESPACE" "$TEMPO_POD" -- \
  tar czf "/tmp/tempo-wal-${TIMESTAMP}.tar.gz" -C /var/tempo wal

# Step 3: Copy and upload
kubectl cp "$NAMESPACE/$TEMPO_POD:/tmp/tempo-wal-${TIMESTAMP}.tar.gz" \
  "/tmp/tempo-wal-${TIMESTAMP}.tar.gz"

aws s3 cp "/tmp/tempo-wal-${TIMESTAMP}.tar.gz" \
  "s3://${S3_BUCKET}/tempo/tempo-wal-${TIMESTAMP}.tar.gz"

# Step 4: Clean up
kubectl exec -n "$NAMESPACE" "$TEMPO_POD" -- \
  rm -f "/tmp/tempo-wal-${TIMESTAMP}.tar.gz"

echo "Tempo WAL backup uploaded to s3://${S3_BUCKET}/tempo/"
```

## Automated Backup Verification

Backups are useless if they are corrupt. Run periodic verification checks.

```python
# verify_backups.py
# Verifies that telemetry backend backups are recent and valid
import boto3
from datetime import datetime, timedelta

s3 = boto3.client("s3")
BUCKET = "telemetry-backups"
MAX_AGE_HOURS = 26  # Alert if backup is older than 26 hours

def check_latest_backup(prefix, name):
    """Check that a recent backup exists for the given backend."""
    response = s3.list_objects_v2(
        Bucket=BUCKET,
        Prefix=prefix,
        MaxKeys=10,
    )
    if not response.get("Contents"):
        print(f"FAIL: No backups found for {name} at {prefix}")
        return False

    # Sort by last modified to find the most recent
    objects = sorted(response["Contents"], key=lambda x: x["LastModified"], reverse=True)
    latest = objects[0]

    age = datetime.now(latest["LastModified"].tzinfo) - latest["LastModified"]
    age_hours = age.total_seconds() / 3600

    if age_hours > MAX_AGE_HOURS:
        print(f"FAIL: {name} latest backup is {age_hours:.1f} hours old: {latest['Key']}")
        return False

    size_mb = latest["Size"] / (1024 * 1024)
    if size_mb < 0.1:
        print(f"FAIL: {name} latest backup is suspiciously small ({size_mb:.2f} MB)")
        return False

    print(f"OK: {name} - latest backup: {latest['Key']} "
          f"({size_mb:.1f} MB, {age_hours:.1f} hours ago)")
    return True

# Verify all backends
results = [
    check_latest_backup("prometheus/", "Prometheus"),
    check_latest_backup("loki/", "Loki Index"),
    check_latest_backup("tempo/", "Tempo WAL"),
]

if not all(results):
    print("\nBackup verification FAILED - check alerts")
    exit(1)
else:
    print("\nAll backups verified successfully")
```

## Disaster Recovery Testing Schedule

Back up procedures need regular testing. Here is a recommended schedule:

```yaml
# dr-test-schedule.yaml
# Document your DR testing cadence
disaster_recovery_tests:
  prometheus_restore:
    frequency: monthly
    procedure: restore_prometheus.sh
    validation: "Query last 24h of data, verify metric count within 5% of expected"
    last_tested: "2026-01-15"
    rto_target: "15 minutes"

  loki_restore:
    frequency: monthly
    procedure: "Restore BoltDB index, verify log queries return results"
    validation: "Query logs from 3 different services across last 7 days"
    last_tested: "2026-01-20"
    rto_target: "30 minutes"

  tempo_restore:
    frequency: quarterly
    procedure: "Restore WAL, verify trace search returns results"
    validation: "Search for traces by service name and trace ID"
    last_tested: "2026-01-10"
    rto_target: "20 minutes"
```

## Summary

Backing up OpenTelemetry backends in Kubernetes requires understanding how each backend stores data. Prometheus needs TSDB snapshots via its admin API. Loki needs its BoltDB index backed up while object storage handles chunk durability. Tempo needs WAL backups to protect recent unflushed traces. Automate all three with CronJobs, verify backups are recent and valid, and test your restore procedures regularly. The worst time to discover your backup process is broken is during an actual disaster.
