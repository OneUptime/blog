# How to Build Automated Velero Backup Verification Tests Using Restore Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Velero, Kubernetes, Backup, Testing, Automation

Description: Learn how to implement automated backup verification with Velero restore jobs. Complete guide covering test strategies, validation scripts, and continuous verification workflows.

---

Backups are only valuable if they can be successfully restored. Automated backup verification ensures your disaster recovery strategy actually works by regularly testing restore operations in isolated environments. Velero's restore capabilities combined with Kubernetes Jobs enable comprehensive automated testing that validates backup integrity, application functionality, and recovery procedures without impacting production systems.

## Understanding Backup Verification Strategy

Backup verification involves more than checking that backup files exist. Comprehensive verification tests include:

1. Backup completeness (all resources backed up)
2. Restore success (resources can be recreated)
3. Data integrity (application data is intact)
4. Application functionality (services work after restore)
5. Performance metrics (restore time within SLA)

Automated testing runs these verifications on schedule, providing continuous confidence in your backup strategy.

## Creating a Basic Restore Verification Job

Start with a simple Job that restores a backup to a test namespace:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: verify-backup
  namespace: velero
spec:
  template:
    spec:
      serviceAccountName: velero
      containers:
      - name: verify
        image: velero/velero:v1.12.0
        command:
        - /bin/bash
        - -c
        - |
          #!/bin/bash
          set -e

          BACKUP_NAME="$1"
          TEST_NAMESPACE="backup-test-$(date +%s)"

          echo "Verifying backup: $BACKUP_NAME"

          # Create restore to test namespace
          velero restore create test-restore-$(date +%s) \
            --from-backup $BACKUP_NAME \
            --namespace-mappings production:$TEST_NAMESPACE \
            --wait

          # Check if restore succeeded
          RESTORE_STATUS=$(velero restore get test-restore-* -o json | jq -r '.items[0].status.phase')

          if [ "$RESTORE_STATUS" = "Completed" ]; then
            echo "Backup verification successful"

            # Cleanup test namespace
            kubectl delete namespace $TEST_NAMESPACE --wait=false

            exit 0
          else
            echo "Backup verification failed: $RESTORE_STATUS"
            exit 1
          fi
        args:
        - "daily-backup-latest"
      restartPolicy: Never
  backoffLimit: 3
```

This Job restores a backup to a temporary namespace and verifies success.

## Implementing Comprehensive Verification Script

Create a detailed verification script that checks multiple aspects:

```bash
#!/bin/bash
# backup-verification.sh

set -e

BACKUP_NAME=$1
TEST_NAMESPACE="backup-test-$(date +%s)"
RESTORE_NAME="test-restore-$(date +%s)"

echo "=========================================="
echo "Backup Verification Test"
echo "Backup: $BACKUP_NAME"
echo "Test Namespace: $TEST_NAMESPACE"
echo "=========================================="

# Step 1: Verify backup exists and is complete
echo "Step 1: Checking backup status..."
BACKUP_STATUS=$(velero backup get $BACKUP_NAME -o json | jq -r '.status.phase')

if [ "$BACKUP_STATUS" != "Completed" ]; then
  echo "ERROR: Backup status is $BACKUP_STATUS"
  exit 1
fi

BACKUP_ERRORS=$(velero backup get $BACKUP_NAME -o json | jq -r '.status.errors // 0')
if [ "$BACKUP_ERRORS" -gt 0 ]; then
  echo "WARNING: Backup has $BACKUP_ERRORS errors"
fi

echo "Backup status: OK"

# Step 2: Perform restore to test namespace
echo "Step 2: Restoring backup to test namespace..."
velero restore create $RESTORE_NAME \
  --from-backup $BACKUP_NAME \
  --namespace-mappings production:$TEST_NAMESPACE \
  --wait

# Step 3: Check restore completion
echo "Step 3: Verifying restore completion..."
RESTORE_STATUS=$(velero restore describe $RESTORE_NAME -o json | jq -r '.status.phase')

if [ "$RESTORE_STATUS" != "Completed" ]; then
  echo "ERROR: Restore failed with status: $RESTORE_STATUS"
  velero restore logs $RESTORE_NAME
  exit 1
fi

RESTORE_ERRORS=$(velero restore describe $RESTORE_NAME -o json | jq -r '.status.errors // 0')
if [ "$RESTORE_ERRORS" -gt 0 ]; then
  echo "WARNING: Restore has $RESTORE_ERRORS errors"
  velero restore logs $RESTORE_NAME | grep -i error
fi

echo "Restore status: OK"

# Step 4: Wait for pods to be ready
echo "Step 4: Waiting for pods to start..."
kubectl wait --for=condition=ready pod \
  -n $TEST_NAMESPACE \
  --all \
  --timeout=5m || true

