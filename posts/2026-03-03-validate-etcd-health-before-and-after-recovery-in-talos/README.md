# How to Validate etcd Health Before and After Recovery in Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, etcd, Health Validation, Kubernetes, Cluster Recovery, Monitoring

Description: Learn how to thoroughly validate etcd cluster health before and after recovery operations in Talos Linux to ensure data integrity.

---

Validating etcd health is critical at two points: before you start a recovery operation and after you complete one. Before recovery, validation tells you whether recovery is actually needed and provides a baseline. After recovery, it confirms that the restored cluster is functional and consistent. Skipping validation at either point is asking for trouble.

## Why Validation Matters

etcd is the source of truth for your entire Kubernetes cluster. If etcd is subtly unhealthy after recovery - say, one member is lagging or data is inconsistent - you might not notice until it causes pod scheduling failures, missing resources, or sudden quorum loss. Thorough validation catches these issues early.

## Pre-Recovery Validation

Before starting any recovery operation, document the current state of etcd.

### Basic Health Check

```bash
# Check etcd cluster status
talosctl etcd status --nodes <cp-node-1>

# Expected output includes:
# - Member ID
# - Endpoint
# - DB Size
# - Leader status
# - Raft term and index
```

### Member List

```bash
# List all etcd members
talosctl etcd members --nodes <cp-node-1>

# Expected for a 3-node cluster:
# 3 members listed with their IDs and peer URLs
# All members should have valid endpoints
```

### Check Each Member Individually

```bash
# Query etcd status from each control plane node
for node in 10.0.0.1 10.0.0.2 10.0.0.3; do
    echo "=== ${node} ==="
    talosctl etcd status --nodes ${node} 2>&1
    echo "---"
done

# Compare the outputs:
# - DB sizes should be similar across members
# - All should agree on the leader
# - Raft terms should be the same
```

### Checking etcd Logs

```bash
# Look for recent errors in etcd logs
talosctl logs etcd --nodes <cp-node-1> | tail -100 | grep -i "error\|warn\|fail"

# Look for leader election activity
talosctl logs etcd --nodes <cp-node-1> | tail -100 | grep -i "leader\|election"

# Look for slow operations
talosctl logs etcd --nodes <cp-node-1> | tail -100 | grep -i "slow\|took too long"
```

### Document the Pre-Recovery State

Save the pre-recovery state for comparison:

```bash
#!/bin/bash
# pre-recovery-validation.sh

OUTPUT_DIR="./etcd-validation-$(date +%Y%m%d-%H%M%S)"
mkdir -p ${OUTPUT_DIR}

CP_NODES=("10.0.0.1" "10.0.0.2" "10.0.0.3")

# Capture etcd status from each node
for node in "${CP_NODES[@]}"; do
    talosctl etcd status --nodes ${node} > ${OUTPUT_DIR}/status-${node}.txt 2>&1
    talosctl etcd members --nodes ${node} > ${OUTPUT_DIR}/members-${node}.txt 2>&1
    talosctl logs etcd --nodes ${node} 2>&1 | tail -200 > ${OUTPUT_DIR}/logs-${node}.txt
done

# Capture Kubernetes state counts
kubectl get nodes > ${OUTPUT_DIR}/k8s-nodes.txt
kubectl get namespaces > ${OUTPUT_DIR}/k8s-namespaces.txt
kubectl get deployments --all-namespaces > ${OUTPUT_DIR}/k8s-deployments.txt
kubectl get pods --all-namespaces > ${OUTPUT_DIR}/k8s-pods.txt

echo "Pre-recovery validation saved to ${OUTPUT_DIR}"
```

## Post-Recovery Validation

After recovery, run a comprehensive set of checks to confirm everything is working.

### Step 1: etcd Cluster Health

```bash
# Check cluster status
talosctl etcd status --nodes <cp-node-1>

# Verify all members are present
talosctl etcd members --nodes <cp-node-1>

# Check from each node's perspective
for node in 10.0.0.1 10.0.0.2 10.0.0.3; do
    echo "=== ${node} ==="
    talosctl etcd status --nodes ${node}
done
```

What to look for:

- All expected members are listed
- One and only one leader is elected
- DB sizes are consistent across members (they may differ slightly right after recovery)
- No error messages in the status output

### Step 2: Data Consistency

```bash
# Verify that the restored data matches expectations

# Count key resources
kubectl get namespaces --no-headers | wc -l
kubectl get deployments --all-namespaces --no-headers | wc -l
kubectl get services --all-namespaces --no-headers | wc -l
kubectl get secrets --all-namespaces --no-headers | wc -l

# Compare these counts with the pre-recovery snapshot
# or with your expected state
```

### Step 3: etcd Performance

```bash
# Check etcd logs for performance issues
talosctl logs etcd --nodes <cp-node-1> | grep -i "slow\|took too long"

# If running Prometheus, check etcd metrics:
# - etcd_disk_wal_fsync_duration_seconds (should be < 10ms at p99)
# - etcd_disk_backend_commit_duration_seconds (should be < 25ms at p99)
# - etcd_server_proposals_failed_total (should not be increasing)
```

### Step 4: Write Operations

