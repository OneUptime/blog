# How to Use Velero Backup Describe Commands to Analyze Backup Contents

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Velero, Troubleshooting, Backup Analysis

Description: Learn how to use Velero backup describe commands to analyze backup contents, troubleshoot backup issues, and verify that your disaster recovery backups contain the resources you expect.

---

Creating backups is only useful if they contain the right resources. Velero's describe commands provide detailed information about backup contents, status, warnings, and errors. Learning to analyze backup descriptions helps you catch configuration issues before disaster strikes.

## Basic Backup Description

The simplest way to view backup details:

```bash
# List all backups
velero backup get

# Describe a specific backup
velero backup describe production-backup-20260209
```

The output shows:

```
Name:         production-backup-20260209
Namespace:    velero
Labels:       velero.io/schedule-name=production-daily
Status:       Completed
Errors:       0
Warnings:     2
Created:      2026-02-09 02:00:15 +0000 UTC
Expires:      2026-02-16 02:00:15 +0000 UTC (in 6 days)
Storage Location: default
Namespaces:
  Included:  production
  Excluded:  <none>
Resources:
  Included:  *
  Excluded:  <none>
  Cluster-scoped:  auto
```

This high-level view shows backup status, expiration, and basic configuration.

## Detailed Resource Analysis

Get detailed information about backed up resources:

```bash
# Show detailed resource information
velero backup describe production-backup-20260209 --details
```

This displays a complete resource inventory:

```
Resource List:
  apps/v1/Deployment:
    - production/api-server
    - production/web-frontend
    - production/worker
  v1/Service:
    - production/api-service
    - production/web-service
  v1/ConfigMap:
    - production/app-config
    - production/database-config
  v1/Secret:
    - production/database-password
    - production/api-keys
  v1/PersistentVolumeClaim:
    - production/database-pvc
    - production/uploads-pvc
```

This shows exactly what was backed up.

## Analyzing Backup Warnings

Warnings indicate potential issues that didn't prevent the backup but need attention:

```bash
# Show warnings
velero backup describe production-backup-20260209 --warnings
```

Common warnings include:

```
Warnings: 2
  Could not get volume info for persistent volume claim production/cache-pvc: volume not found
  Resource production/old-deployment has 0 replicas, skipping
```

Parse warnings programmatically:

```bash
#!/bin/bash
# analyze-warnings.sh

BACKUP_NAME=$1

# Extract warnings
velero backup describe $BACKUP_NAME | \
  sed -n '/^Warnings:/,/^[A-Z]/p' | \
  grep -v "^Warnings:" | \
  grep -v "^[A-Z]" | \
  while read warning; do
    echo "WARNING: $warning"

    # Alert on specific warnings
    if echo "$warning" | grep -q "Could not get volume info"; then
      echo "  → Action: Check PVC and volume snapshot configuration"
    elif echo "$warning" | grep -q "has 0 replicas"; then
      echo "  → Action: Consider excluding scaled-down resources"
    fi
  done
```

## Checking for Errors

Errors indicate resources that failed to backup:

```bash
# View errors
velero backup describe production-backup-20260209 --errors
```

Example errors:

```
Errors: 1
  Error backing up production/failing-pvc: snapshot failed: volume snapshot timeout
```

This tells you exactly what failed and why.

## Analyzing Backup Logs

Get detailed logs of the backup operation:

```bash
# View backup logs
velero backup logs production-backup-20260209

# Filter for errors and warnings
velero backup logs production-backup-20260209 | grep -E 'error|warning' -i

# Search for specific resource
velero backup logs production-backup-20260209 | grep "api-server"
```

Logs show the backup process step by step:

```
time="2026-02-09T02:00:15Z" level=info msg="Backing up namespace" namespace=production
time="2026-02-09T02:00:16Z" level=info msg="Backing up resource" resource=deployments
time="2026-02-09T02:00:17Z" level=info msg="Backed up 3 deployments"
time="2026-02-09T02:00:18Z" level=warning msg="PVC has no volume snapshot" pvc=cache-pvc
time="2026-02-09T02:00:20Z" level=info msg="Backup completed successfully"
```

## Comparing Backups

Compare two backups to see what changed:

