# How to Build Disaster Recovery Testing Procedures Using Velero Restore Validation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Velero, Kubernetes, Disaster Recovery, Testing, Validation

Description: Master disaster recovery testing with Velero for Kubernetes. Learn how to design test procedures, automate validation, and ensure recovery capabilities meet business requirements.

---

Disaster recovery plans are only as good as their testing. Regular DR testing validates that your backups actually work, recovery procedures are current, and your team can execute restoration under pressure. Velero provides the tools to implement comprehensive DR testing programs that verify backup integrity, measure recovery time objectives, and ensure business continuity without disrupting production systems. Systematic testing transforms disaster recovery from theoretical documentation into practiced operational capability.

## Understanding DR Testing Requirements

Effective DR testing validates multiple dimensions of recovery capability including backup completeness, restoration success, application functionality, data integrity, and performance targets. Testing should occur regularly in isolated environments that mirror production, with clear success criteria and documented procedures. The goal is not just confirming that restore works, but ensuring the entire recovery process meets business requirements for recovery time objective (RTO) and recovery point objective (RPO).

## Creating a DR Testing Framework

Design a structured testing framework:

```bash
#!/bin/bash
# dr-test-framework.sh

set -e

# Configuration
TEST_NAMESPACE="dr-test-$(date +%s)"
BACKUP_NAME=$1
TEST_DURATION=3600  # 1 hour
VALIDATION_TIMEOUT=600  # 10 minutes

if [ -z "$BACKUP_NAME" ]; then
  echo "Usage: $0 <backup-name>"
  exit 1
fi

echo "=========================================="
echo "Disaster Recovery Test Framework"
echo "Backup: $BACKUP_NAME"
echo "Test Namespace: $TEST_NAMESPACE"
echo "Start Time: $(date)"
echo "=========================================="

# Phase 1: Pre-Test Validation
echo "Phase 1: Pre-Test Validation"
echo "Verifying backup exists..."

if ! velero backup get $BACKUP_NAME &>/dev/null; then
  echo "ERROR: Backup $BACKUP_NAME not found"
  exit 1
fi

BACKUP_STATUS=$(velero backup get $BACKUP_NAME -o json | jq -r '.status.phase')
if [ "$BACKUP_STATUS" != "Completed" ]; then
  echo "ERROR: Backup status is $BACKUP_STATUS, expected Completed"
  exit 1
fi

echo "Backup verified successfully"

# Phase 2: Restore Execution
echo ""
echo "Phase 2: Restore Execution"
RESTORE_START=$(date +%s)

echo "Starting restore to namespace: $TEST_NAMESPACE"
velero restore create dr-test-restore-$(date +%s) \
  --from-backup $BACKUP_NAME \
  --namespace-mappings production:$TEST_NAMESPACE \
  --wait

RESTORE_END=$(date +%s)
RESTORE_DURATION=$((RESTORE_END - RESTORE_START))

echo "Restore completed in $RESTORE_DURATION seconds"

# Phase 3: Resource Validation
echo ""
echo "Phase 3: Resource Validation"

echo "Waiting for pods to be ready..."
kubectl wait --for=condition=ready pod \
  -n $TEST_NAMESPACE \
  --all \
  --timeout=${VALIDATION_TIMEOUT}s || true

TOTAL_PODS=$(kubectl get pods -n $TEST_NAMESPACE --no-headers | wc -l)
RUNNING_PODS=$(kubectl get pods -n $TEST_NAMESPACE --field-selector=status.phase=Running --no-headers | wc -l)

echo "Pods Status: $RUNNING_PODS/$TOTAL_PODS running"

if [ $RUNNING_PODS -lt $TOTAL_PODS ]; then
  echo "WARNING: Not all pods are running"
  kubectl get pods -n $TEST_NAMESPACE
fi

# Phase 4: Service Validation
echo ""
echo "Phase 4: Service Validation"

SERVICES=$(kubectl get services -n $TEST_NAMESPACE --no-headers | wc -l)
echo "Services restored: $SERVICES"

# Phase 5: Data Integrity Validation
echo ""
echo "Phase 5: Data Integrity Validation"

# Test database connectivity
if kubectl get deployment postgres -n $TEST_NAMESPACE &>/dev/null; then
  echo "Testing PostgreSQL connectivity..."
  if kubectl exec -n $TEST_NAMESPACE deployment/postgres -- \
    psql -U postgres -c "SELECT 1;" &>/dev/null; then
    echo "PostgreSQL is accessible"

    # Check record counts
    RECORD_COUNT=$(kubectl exec -n $TEST_NAMESPACE deployment/postgres -- \
      psql -U postgres -d mydb -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')

    echo "Database contains $RECORD_COUNT user records"
  else
    echo "WARNING: PostgreSQL is not accessible"
  fi
fi

# Phase 6: Application Functionality Testing
echo ""
echo "Phase 6: Application Functionality Testing"

# Test application endpoints
if kubectl get service frontend -n $TEST_NAMESPACE &>/dev/null; then
  echo "Testing frontend service..."

  kubectl run test-frontend -n $TEST_NAMESPACE \
    --image=curlimages/curl --rm -it --restart=Never -- \
    curl -s -o /dev/null -w "%{http_code}" \
    http://frontend.$TEST_NAMESPACE.svc.cluster.local || true
fi

# Phase 7: Performance Testing
echo ""
echo "Phase 7: Performance Testing"

echo "Measuring response times..."
# Add performance tests here

# Phase 8: Generate Test Report
echo ""
echo "Phase 8: Generating Test Report"

cat <<EOF > /tmp/dr-test-report-$(date +%Y%m%d-%H%M%S).txt
========================================
Disaster Recovery Test Report
========================================

Test Date: $(date)
Backup Name: $BACKUP_NAME
Test Namespace: $TEST_NAMESPACE

Restore Metrics:
- Duration: $RESTORE_DURATION seconds
- RTO Target: 1800 seconds (30 minutes)
- RTO Status: $([ $RESTORE_DURATION -lt 1800 ] && echo "PASS" || echo "FAIL")

Resource Validation:
- Total Pods: $TOTAL_PODS
- Running Pods: $RUNNING_PODS
- Services: $SERVICES

Data Integrity:
- Database Records: $RECORD_COUNT

Test Result: $([ $RUNNING_PODS -eq $TOTAL_PODS ] && echo "PASSED" || echo "FAILED")

========================================
EOF

cat /tmp/dr-test-report-$(date +%Y%m%d-%H%M%S).txt

# Phase 9: Cleanup
echo ""
echo "Phase 9: Cleanup"

echo "Deleting test namespace: $TEST_NAMESPACE"
kubectl delete namespace $TEST_NAMESPACE --wait=false

echo ""
echo "=========================================="
echo "DR Test Complete"
echo "Duration: $(($(date +%s) - RESTORE_START)) seconds"
echo "=========================================="

exit 0
```