Verify that etcd can accept writes:

```bash
# Create and delete a test namespace
kubectl create namespace etcd-health-test
kubectl get namespace etcd-health-test
kubectl delete namespace etcd-health-test

# If this succeeds, etcd write operations are working
```

### Step 5: Leader Stability

```bash
# Watch for leader changes over a few minutes
# There should not be frequent leader elections after recovery

talosctl logs etcd --nodes <cp-node-1> --follow | grep -i "leader" &
WATCH_PID=$!
sleep 120
kill $WATCH_PID

# A stable cluster should show very few (ideally zero)
# leader changes during this period
```

### Step 6: Cross-Member Replication

```bash
# Create a resource and verify it is visible from all members

# Create via one API server
kubectl create configmap etcd-replication-test \
  --from-literal=test=value -n default

# Verify from each control plane node's API server
for node in 10.0.0.1 10.0.0.2 10.0.0.3; do
    kubectl get configmap etcd-replication-test -n default \
      --server=https://${node}:6443 2>&1
done

# Clean up
kubectl delete configmap etcd-replication-test -n default
```

## Comprehensive Post-Recovery Validation Script

```bash
#!/bin/bash
# post-recovery-validation.sh

set -e

CP_NODES=("10.0.0.1" "10.0.0.2" "10.0.0.3")
FIRST_CP="${CP_NODES[0]}"
ERRORS=0

echo "=== etcd Post-Recovery Validation ==="
echo "Started at: $(date)"
echo ""

# Check 1: All members present
echo "Check 1: etcd members"
MEMBER_COUNT=$(talosctl etcd members --nodes ${FIRST_CP} 2>/dev/null | grep -c "10\.")
if [ "${MEMBER_COUNT}" -eq 3 ]; then
    echo "  PASS: ${MEMBER_COUNT} members found"
else
    echo "  FAIL: Expected 3 members, found ${MEMBER_COUNT}"
    ((ERRORS++))
fi

# Check 2: Leader elected
echo "Check 2: Leader election"
LEADER=$(talosctl etcd status --nodes ${FIRST_CP} 2>/dev/null | grep -c "true")
if [ "${LEADER}" -ge 1 ]; then
    echo "  PASS: Leader is elected"
else
    echo "  FAIL: No leader elected"
    ((ERRORS++))
fi

# Check 3: etcd service running on all nodes
echo "Check 3: etcd service status"
for node in "${CP_NODES[@]}"; do
    STATUS=$(talosctl services --nodes ${node} 2>/dev/null | grep etcd | awk '{print $2}')
    if [ "${STATUS}" = "Running" ]; then
        echo "  PASS: etcd running on ${node}"
    else
        echo "  FAIL: etcd not running on ${node} (status: ${STATUS})"
        ((ERRORS++))
    fi
done

# Check 4: Kubernetes API accessible
echo "Check 4: Kubernetes API"
if kubectl cluster-info 2>/dev/null | grep -q "running"; then
    echo "  PASS: Kubernetes API is accessible"
else
    echo "  FAIL: Kubernetes API is not accessible"
    ((ERRORS++))
fi

# Check 5: Write operations work
echo "Check 5: Write operations"
if kubectl create namespace validation-test 2>/dev/null; then
    kubectl delete namespace validation-test 2>/dev/null
    echo "  PASS: Write operations working"
else
    echo "  FAIL: Write operations failed"
    ((ERRORS++))
fi

# Check 6: No error logs
echo "Check 6: etcd error logs"
ERROR_COUNT=$(talosctl logs etcd --nodes ${FIRST_CP} 2>/dev/null | tail -50 | grep -ci "error" || true)
if [ "${ERROR_COUNT}" -lt 5 ]; then
    echo "  PASS: ${ERROR_COUNT} errors in recent logs (acceptable)"
else
    echo "  WARN: ${ERROR_COUNT} errors in recent logs (review recommended)"
fi

# Summary
echo ""
echo "=== Validation Summary ==="
if [ ${ERRORS} -eq 0 ]; then
    echo "All checks PASSED"
else
    echo "${ERRORS} check(s) FAILED - review the output above"
fi
echo "Completed at: $(date)"
```

## Ongoing Monitoring After Recovery

Do not stop watching after the initial validation passes. Monitor the cluster closely for the next 24-48 hours:

```bash
# Set up a simple monitoring loop
while true; do
    echo "$(date): etcd status check"
    talosctl etcd status --nodes <cp-node-1> 2>&1 | head -5
    kubectl get nodes --no-headers 2>&1
    echo "---"
    sleep 300  # Check every 5 minutes
done
```

Watch for:

- Gradual increase in etcd database size (normal)
- Sudden leader elections (not normal)
- Growing number of errors in etcd logs
- Pods failing to schedule or disappearing

## Summary

Validating etcd health before and after recovery in Talos Linux involves checking member status, verifying data consistency, testing write operations, confirming leader stability, and monitoring for errors. Before recovery, document the current state to have a comparison point. After recovery, run comprehensive checks and continue monitoring for at least 24-48 hours. Automate these validation checks with scripts that can be run quickly during stressful recovery situations, when manual checks are most likely to be skipped or done incompletely.