```bash
#!/bin/bash
# compare-backups.sh

BACKUP1=$1
BACKUP2=$2

echo "Comparing $BACKUP1 and $BACKUP2"
echo "---"

# Get resource lists
velero backup describe $BACKUP1 --details | \
  grep -A 1000 "Resource List:" | \
  grep "^\s\+[a-z]" | \
  sort > /tmp/backup1.txt

velero backup describe $BACKUP2 --details | \
  grep -A 1000 "Resource List:" | \
  grep "^\s\+[a-z]" | \
  sort > /tmp/backup2.txt

# Show differences
echo "Resources only in $BACKUP1:"
comm -23 /tmp/backup1.txt /tmp/backup2.txt

echo ""
echo "Resources only in $BACKUP2:"
comm -13 /tmp/backup1.txt /tmp/backup2.txt

echo ""
echo "Common resources:"
comm -12 /tmp/backup1.txt /tmp/backup2.txt | wc -l
```

## Verifying Backup Completeness

Check if expected resources were backed up:

```bash
#!/bin/bash
# verify-backup-completeness.sh

BACKUP_NAME=$1
NAMESPACE=$2

# Get expected resources from cluster
echo "Expected resources in $NAMESPACE:"
kubectl get all,pvc,configmap,secret -n $NAMESPACE -o name | sort > /tmp/expected.txt

# Get resources from backup
echo "Resources in backup $BACKUP_NAME:"
velero backup describe $BACKUP_NAME --details | \
  grep "$NAMESPACE/" | \
  awk '{print $2}' | \
  sort > /tmp/backed-up.txt

# Compare
echo "---"
echo "Missing from backup:"
comm -23 /tmp/expected.txt /tmp/backed-up.txt

echo ""
echo "In backup but not in cluster:"
comm -13 /tmp/expected.txt /tmp/backed-up.txt
```

## Analyzing Backup Size and Duration

Track backup metrics over time:

```bash
#!/bin/bash
# backup-metrics.sh

# Get all backups for a schedule
SCHEDULE_NAME="production-daily"

velero backup get -l velero.io/schedule-name=$SCHEDULE_NAME -o json | \
  jq -r '.items[] | [
    .metadata.name,
    .status.completionTimestamp,
    .status.startTimestamp,
    .status.totalItems,
    .status.phase
  ] | @tsv' | \
  while IFS=$'\t' read name completed started items phase; do
    # Calculate duration
    start_epoch=$(date -d "$started" +%s 2>/dev/null || echo 0)
    end_epoch=$(date -d "$completed" +%s 2>/dev/null || echo 0)
    duration=$((end_epoch - start_epoch))

    echo "Backup: $name"
    echo "  Duration: ${duration}s"
    echo "  Items: $items"
    echo "  Status: $phase"
    echo "---"
  done
```

## Checking Volume Snapshot Status

Verify persistent volume snapshots:

```bash
# Get backup with volume info
velero backup describe production-backup-20260209

# Look for volume snapshot section
velero backup describe production-backup-20260209 | \
  grep -A 20 "Persistent Volumes:"
```

Expected output:

```
Persistent Volumes:
  pv-12345:
    Snapshot ID:        snap-abc123
    Type:              snapshot
    Availability Zone:  us-east-1a
    IOPS:              3000
```

Script to verify all PVCs have snapshots:

```bash
#!/bin/bash
# verify-volume-snapshots.sh

BACKUP_NAME=$1

# Get PVCs from backup
velero backup describe $BACKUP_NAME --details | \
  grep "PersistentVolumeClaim:" -A 100 | \
  grep "^\s\+-" | \
  sed 's/^\s\+-\s//' | \
  while read pvc; do
    # Check if snapshot exists
    if velero backup describe $BACKUP_NAME | grep -q "$pvc.*Snapshot ID"; then
      echo "✓ $pvc has snapshot"
    else
      echo "✗ $pvc missing snapshot"
    fi
  done
```

## Analyzing Backup Hooks Execution

Check if backup hooks executed successfully:

```bash
# View hook execution logs
velero backup logs production-backup-20260209 | grep -i hook

# Expected output shows hooks running
time="2026-02-09T02:00:16Z" level=info msg="Running pre hook" hook=database-freeze
time="2026-02-09T02:00:17Z" level=info msg="Pre hook completed successfully"
time="2026-02-09T02:00:25Z" level=info msg="Running post hook" hook=database-unfreeze
time="2026-02-09T02:00:26Z" level=info msg="Post hook completed successfully"
```

