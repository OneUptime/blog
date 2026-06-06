# How to Back Up and Restore OpenTelemetry Backend Data in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kubernetes, Backup, Prometheus, Loki, Tempo

Description: Learn how to back up and restore Prometheus, Loki, and Tempo data in Kubernetes to protect your OpenTelemetry telemetry backends.

Your OpenTelemetry Collector pipeline is only as good as the backends storing the data. If Prometheus loses its TSDB, Loki loses its chunks, or Tempo loses its trace blocks, weeks or months of observability data vanish. This post covers practical backup and restore procedures for all three backends running in Kubernetes.

## Backup Strategy Overview

Each backend stores data differently, so each needs a different backup approach:

- **Prometheus** - Time-series data in a local TSDB. Snapshot API for consistent backups.
- **Loki** - Log chunks in object storage plus an index. For older BoltDB Shipper deployments, the local active index directory should be persistent and backed up until it is shipped to object storage. For Loki 2.8 and newer, TSDB is the recommended index store.
- **Tempo** - Trace blocks in object storage with recent data in memory and on local WAL in monolithic or older ingester-based deployments. Backing up the WAL protects recent data that has not reached long-term storage yet.

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
PVC_CLAIM="prometheus-server-data-prometheus-server-0"
RESTORE_POD="prometheus-restore"

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
kubectl apply -n "$NAMESPACE" -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: ${RESTORE_POD}
spec:
  restartPolicy: Never
  containers:
    - name: restore
      image: busybox
      command: ["sleep", "3600"]
      volumeMounts:
        - name: storage
          mountPath: /prometheus
  volumes:
    - name: storage
      persistentVolumeClaim:
        claimName: ${PVC_CLAIM}
EOF

kubectl wait --for=condition=Ready "pod/$RESTORE_POD" \
  -n "$NAMESPACE" --timeout=120s

# Step 4: Copy and extract backup data to the PVC
kubectl cp /tmp/prometheus-restore.tar.gz \
  "$NAMESPACE/$RESTORE_POD:/tmp/restore.tar.gz"

kubectl exec -n "$NAMESPACE" "$RESTORE_POD" -- sh -c '
  rm -rf /prometheus/*
  tar xzf /tmp/restore.tar.gz -C /prometheus --strip-components=1
  rm -f /tmp/restore.tar.gz
  echo "Snapshot extracted"
'

kubectl delete pod "$RESTORE_POD" -n "$NAMESPACE"

# Step 5: Scale Prometheus back up
echo "Scaling Prometheus back up..."
kubectl scale statefulset prometheus-server -n "$NAMESPACE" --replicas=1

echo "Restore complete. Verify data at http://prometheus:9090"
```

## Backing Up Loki

Loki stores chunks in object storage and stores index data separately. For deployments still using BoltDB Shipper, Loki writes active index files locally before shipping them to the shared object store, so back up the active index directory to protect recent unshipped index data. For Loki 2.8 and newer, TSDB is the recommended index store instead of BoltDB Shipper.

```yaml
# loki-backup-cronjob.yaml
# CronJob that backs up the Loki BoltDB Shipper active index daily
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

Tempo stores trace blocks in object storage, but monolithic and older ingester-based deployments also keep recent trace data in memory and on a local Write-Ahead Log (WAL). Back up the WAL to avoid losing the most recent data that has not reached long-term storage yet. In newer Tempo microservices deployments, Kafka is the durable write-ahead log for ingestion, so protect Kafka according to your Kafka backup and retention policy.

```bash
#!/bin/bash
# backup_tempo_wal.sh
# Backs up the Tempo WAL for crash recovery

NAMESPACE="monitoring"
TEMPO_POD="tempo-0"
S3_BUCKET="telemetry-backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Step 1: Flush in-memory traces to the WAL
# This protects traces that were still only in memory
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

Backups are useless if they are missing, stale, or corrupt. Run periodic verification checks.

```python
# verify_backups.py
# Verifies that telemetry backend backups are recent and plausibly sized
import boto3
from datetime import datetime

s3 = boto3.client("s3")
BUCKET = "telemetry-backups"
MAX_AGE_HOURS = 26  # Alert if backup is older than 26 hours

def check_latest_backup(prefix, name):
    """Check that a recent backup exists for the given backend."""
    paginator = s3.get_paginator("list_objects_v2")
    objects = []

    for page in paginator.paginate(Bucket=BUCKET, Prefix=prefix):
        objects.extend(page.get("Contents", []))

    if not objects:
        print(f"FAIL: No backups found for {name} at {prefix}")
        return False

    # Sort by last modified to find the most recent
    objects = sorted(objects, key=lambda x: x["LastModified"], reverse=True)
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