Make the script executable:

```bash
chmod +x dr-test-framework.sh
```

## Automating Monthly DR Tests

Create a CronJob for regular testing:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: monthly-dr-test
  namespace: velero
spec:
  # Run on first day of each month at 2 AM
  schedule: "0 2 1 * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: velero
          containers:
          - name: dr-test
            image: bitnami/kubectl:latest
            command:
            - /bin/bash
            - /scripts/dr-test-framework.sh
            args:
            - "production-backup-latest"
            volumeMounts:
            - name: test-scripts
              mountPath: /scripts
            env:
            - name: KUBECONFIG
              value: /var/run/secrets/kubernetes.io/serviceaccount/kubeconfig
          volumes:
          - name: test-scripts
            configMap:
              name: dr-test-scripts
              defaultMode: 0755
          restartPolicy: OnFailure
```

## Creating Comprehensive Validation Tests

Implement detailed validation checks:

```bash
#!/bin/bash
# comprehensive-validation.sh

TEST_NAMESPACE=$1

echo "Running comprehensive validation for namespace: $TEST_NAMESPACE"

# Test 1: Pod Health
echo "Test 1: Validating pod health..."
UNHEALTHY_PODS=$(kubectl get pods -n $TEST_NAMESPACE \
  --field-selector=status.phase!=Running,status.phase!=Succeeded \
  --no-headers | wc -l)

if [ $UNHEALTHY_PODS -eq 0 ]; then
  echo "✓ All pods are healthy"
else
  echo "✗ Found $UNHEALTHY_PODS unhealthy pods"
  kubectl get pods -n $TEST_NAMESPACE --field-selector=status.phase!=Running,status.phase!=Succeeded
fi

# Test 2: PVC Status
echo "Test 2: Validating PVC status..."
UNBOUND_PVCS=$(kubectl get pvc -n $TEST_NAMESPACE \
  --field-selector=status.phase!=Bound \
  --no-headers 2>/dev/null | wc -l)

if [ $UNBOUND_PVCS -eq 0 ]; then
  echo "✓ All PVCs are bound"