## Exporting Backup Information

Export backup details for analysis or reporting:

```bash
# Export to JSON
velero backup describe production-backup-20260209 -o json > backup-details.json

# Extract specific information
cat backup-details.json | jq '{
  name: .metadata.name,
  phase: .status.phase,
  errors: .status.errors,
  warnings: .status.warnings,
  totalItems: .status.totalItems,
  duration: (.status.completionTimestamp | fromdateiso8601) - (.status.startTimestamp | fromdateiso8601)
}'
```

Create a backup report:

```python
#!/usr/bin/env python3
# backup-report.py

import json
import subprocess
from datetime import datetime

def get_backup_details(backup_name):
    """Get backup details from Velero."""
    result = subprocess.run(
        ['velero', 'backup', 'describe', backup_name, '-o', 'json'],
        capture_output=True,
        text=True
    )
    return json.loads(result.stdout)

def generate_report(backup_name):
    """Generate a readable backup report."""
    details = get_backup_details(backup_name)
    status = details['status']

    print(f"Backup Report: {backup_name}")
    print("=" * 60)
    print(f"Status: {status.get('phase', 'Unknown')}")
    print(f"Items backed up: {status.get('totalItems', 0)}")
    print(f"Errors: {status.get('errors', 0)}")
    print(f"Warnings: {status.get('warnings', 0)}")

    # Calculate duration
    start = datetime.fromisoformat(status['startTimestamp'].replace('Z', '+00:00'))
    end = datetime.fromisoformat(status['completionTimestamp'].replace('Z', '+00:00'))
    duration = (end - start).total_seconds()
    print(f"Duration: {duration:.0f} seconds")

    # List namespaces
    print(f"\nNamespaces:")
    for ns in details['spec'].get('includedNamespaces', []):
        print(f"  - {ns}")

    # Show any errors
    if status.get('errors', 0) > 0:
        print(f"\n⚠ Errors detected - review logs for details")

if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print("Usage: backup-report.py <backup-name>")
        sys.exit(1)

    generate_report(sys.argv[1])
```

## Automated Backup Analysis

Set up automated backup verification:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-analyzer
  namespace: velero
spec:
  schedule: "0 4 * * *"  # Run at 4 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: velero
          containers:
          - name: analyzer
            image: velero/velero:latest
            command:
            - /bin/bash
            - -c
            - |
              # Get latest backup
              LATEST=$(velero backup get -o json | \
                jq -r '.items | sort_by(.metadata.creationTimestamp) | last | .metadata.name')

              echo "Analyzing backup: $LATEST"

              # Check status
              STATUS=$(velero backup describe $LATEST -o json | jq -r '.status.phase')

              if [ "$STATUS" != "Completed" ]; then
                echo "ERROR: Backup failed with status: $STATUS"
                exit 1
              fi

              # Check for errors
              ERRORS=$(velero backup describe $LATEST -o json | jq -r '.status.errors // 0')

              if [ "$ERRORS" -gt 0 ]; then
                echo "ERROR: Backup has $ERRORS errors"
                velero backup describe $LATEST --errors
                exit 1
              fi

              # Verify expected resources
              ITEMS=$(velero backup describe $LATEST -o json | jq -r '.status.totalItems')

              if [ "$ITEMS" -lt 10 ]; then
                echo "WARNING: Only $ITEMS items backed up (expected more)"
              fi

              echo "✓ Backup analysis passed"
          restartPolicy: OnFailure
```

## Conclusion

Velero's describe and logs commands provide comprehensive insight into backup operations. Use them to verify backup completeness, troubleshoot failures, and ensure your disaster recovery strategy captures the resources you need.

Make backup analysis part of your regular operational routine. Don't wait for a disaster to discover that your backups are incomplete or misconfigured. Regular analysis catches issues early and builds confidence in your disaster recovery capability.

Remember that a backup you haven't analyzed is a backup you don't really have. Take time to understand what's in your backups, verify that critical resources are captured, and address any warnings or errors promptly.
