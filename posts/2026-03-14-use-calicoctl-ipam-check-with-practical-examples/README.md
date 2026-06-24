# Using calicoctl ipam check with Practical Examples

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Health Check, Kubernetes, IP Management

Description: Use calicoctl ipam check to audit IP address allocation health, detect leaked IPs, identify orphaned blocks, and ensure IPAM consistency across your cluster.

---

## Introduction

Over time, Calico's IPAM state can develop inconsistencies: IP addresses that are allocated but no longer used by any pod (leaked IPs), IPAM handles that no longer match active IPs, or allocation records that do not match actual pod state. The `calicoctl ipam check` command audits the IPAM datastore to identify these issues.

Regular IPAM checks are essential for maintaining healthy IP utilization and preventing address exhaustion in clusters with frequent pod churn. Without periodic audits, leaked IPs accumulate silently until the IP pool runs out.

## Prerequisites

- Kubernetes cluster with Calico IPAM
- `calicoctl` v3.25+ installed
- Admin-level access to the Calico datastore

## Basic Usage

```bash
calicoctl ipam check
```

Example output:

```text
Checking IPAM for inconsistencies...

Loading all IPAM blocks...
Found 4 IPAM blocks.
 IPAM block 10.244.0.0/26 affinity=host:worker-1:
 IPAM block 10.244.0.64/26 affinity=host:worker-1:
 IPAM block 10.244.1.0/26 affinity=host:worker-2:
 IPAM block 10.244.1.64/26 affinity=host:worker-3:
IPAM blocks record 24 allocations.

Scanning for IPs that are allocated but not actually in use...
Found 2 IPs that are allocated in IPAM but not actually in use.
Scanning for IPs that are in use by a workload or node but not allocated in IPAM...
Found 0 in-use IPs that are not in active IP pools.
Found 0 in-use IPs that are in active IP pools but have no corresponding IPAM allocation.

Scanning for IPAM handles with no matching IPs...
Found 0 handles with no matching IPs (and 24 handles with matches).
Scanning for IPs with missing handle...
Found 0 handles mentioned in blocks with no matching handle resource.
Check complete; found 2 problems.
```

## Identifying Leaked IP Addresses

```bash
# Run a detailed check

calicoctl ipam check --show-all-ips

# Cross-reference allocated IPs with running pods
calicoctl ipam check --show-problem-ips 2>&1 | grep "leaked"
```

To investigate specific leaked IPs:

```bash
# Check if a pod is actually using the IP
LEAKED_IP="10.244.1.67"
kubectl get pods --all-namespaces -o wide | grep "$LEAKED_IP"

# If no pod uses it, the IP is genuinely leaked
# Check IPAM records
calicoctl ipam show --ip="$LEAKED_IP"
```

## Checking Block Affinities

Block affinities show which nodes Calico IPAM has assigned address blocks to:

```bash
# List block utilization
calicoctl ipam show --show-blocks

# List block affinity resources
kubectl get blockaffinities.crd.projectcalico.org -o wide

# Compare with actual nodes
kubectl get nodes -o name
```

## Automated IPAM Audit Script

```bash
#!/bin/bash
# ipam-audit.sh
# Comprehensive IPAM health audit

echo "=== IPAM Health Audit ==="
echo "Date: $(date)"
echo ""

# Run the check
CHECK_OUTPUT=$(calicoctl ipam check --show-problem-ips 2>&1)
echo "$CHECK_OUTPUT"

# Parse results
LEAKED=$(echo "$CHECK_OUTPUT" | grep -c "leaked" || echo 0)
MISSING_HANDLES=$(echo "$CHECK_OUTPUT" | grep -c "doesn't exist" || echo 0)

echo ""
echo "=== Summary ==="
echo "Leaked IPs: $LEAKED"
echo "Missing handles: $MISSING_HANDLES"

# Show IP utilization
echo ""
echo "=== IP Utilization ==="
calicoctl ipam show

if [ "$LEAKED" -gt 0 ] || [ "$MISSING_HANDLES" -gt 0 ]; then
  echo ""
  echo "ACTION REQUIRED: IPAM issues detected."
  echo "Generate a report with 'calicoctl ipam check -o report.json', then use 'calicoctl ipam release --from-report=report.json' after locking the datastore."
  exit 1
fi
```

## Scheduled IPAM Health Check

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: calico-ipam-check
  namespace: calico-system
spec:
  schedule: "0 6 * * *"  # Daily at 6 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: calicoctl
          containers:
          - name: ipam-check
            image: calico/ctl:v3.27.0
            command:
            - /bin/sh
            - -c
            - |
              echo "IPAM Health Check - $(date)"
              calicoctl ipam check --show-problem-ips
              echo ""
              calicoctl ipam show
          restartPolicy: Never
```

## Verification

Run the IPAM check and verify the output:

```bash
# Basic check
calicoctl ipam check

# Detailed check with all IPs
calicoctl ipam check --show-all-ips

# Verify overall utilization
calicoctl ipam show
```

## Troubleshooting

- **Check reports many leaked IPs**: This commonly occurs after ungraceful pod terminations or node failures. Generate a report with `calicoctl ipam check -o report.json`, lock the datastore, and use `calicoctl ipam release --from-report=report.json` to clean up.
- **Unexpected block affinities from deleted nodes**: Check `kubectl get blockaffinities.crd.projectcalico.org -o wide` against `kubectl get nodes -o name` before deleting any Calico-managed resources manually.
- **Check takes too long**: In large clusters with many blocks, the check can be slow. Run during low-traffic periods.
- **False positives for pods in terminating state**: Pods that are shutting down may appear as leaked IPs. Wait for termination to complete and recheck.

## Conclusion

Regular `calicoctl ipam check` audits are essential for maintaining healthy IP address utilization. By identifying leaked IPs and IPAM consistency problems early, you prevent IP pool exhaustion and keep your IPAM state clean. Automate these checks with CronJobs to catch issues before they impact pod scheduling.