else
  echo "✗ Found $UNBOUND_PVCS unbound PVCs"
fi

# Test 3: Service Endpoints
echo "Test 3: Validating service endpoints..."
SERVICES_WITHOUT_ENDPOINTS=$(kubectl get endpoints -n $TEST_NAMESPACE -o json | \
  jq -r '.items[] | select(.subsets == null or .subsets == []) | .metadata.name' | wc -l)

if [ $SERVICES_WITHOUT_ENDPOINTS -eq 0 ]; then
  echo "✓ All services have endpoints"
else
  echo "✗ Found $SERVICES_WITHOUT_ENDPOINTS services without endpoints"
fi

# Test 4: Database Connectivity
echo "Test 4: Testing database connectivity..."
for db in postgres mysql mongodb; do
  if kubectl get deployment $db -n $TEST_NAMESPACE &>/dev/null; then
    case $db in
      postgres)
        if kubectl exec -n $TEST_NAMESPACE deployment/$db -- \
          psql -U postgres -c "SELECT 1;" &>/dev/null; then
          echo "✓ PostgreSQL is accessible"
        else
          echo "✗ PostgreSQL is not accessible"
        fi
        ;;
      mysql)
        if kubectl exec -n $TEST_NAMESPACE deployment/$db -- \
          mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SELECT 1;" &>/dev/null; then
          echo "✓ MySQL is accessible"
        else
          echo "✗ MySQL is not accessible"
        fi
        ;;
      mongodb)
        if kubectl exec -n $TEST_NAMESPACE deployment/$db -- \
          mongosh --eval "db.adminCommand('ping')" &>/dev/null; then
          echo "✓ MongoDB is accessible"
        else
          echo "✗ MongoDB is not accessible"
        fi
        ;;
    esac
  fi
done

