# How to Test Rancher DR Failover

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Disaster-recovery, Testing, Kubernetes, Failover

Description: Learn how to conduct thorough disaster recovery failover tests for Rancher to validate your recovery procedures and meet RTO/RPO targets.

## Introduction

Testing your DR plan regularly is the only way to be confident it will work when a real disaster occurs. This guide provides a structured approach to testing Rancher failover, from pre-test preparation to post-test validation.

## Types of DR Tests

1. **Tabletop Exercise**: Walkthrough of procedures without actual execution
2. **Backup Restoration Test**: Verify backups can be restored to a test environment
3. **Partial Failover Test**: Fail over a portion of workloads
4. **Full Failover Test**: Complete cutover to DR environment
5. **Chaos Engineering**: Inject random failures to test resilience

## Pre-Test Checklist

```bash
#!/bin/bash
# pre-test-checklist.sh

echo "=== DR Test Pre-flight Check ==="

# 1. Verify backup availability

echo "1. Checking backup availability..."
BACKUP_COUNT=$(aws s3 ls s3://rancher-dr-backups/ --recursive | wc -l)
echo "   Available backups: $BACKUP_COUNT"

# 2. Check latest backup age
LATEST=$(aws s3 ls s3://rancher-dr-backups/ --recursive | sort | tail -1)
echo "   Latest backup: $LATEST"

# 3. Verify DR environment is ready
echo "2. Checking DR environment..."
kubectl --context dr-cluster get nodes
kubectl --context dr-cluster get pods -n cattle-system

# 4. Verify network connectivity to DR site
echo "3. Testing network connectivity..."
ping -c 3 dr-rancher.example.com

# 5. Notify stakeholders
echo "4. Send notification to stakeholders before test starts"
```

## Step 1: Create a Test Environment

Always test in a dedicated test environment, not production:

```yaml
# test-namespace.yaml - Isolate test workloads
apiVersion: v1
kind: Namespace
metadata:
  name: dr-test
  labels:
    purpose: dr-testing
    environment: test
---
# Sample workload for testing
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-app
  namespace: dr-test
spec:
  replicas: 3
  selector:
    matchLabels:
      app: test-app
  template:
    metadata:
      labels:
        app: test-app
    spec:
      containers:
      - name: test-app
        image: nginx:1.25
        ports:
        - containerPort: 80
```

## Step 2: Document Pre-Test State

```bash
#!/bin/bash
# capture-pre-test-state.sh

OUTPUT_DIR="/tmp/dr-test-$(date +%Y%m%d)"
mkdir -p "$OUTPUT_DIR"

# Capture current cluster state
echo "Capturing cluster state..."
kubectl get clusters.management.cattle.io \
  -o yaml > "$OUTPUT_DIR/clusters.yaml"

# Capture all namespaces
kubectl get namespaces > "$OUTPUT_DIR/namespaces.txt"

# Capture node count
kubectl get nodes > "$OUTPUT_DIR/nodes.txt" 2>/dev/null || true

# Capture Rancher settings
kubectl get settings.management.cattle.io \
  -o yaml > "$OUTPUT_DIR/settings.yaml"

echo "Pre-test state saved to $OUTPUT_DIR"
```

## Step 3: Execute the Failover Test

