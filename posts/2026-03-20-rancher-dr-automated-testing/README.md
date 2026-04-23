# How to Automate Rancher DR Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Disaster-recovery, Automation, Testing, Kubernetes, Ci-cd

Description: Guide to automating Rancher disaster recovery tests using scripts and CI/CD pipelines to ensure continuous DR readiness.

## Introduction

Manual DR testing is time-consuming and often skipped under workload pressure. Automating DR tests ensures they happen consistently and results are tracked over time. This guide covers building automated DR test pipelines for Rancher.

## Automated Testing Goals

- Verify backup creation succeeds daily
- Test restoration to a test environment weekly
- Validate RTO/RPO metrics automatically
- Generate reports for compliance
- Alert when DR readiness degrades

## Step 1: Backup Verification Automation

```bash
#!/bin/bash
# verify-backups.sh - Run daily via cron

set -e
BUCKET="rancher-production-backups"
MAX_AGE_HOURS=4  # Alert if newest backup is older than 4 hours
REPORT_FILE="/tmp/backup-verification-$(date +%Y%m%d).log"

echo "=== Backup Verification $(date) ===" | tee "$REPORT_FILE"

# List all backups

BACKUPS=$(aws s3 ls "s3://${BUCKET}/rancher/" --recursive | sort)
if [ -z "$BACKUPS" ] || [ "$BACKUPS" = "None" ]; then
  echo "ALERT: No backups found in s3://${BUCKET}/rancher/" | tee -a "$REPORT_FILE"
  curl -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-type: application/json' \
    -d "{\"text\":\"⚠️ Rancher backup alert: no backups found in s3://${BUCKET}/rancher/\"}"
  exit 1
fi

BACKUP_COUNT=$(printf '%s\n' "$BACKUPS" | wc -l)
echo "Total backups found: $BACKUP_COUNT" | tee -a "$REPORT_FILE"

# Check latest backup age
LATEST_DATE=$(echo "$BACKUPS" | tail -1 | awk '{print $1" "$2}')
LATEST_EPOCH=$(date -d "$LATEST_DATE" +%s 2>/dev/null || \
               date -j -f "%Y-%m-%d %H:%M:%S" "$LATEST_DATE" +%s)
NOW=$(date +%s)
AGE_HOURS=$(( (NOW - LATEST_EPOCH) / 3600 ))

echo "Latest backup: $LATEST_DATE (${AGE_HOURS}h ago)" | tee -a "$REPORT_FILE"

if [ "$AGE_HOURS" -gt "$MAX_AGE_HOURS" ]; then
  echo "ALERT: Backup is ${AGE_HOURS}h old (threshold: ${MAX_AGE_HOURS}h)" | tee -a "$REPORT_FILE"
  # Send alert
  curl -X POST "$SLACK_WEBHOOK_URL" \
    -H 'Content-type: application/json' \
    -d "{\"text\":\"⚠️ Rancher backup alert: newest backup is ${AGE_HOURS}h old\"}"
  exit 1
fi

echo "PASS: Backup verification successful" | tee -a "$REPORT_FILE"
```

## Step 2: Automated Restore Test Pipeline

Create a GitHub Actions workflow for weekly restore tests using Rancher's same-setup restore flow. If you want to restore into a different cluster for DR drills, follow Rancher's migration workflow instead.