RUNNING_PODS=$(kubectl get pods -n $TEST_NAMESPACE --field-selector=status.phase=Running --no-headers | wc -l)
TOTAL_PODS=$(kubectl get pods -n $TEST_NAMESPACE --no-headers | wc -l)

echo "Pods running: $RUNNING_PODS/$TOTAL_PODS"

# Step 5: Verify PVCs are bound
echo "Step 5: Checking PVC status..."
UNBOUND_PVCS=$(kubectl get pvc -n $TEST_NAMESPACE --field-selector=status.phase!=Bound --no-headers 2>/dev/null | wc -l)

if [ "$UNBOUND_PVCS" -gt 0 ]; then
  echo "WARNING: $UNBOUND_PVCS PVCs are not bound"
  kubectl get pvc -n $TEST_NAMESPACE
fi

# Step 6: Test application connectivity
echo "Step 6: Testing application connectivity..."
kubectl run test-connectivity -n $TEST_NAMESPACE \
  --image=curlimages/curl \
  --rm -it --restart=Never -- \
  curl -s -o /dev/null -w "%{http_code}" http://myapp.$TEST_NAMESPACE.svc.cluster.local/health || true

# Step 7: Generate verification report
echo "Step 7: Generating verification report..."
cat <<EOF > /tmp/verification-report-$RESTORE_NAME.txt
Backup Verification Report
==========================
Backup Name: $BACKUP_NAME
Restore Name: $RESTORE_NAME
Test Namespace: $TEST_NAMESPACE
Verification Date: $(date)

Backup Status: $BACKUP_STATUS
Backup Errors: $BACKUP_ERRORS

Restore Status: $RESTORE_STATUS
Restore Errors: $RESTORE_ERRORS

Pods Status: $RUNNING_PODS/$TOTAL_PODS running
PVCs Unbound: $UNBOUND_PVCS

Result: PASSED
EOF

cat /tmp/verification-report-$RESTORE_NAME.txt

# Step 8: Cleanup test resources
echo "Step 8: Cleaning up test resources..."
kubectl delete namespace $TEST_NAMESPACE --wait=false
velero restore delete $RESTORE_NAME --confirm

echo "=========================================="
echo "Backup verification completed successfully"
echo "=========================================="

exit 0
```

This comprehensive script validates multiple aspects of backup and restore functionality.

## Creating a Kubernetes CronJob for Automated Testing

Schedule regular backup verification:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup-verification
  namespace: velero
spec:
  # Run daily at 3 AM
  schedule: "0 3 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
            app: backup-verification
        spec:
          serviceAccountName: velero
          containers:
          - name: verify
            image: velero/velero:v1.12.0
            command:
            - /bin/bash
            - /scripts/backup-verification.sh
            args:
            # Verify the latest daily backup
            - "daily-backup-latest"
            volumeMounts:
            - name: verification-script
              mountPath: /scripts
            env:
            - name: KUBECONFIG
              value: /var/run/secrets/kubernetes.io/serviceaccount/kubeconfig
          volumes:
          - name: verification-script
            configMap:
              name: backup-verification-script
              defaultMode: 0755
          restartPolicy: OnFailure
```

Store the verification script in a ConfigMap:

```bash
kubectl create configmap backup-verification-script \
  --from-file=backup-verification.sh \
  -n velero
```

## Implementing Application-Specific Validation

Extend verification to test application functionality:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: app-validation-job
  namespace: velero