# Test 5: Application API Health
echo "Test 5: Testing application APIs..."
if kubectl get service api -n $TEST_NAMESPACE &>/dev/null; then
  RESPONSE=$(kubectl run test-api -n $TEST_NAMESPACE \
    --image=curlimages/curl --rm -it --restart=Never -- \
    curl -s -o /dev/null -w "%{http_code}" \
    http://api.$TEST_NAMESPACE.svc.cluster.local/health 2>/dev/null || echo "000")

  if [ "$RESPONSE" = "200" ]; then
    echo "✓ API health check passed"
  else
    echo "✗ API health check failed (HTTP $RESPONSE)"
  fi
fi

# Test 6: ConfigMaps and Secrets
echo "Test 6: Validating ConfigMaps and Secrets..."
CONFIGMAPS=$(kubectl get configmaps -n $TEST_NAMESPACE --no-headers | wc -l)
SECRETS=$(kubectl get secrets -n $TEST_NAMESPACE --no-headers | wc -l)

echo "✓ ConfigMaps: $CONFIGMAPS, Secrets: $SECRETS"

# Test 7: Ingress Validation
echo "Test 7: Validating Ingress resources..."
if kubectl get ingress -n $TEST_NAMESPACE &>/dev/null 2>&1; then
  INGRESS_COUNT=$(kubectl get ingress -n $TEST_NAMESPACE --no-headers | wc -l)
  echo "✓ Ingress resources: $INGRESS_COUNT"
fi

echo ""
echo "Validation complete"
```

## Measuring Recovery Time Objectives

Track RTO metrics during testing:

```bash
#!/bin/bash
# measure-rto.sh

BACKUP_NAME=$1
START_TIME=$(date +%s)

echo "Starting RTO measurement for backup: $BACKUP_NAME"
echo "Start time: $(date)"

# Record restore start
RESTORE_START=$(date +%s)

# Execute restore
velero restore create rto-test-$(date +%s) \
  --from-backup $BACKUP_NAME \
  --namespace-mappings production:rto-test \
  --wait

RESTORE_END=$(date +%s)
RESTORE_DURATION=$((RESTORE_END - RESTORE_START))

echo "Restore phase completed in $RESTORE_DURATION seconds"

# Wait for applications to be ready
APP_START=$(date +%s)

kubectl wait --for=condition=ready pod \
  -n rto-test \
  --all \
  --timeout=600s

APP_END=$(date +%s)
APP_STARTUP_DURATION=$((APP_END - APP_START))

echo "Application startup completed in $APP_STARTUP_DURATION seconds"

# Calculate total RTO
TOTAL_RTO=$((APP_END - START_TIME))

echo ""
echo "=========================================="
echo "RTO Measurement Results"
echo "=========================================="
echo "Restore Duration: $RESTORE_DURATION seconds"
echo "App Startup Duration: $APP_STARTUP_DURATION seconds"
echo "Total RTO: $TOTAL_RTO seconds"
echo ""
echo "RTO Target: 1800 seconds (30 minutes)"
echo "Status: $([ $TOTAL_RTO -lt 1800 ] && echo "✓ PASSED" || echo "✗ FAILED")"
echo "=========================================="

# Cleanup
kubectl delete namespace rto-test --wait=false
```

## Creating DR Test Documentation

Generate comprehensive test reports:

```bash
#!/bin/bash
# generate-dr-report.sh

BACKUP_NAME=$1
TEST_NAMESPACE=$2
RESTORE_DURATION=$3
TOTAL_PODS=$4
RUNNING_PODS=$5

REPORT_DIR="/reports/dr-tests"
REPORT_FILE="$REPORT_DIR/dr-test-$(date +%Y%m%d-%H%M%S).html"

mkdir -p $REPORT_DIR

cat <<EOF > $REPORT_FILE
<!DOCTYPE html>
<html>
<head>
  <title>Disaster Recovery Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    .pass { color: green; font-weight: bold; }
    .fail { color: red; font-weight: bold; }
    .metric { font-size: 24px; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Disaster Recovery Test Report</h1>
  <p><strong>Test Date:</strong> $(date)</p>
  <p><strong>Backup:</strong> $BACKUP_NAME</p>
  <p><strong>Test Namespace:</strong> $TEST_NAMESPACE</p>

  <h2>Recovery Metrics</h2>
  <table>
    <tr>
      <th>Metric</th>
      <th>Value</th>
      <th>Target</th>
      <th>Status</th>
    </tr>
    <tr>
      <td>Restore Duration</td>
      <td class="metric">$RESTORE_DURATION seconds</td>
      <td>1800 seconds</td>
      <td class="$([ $RESTORE_DURATION -lt 1800 ] && echo "pass" || echo "fail")">
        $([ $RESTORE_DURATION -lt 1800 ] && echo "PASS" || echo "FAIL")
      </td>
    </tr>
    <tr>
      <td>Pod Health</td>
      <td class="metric">$RUNNING_PODS/$TOTAL_PODS running</td>
      <td>100%</td>
      <td class="$([ $RUNNING_PODS -eq $TOTAL_PODS ] && echo "pass" || echo "fail")">
        $([ $RUNNING_PODS -eq $TOTAL_PODS ] && echo "PASS" || echo "FAIL")
      </td>
    </tr>
  </table>

  <h2>Test Procedures</h2>
  <ol>
    <li>Backup validation</li>
    <li>Restore execution</li>
    <li>Resource validation</li>
    <li>Service validation</li>
    <li>Data integrity checks</li>
    <li>Application functionality tests</li>
    <li>Performance validation</li>
  </ol>

  <h2>Recommendations</h2>
  <ul>
    $([ $RESTORE_DURATION -gt 1800 ] && echo "<li>Optimize restore duration to meet RTO target</li>")
    $([ $RUNNING_PODS -lt $TOTAL_PODS ] && echo "<li>Investigate pod failures</li>")
    <li>Schedule next test in 30 days</li>
  </ul>
</body>
</html>
EOF

echo "Report generated: $REPORT_FILE"
```

## Implementing Continuous DR Testing

Create a pipeline for automated testing:

```yaml
# .github/workflows/dr-test.yml
name: Monthly DR Test

on:
  schedule:
    - cron: '0 2 1 * *'
  workflow_dispatch:

jobs:
  dr-test:
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

    - name: Run DR Test
      run: |
        chmod +x ./scripts/dr-test-framework.sh
        ./scripts/dr-test-framework.sh production-backup-latest

    - name: Upload Test Report
      if: always()
      uses: actions/upload-artifact@v2
      with:
        name: dr-test-report
        path: /tmp/dr-test-report-*.txt

    - name: Notify Team
      if: failure()
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        text: 'DR test failed! Please review.'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Conclusion

Regular disaster recovery testing with Velero validates that your backup strategy actually works when needed. Implement automated testing frameworks that verify backup integrity, measure recovery time objectives, and validate application functionality after restoration. Create comprehensive validation procedures that check pod health, service endpoints, database connectivity, and data integrity. Document test results, track RTO metrics over time, and continuously improve recovery procedures based on test findings. Systematic DR testing transforms disaster recovery from aspirational documentation into proven operational capability, ensuring your organization can confidently recover from any failure scenario.