```yaml
# .github/workflows/dr-test.yml
name: Rancher DR Restore Test

on:
  schedule:
    - cron: '0 2 * * 0'  # Every Sunday at 2 AM UTC
  workflow_dispatch:       # Allow manual trigger

env:
  AWS_REGION: us-east-1
  TEST_CLUSTER_CONTEXT: dr-test-cluster

jobs:
  dr-restore-test:
    name: DR Restore Test
    runs-on: self-hosted
    timeout-minutes: 120
    
    steps:
    - name: Checkout
      uses: actions/checkout@v4
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: ${{ env.AWS_REGION }}
    
    - name: Get latest backup
      id: backup
      run: |
        LATEST_KEY=$(aws s3 ls s3://rancher-production-backups/rancher/ \
          --recursive | sort | tail -1 | awk '{print $4}')
        if [ -z "$LATEST_KEY" ] || [ "$LATEST_KEY" = "None" ]; then
          echo "No backups found in s3://rancher-production-backups/rancher/"
          exit 1
        fi
        LATEST="${LATEST_KEY#rancher/}"
        echo "backup_file=$LATEST" >> "$GITHUB_OUTPUT"
        echo "Latest backup: $LATEST"
    
    - name: Remove old Restore resources
      run: |
        # This assumes the cluster under test has already been cleaned or recreated.
        kubectl --context $TEST_CLUSTER_CONTEXT delete restore \
          --all 2>/dev/null || true
        sleep 30
    
    - name: Execute restore
      id: restore
      run: |
        RESTORE_START=$(date +%s)
        RESTORE_NAME="dr-test-$(date +%Y%m%d%H%M%S)"
        
        kubectl --context $TEST_CLUSTER_CONTEXT apply -f - << EOF
        apiVersion: resources.cattle.io/v1
        kind: Restore
        metadata:
          name: ${RESTORE_NAME}
        spec:
          backupFilename: "${{ steps.backup.outputs.backup_file }}"
          prune: true
          storageLocation:
            s3:
              bucketName: rancher-production-backups
              folder: rancher
              region: us-east-1
              credentialSecretName: aws-backup-creds
              credentialSecretNamespace: cattle-resources-system
              endpoint: s3.us-east-1.amazonaws.com
        EOF
        
        # Wait for restore to complete
        export TEST_CLUSTER_CONTEXT RESTORE_NAME
        timeout 3600 bash <<'EOF'
        while true; do
          READY_MESSAGE=$(kubectl --context "$TEST_CLUSTER_CONTEXT" get restore "$RESTORE_NAME" \
            -o jsonpath='{.status.conditions[?(@.type=="Ready")].message}' 2>/dev/null)
          RECONCILING_REASON=$(kubectl --context "$TEST_CLUSTER_CONTEXT" get restore "$RESTORE_NAME" \
            -o jsonpath='{.status.conditions[?(@.type=="Reconciling")].reason}' 2>/dev/null)
          echo "Status: ${READY_MESSAGE:-$RECONCILING_REASON}"
          [ "$READY_MESSAGE" = "Completed" ] && break
          [ "$RECONCILING_REASON" = "Error" ] && exit 1
          sleep 15
        done
        EOF
        
        RESTORE_END=$(date +%s)
        RESTORE_DURATION=$((RESTORE_END - RESTORE_START))
        echo "restore_duration=$RESTORE_DURATION" >> "$GITHUB_OUTPUT"
    
    - name: Validate restored environment
      id: validate
      run: |
        # Check Rancher is serving health checks
        DR_URL="${{ vars.DR_RANCHER_URL }}"
        VALIDATION_RESULT=FAIL
        
        for i in {1..10}; do
          if curl -sf "${DR_URL}/healthz"; then
            VALIDATION_RESULT=PASS
            break
          fi
          sleep 30
        done
        
        echo "validation_result=$VALIDATION_RESULT" >> "$GITHUB_OUTPUT"
        [ "$VALIDATION_RESULT" = "PASS" ] || exit 1
    
    - name: Calculate RTO
      run: |
        DURATION="${{ steps.restore.outputs.restore_duration }}"
        MINUTES=$((DURATION / 60))
        echo "RTO achieved: ${MINUTES} minutes"
        
        # Fail if RTO exceeds target (4 hours = 14400 seconds)
        if [ "$DURATION" -gt 14400 ]; then
          echo "FAIL: RTO target exceeded!"
          exit 1
        fi
    
    - name: Publish test results
      if: always()
      run: |
        # Store results in S3 for historical tracking
        cat > /tmp/dr-test-result.json << RESULTEOF
        {
          "date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
          "backup_file": "${{ steps.backup.outputs.backup_file }}",
          "restore_duration_seconds": ${{ steps.restore.outputs.restore_duration }},
          "validation": "${{ steps.validate.outputs.validation_result }}",
          "workflow_run_id": "${{ github.run_id }}"
        }
        RESULTEOF
        
        aws s3 cp /tmp/dr-test-result.json \
          "s3://rancher-dr-reports/$(date +%Y/%m/%d)-result.json"
```