spec:
  template:
    spec:
      serviceAccountName: velero
      containers:
      - name: validate
        image: postgres:15
        command:
        - /bin/bash
        - -c
        - |
          #!/bin/bash
          set -e

          TEST_NAMESPACE=$1

          echo "Validating PostgreSQL database..."

          # Wait for PostgreSQL to be ready
          until kubectl exec -n $TEST_NAMESPACE deployment/postgres -- pg_isready; do
            echo "Waiting for PostgreSQL..."
            sleep 5
          done

          # Test database query
          ROW_COUNT=$(kubectl exec -n $TEST_NAMESPACE deployment/postgres -- \
            psql -U postgres -d myapp -t -c "SELECT COUNT(*) FROM users;")

          echo "Database contains $ROW_COUNT users"

          if [ "$ROW_COUNT" -lt 1 ]; then
            echo "ERROR: Database appears to be empty"
            exit 1
          fi

          # Test application API
          echo "Testing application API..."
          RESPONSE=$(kubectl run test-api -n $TEST_NAMESPACE \
            --image=curlimages/curl --rm -it --restart=Never -- \
            curl -s http://api.$TEST_NAMESPACE.svc.cluster.local/healthz)

          if [[ "$RESPONSE" != *"healthy"* ]]; then
            echo "ERROR: API health check failed"
            exit 1
          fi

          echo "Application validation successful"
          exit 0
        args:
        - "backup-test-12345"
      restartPolicy: Never
```

This Job performs application-specific validation after restore.

## Monitoring Verification Job Status

Track verification job success and failures:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: backup-verification-alerts
  namespace: velero
spec:
  groups:
  - name: backup-verification
    interval: 60s
    rules:
    - alert: BackupVerificationFailed
      expr: |
        kube_job_status_failed{job_name=~"backup-verification.*"} > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Backup verification job failed"
        description: "The backup verification job {{ $labels.job_name }} has failed"

    - alert: BackupVerificationMissing
      expr: |
        time() - kube_job_status_completion_time{job_name=~"backup-verification.*"} > 172800
      labels:
        severity: warning
      annotations:
        summary: "Backup verification hasn't run recently"
        description: "No successful backup verification in the last 48 hours"

    - alert: BackupVerificationDurationHigh
      expr: |
        kube_job_status_completion_time - kube_job_status_start_time > 3600
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Backup verification taking too long"
        description: "Verification job took over 1 hour to complete"
```

## Creating Verification Reports

Generate detailed reports from verification runs:

```bash
#!/bin/bash
# generate-verification-report.sh

REPORT_DIR="/reports"
REPORT_FILE="$REPORT_DIR/verification-$(date +%Y%m%d-%H%M%S).html"

mkdir -p $REPORT_DIR

# Get recent verification jobs
JOBS=$(kubectl get jobs -n velero -l app=backup-verification --sort-by=.metadata.creationTimestamp -o json)

cat <<EOF > $REPORT_FILE
<!DOCTYPE html>
<html>
<head>
  <title>Backup Verification Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    .success { color: green; }
    .failed { color: red; }
  </style>
</head>
<body>
  <h1>Backup Verification Report</h1>
  <p>Generated: $(date)</p>

  <h2>Recent Verification Jobs</h2>
  <table>
    <tr>
      <th>Job Name</th>
      <th>Status</th>
      <th>Start Time</th>
      <th>Duration</th>
    </tr>
EOF

echo "$JOBS" | jq -r '.items[] | "\(.metadata.name)|\(.status.conditions[0].type)|\(.status.startTime)|\(.status.completionTime)"' | while IFS='|' read name status start end; do
  if [ "$status" = "Complete" ]; then
    status_class="success"
  else
    status_class="failed"
  fi

  duration="N/A"
  if [ ! -z "$end" ] && [ ! -z "$start" ]; then
    start_ts=$(date -d "$start" +%s)
    end_ts=$(date -d "$end" +%s)
    duration=$((end_ts - start_ts))
    duration="${duration}s"
  fi

  cat <<EOF >> $REPORT_FILE
    <tr>
      <td>$name</td>
      <td class="$status_class">$status</td>
      <td>$start</td>
      <td>$duration</td>
    </tr>
EOF
done

cat <<EOF >> $REPORT_FILE
  </table>

  <h2>Summary</h2>
  <p>Total Verifications: $(echo "$JOBS" | jq '.items | length')</p>
  <p>Successful: $(echo "$JOBS" | jq '[.items[] | select(.status.conditions[0].type == "Complete")] | length')</p>
  <p>Failed: $(echo "$JOBS" | jq '[.items[] | select(.status.conditions[0].type == "Failed")] | length')</p>
</body>
</html>
EOF

echo "Report generated: $REPORT_FILE"

# Send report via email or upload to S3
# aws s3 cp $REPORT_FILE s3://reports-bucket/
```

## Integrating with CI/CD Pipelines

Add backup verification to deployment pipelines:

```yaml
# .github/workflows/verify-backups.yml
name: Verify Backups

on:
  schedule:
    - cron: '0 4 * * *'  # Daily at 4 AM
  workflow_dispatch:

jobs:
  verify-backup:
    runs-on: ubuntu-latest
    steps:
    - name: Configure kubectl
      uses: azure/k8s-set-context@v1
      with:
        kubeconfig: ${{ secrets.KUBECONFIG }}

    - name: Install Velero CLI
      run: |
        wget https://github.com/vmware-tanzu/velero/releases/download/v1.12.0/velero-v1.12.0-linux-amd64.tar.gz
        tar -xvf velero-v1.12.0-linux-amd64.tar.gz
        sudo mv velero-v1.12.0-linux-amd64/velero /usr/local/bin/

    - name: Run Backup Verification
      run: |
        kubectl apply -f verification-job.yaml
        kubectl wait --for=condition=complete job/backup-verification --timeout=30m

    - name: Get Verification Results
      if: always()
      run: |
        kubectl logs job/backup-verification

    - name: Notify on Failure
      if: failure()
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        text: 'Backup verification failed!'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Conclusion

Automated backup verification ensures your disaster recovery strategy remains viable through continuous testing. Implement comprehensive verification scripts that check backup completeness, restore success, and application functionality. Schedule regular verification jobs using Kubernetes CronJobs, monitor results with Prometheus alerts, and generate reports for compliance and operational visibility. By treating backup verification as a first-class operational concern, you maintain confidence that your backups will work when disaster strikes, reducing recovery time and protecting your business from data loss.
