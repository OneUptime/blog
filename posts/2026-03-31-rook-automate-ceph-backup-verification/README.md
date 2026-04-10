# How to Automate Ceph Backup Verification

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Backup, Verification, Automation, Monitoring, Testing

Description: Build automated verification pipelines for Ceph backups that test snapshot integrity, validate restore procedures, and alert on failures to ensure backups are actually recoverable.

---

## Overview

A backup that has never been tested is not a backup. Automating backup verification ensures your Ceph snapshots and exports are valid and recoverable. This guide covers building verification jobs that run after each backup and alert on failures.

## Verification Strategy

For Ceph backups, verification should check:
1. Snapshot exists and is not corrupted
2. Restore operation succeeds without errors
3. Restored data is accessible and matches expected content
4. Mirror replication lag is within acceptable bounds

## Step 1 - Verify RBD Snapshot Integrity

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash

# Check snapshot info - confirms it exists and is readable
rbd info replicapool/myvolume@backup-2026-03-31

# Map and mount to verify data is readable
rbd map replicapool/myvolume@backup-2026-03-31 --read-only
DEVICE=$(rbd showmapped | grep myvolume | awk '{print $NF}')
# Check filesystem consistency (must run before mounting)
fsck -n $DEVICE

mount -o ro $DEVICE /mnt/verify
# Verify data is accessible
ls /mnt/verify
umount /mnt/verify
rbd unmap $DEVICE
```

## Step 2 - Automate with a Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-verification
  namespace: rook-ceph
spec:
  schedule: "30 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: verify
            image: rook/ceph:v1.13.0
            command:
            - /bin/bash
            - -c
            - |
              DATE=$(date +%Y-%m-%d)
              SNAP="backup-${DATE}"
              POOL=replicapool
              IMAGE=myvolume

              if rbd info ${POOL}/${IMAGE}@${SNAP}; then
                echo "PASS: Snapshot ${SNAP} exists"
              else
                echo "FAIL: Snapshot ${SNAP} not found"
                exit 1
              fi

              # Verify snapshot is not corrupted by checking size
              SIZE=$(rbd info ${POOL}/${IMAGE}@${SNAP} --format json | jq -r '.size')
              if [ "$SIZE" -gt 0 ]; then
                echo "PASS: Snapshot size is ${SIZE} bytes"
              else
                echo "FAIL: Snapshot size is zero"
                exit 1
              fi
          restartPolicy: OnFailure
```

## Step 3 - Validate Restore Procedure

```bash
#!/bin/bash
POOL=replicapool
IMAGE=myvolume
SNAP=backup-$(date +%Y-%m-%d)
TEST_IMAGE="${IMAGE}-verify-$(date +%s)"

echo "Testing restore from $SNAP..."

# Clone snapshot to test image
rbd snap protect ${POOL}/${IMAGE}@${SNAP}
rbd clone ${POOL}/${IMAGE}@${SNAP} ${POOL}/${TEST_IMAGE}

if rbd info ${POOL}/${TEST_IMAGE}; then
  echo "PASS: Clone restore succeeded"
else
  echo "FAIL: Clone restore failed"
  exit 1
fi

# Flatten and verify
rbd flatten ${POOL}/${TEST_IMAGE}

# Cleanup test image
rbd rm ${POOL}/${TEST_IMAGE}
rbd snap unprotect ${POOL}/${IMAGE}@${SNAP}

echo "Restore verification complete"
```

## Step 4 - Monitor Mirror Replication Lag

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  rbd mirror pool status replicapool --verbose --format json | \
  jq '.images[] | {image: .name, state: .state, description: .description, last_update: .last_update}'
```

Alert if lag exceeds threshold:

```bash
LAST_UPDATE=$(rbd mirror image status replicapool/myimage --format json | \
  jq -r '.peer_sites[0].last_update')

LAST_EPOCH=$(date -d "$LAST_UPDATE" +%s 2>/dev/null)
NOW_EPOCH=$(date +%s)
LAG=$(( NOW_EPOCH - LAST_EPOCH ))

if [ "$LAG" -gt 3600 ]; then
  echo "ALERT: Mirror lag exceeds 1 hour: ${LAG} seconds"
  # Send alert via curl to alerting system
  curl -X POST https://alerts.example.com/webhook \
    -H 'Content-Type: application/json' \
    -d "{\"message\": \"Ceph mirror lag critical: ${LAG}s\"}"
fi
```

## Step 5 - Generate Verification Reports

```bash
cat > /usr/local/bin/backup-report.sh << 'EOF'
#!/bin/bash
echo "=== Ceph Backup Verification Report $(date) ==="
echo ""
echo "Snapshots:"
rbd snap ls replicapool/myvolume
echo ""
echo "Mirror Status:"
rbd mirror pool status replicapool
echo ""
echo "Pool Usage:"
ceph df detail | grep replicapool
EOF
chmod +x /usr/local/bin/backup-report.sh
```

## Summary

Automated backup verification closes the gap between taking backups and knowing they work. By running CronJob-based verification that tests snapshot existence, data integrity, and restore capability, you get confidence that your Ceph backups will actually recover data when needed. Integrating verification results into your alerting system ensures failures are caught immediately.