## Step 3: RTO/RPO Dashboard

Before using these queries, enable Rancher backup operator metrics (`monitoring.metrics.enabled: true` and `monitoring.serviceMonitor.enabled: true`) and make sure `rancher-monitoring` is installed. If your workflow also exports custom DR-test metrics to Prometheus, the dashboard can combine those custom metrics with Rancher's built-in backup operator metrics:

```yaml
# dr-metrics-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dr-test-dashboard
  namespace: monitoring
data:
  dashboard.json: |
    {
      "title": "Rancher DR Metrics",
      "panels": [
        {
          "title": "Latest RTO (minutes)",
          "type": "stat",
          "targets": [{
            "expr": "dr_restore_duration_seconds / 60"
          }]
        },
        {
          "title": "Backup Age (hours)",
          "type": "stat",
          "targets": [{
            "expr": "(time() - max(rancher_backup_last_processed_timestamp_seconds)) / 3600"
          }]
        },
        {
          "title": "DR Test Pass Rate (30d)",
          "type": "stat",
          "targets": [{
            "expr": "100 * sum(increase(dr_test_pass_total[30d])) / clamp_min(sum(increase(dr_test_total[30d])), 1)"
          }]
        }
      ]
    }
```

## Step 4: Chaos Engineering Tests

```bash
#!/bin/bash
# chaos-dr-test.sh - Example scaffolding for DR tests under adverse conditions

echo "=== Chaos DR Test ==="

# Test 1: Restore from corrupted backup (should fail gracefully)
echo "Test 1: Corrupted backup handling..."
echo "invalid data" > /tmp/corrupted-backup.tar.gz
# Attempt restore - should fail with clear error, not hang

# Test 2: Restore during high load
echo "Test 2: Restore under load..."
# Generate CPU load on the test cluster
kubectl create namespace dr-test --dry-run=client -o yaml | kubectl apply -f -
kubectl run load-test --image=busybox \
  --restart=Never \
  --command -- sh -c "while true; do :; done" \
  --namespace dr-test

# Simultaneously run restore
# ...

# Test 3: Network interruption during restore
echo "Test 3: Network interruption..."
# Start restore, then simulate network outage
# Verify restore resumes or retries appropriately

echo "Chaos tests complete"
```

## Step 5: Automated Alerting

If you are using custom alert rules, enable `monitoring.prometheusRules.customRules.enabled: true` in the Rancher Backups chart, then apply a `PrometheusRule` like this:

```yaml
# dr-prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: rancher-dr-alerts
  namespace: cattle-monitoring-system
spec:
  groups:
  - name: dr-readiness
    interval: 5m
    rules:
    - alert: BackupTooOld
      expr: |
        (time() - max(rancher_backup_last_processed_timestamp_seconds)) > 14400
      for: 30m
      labels:
        severity: warning
        team: platform
      annotations:
        summary: "Rancher backup is over 4 hours old"
        description: "The most recent backup processed by the Rancher backup operator is older than 4 hours."
    
    - alert: BackupFailed
      expr: increase(rancher_backups_failed_total[15m]) > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Rancher backup has failed recently"
```

## Conclusion

Automated DR testing transforms disaster recovery from a periodic manual exercise into a continuous validation process. By integrating backup verification, automated restore tests, and RTO/RPO tracking into your CI/CD pipeline, you maintain confidence in your DR capabilities without manual overhead.