```bash
#!/bin/bash
# dr-failover-test.sh

TEST_START=$(date +%s)
echo "=== DR FAILOVER TEST STARTED: $(date) ==="

# Phase 1: Simulate failure
echo ""
echo "Phase 1: Simulating primary failure..."
# In a real test, this might stop the primary Rancher pod
# For testing without impacting production, use a separate test environment

# Phase 2: Execute restore on DR environment
echo ""
echo "Phase 2: Initiating restore on DR environment..."
BACKUP_FILE="rancher-backup-2026-03-20T02-00-00Z.tar.gz"
RESTORE_NAME="dr-test-restore-$(date +%Y%m%d%H%M%S)"

kubectl --context dr-cluster apply -f - << RESTOREEOF
apiVersion: resources.cattle.io/v1
kind: Restore
metadata:
  name: ${RESTORE_NAME}
spec:
  backupFilename: ${BACKUP_FILE}
  prune: false
  storageLocation:
    s3:
      bucketName: rancher-dr-backups
      folder: prod
      region: us-east-1
      credentialSecretName: aws-creds
      credentialSecretNamespace: default
      endpoint: s3.us-east-1.amazonaws.com
RESTOREEOF

# Phase 3: Monitor restore progress
echo ""
echo "Phase 3: Monitoring restore progress..."
RESTORE_START=$(date +%s)
while true; do
  STATUS=$(kubectl --context dr-cluster get restore "$RESTORE_NAME" \
    -o jsonpath='{.status.conditions[?(@.type=="Ready")].message}' 2>/dev/null || true)
  
  if [ "$STATUS" = "Completed" ]; then
    RESTORE_END=$(date +%s)
    RESTORE_DURATION=$((RESTORE_END - RESTORE_START))
    echo "Restore completed in ${RESTORE_DURATION} seconds"
    break
  fi
  
  echo "Restore status: $STATUS ($(( $(date +%s) - RESTORE_START ))s elapsed)"
  sleep 15
done

# Phase 4: Validate DR environment
echo ""
echo "Phase 4: Validating DR environment..."

# Check Rancher pods
kubectl --context dr-cluster get pods -n cattle-system

# Verify Rancher server health
curl -sf https://dr-rancher.example.com/ping && \
  echo "Rancher endpoint: HEALTHY" || echo "Rancher endpoint: FAILED"

TEST_END=$(date +%s)
TOTAL_DURATION=$((TEST_END - TEST_START))
echo ""
echo "=== TEST COMPLETE ==="
echo "Total duration: ${TOTAL_DURATION} seconds ($(( TOTAL_DURATION / 60 )) minutes)"
```

## Step 4: Validate Recovery

```bash
#!/bin/bash
# validate-recovery.sh

echo "=== Recovery Validation ==="

# 1. Check all expected clusters are visible
EXPECTED_CLUSTERS=("prod-us-east" "prod-us-west" "prod-eu-west")
for cluster in "${EXPECTED_CLUSTERS[@]}"; do
  STATUS=$(kubectl --context dr-cluster get clusters.management.cattle.io \
    "$cluster" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null)
  echo "Cluster $cluster: ${STATUS:-NOT_FOUND}"
done

# 2. Verify key services
echo ""
echo "Checking key services..."
kubectl --context dr-cluster get pods -n cattle-system | grep -E "rancher|fleet|webhook"

# 3. Check downstream cluster connectivity
echo ""
echo "Checking downstream cluster connections..."
kubectl --context dr-cluster get clusters.management.cattle.io

# 4. Verify logging and monitoring
kubectl --context dr-cluster get pods -n cattle-monitoring-system 2>/dev/null | head -10
```

## Step 5: Document Test Results

```bash
#!/bin/bash
# generate-test-report.sh

cat > "/tmp/dr-test-report-$(date +%Y%m%d).md" << REPORT
# DR Failover Test Report

**Date**: $(date)
**Test Type**: Full Failover
**Performed By**: $(whoami)

## Results

| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| RTO | < 4 hours | X minutes | PASS/FAIL |
| RPO | < 1 hour | X minutes | PASS/FAIL |
| Restore Success | 100% | X% | PASS/FAIL |

## Issues Found

1. (Document any issues)

## Action Items

1. (List improvements needed)

## Sign-off

- Infrastructure Lead: ___________
- QA Lead: ___________
REPORT

echo "Test report generated"
```

## Conclusion

Regular DR testing validates your recovery procedures, identifies gaps, and ensures your team can execute under pressure. Aim to test your DR plan at least quarterly, and after any significant infrastructure changes. Document all test results and continuously improve based on findings.
