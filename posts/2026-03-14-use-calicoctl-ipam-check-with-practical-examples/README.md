# Using calicoctl ipam check with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Health Check, Kubernetes, IP Management

Description: Use calicoctl ipam check to audit IP address allocation health, detect leaked IPs, identify orphaned blocks, and ensure IPAM consistency across your cluster.

---

## Introduction

Over time, Calico's IPAM state can develop inconsistencies: IP addresses that are allocated but no longer used by any pod (leaked IPs), blocks that are assigned to nodes that no longer exist (orphaned blocks), or allocation records that do not match actual pod state. The `calicoctl ipam check` command audits the IPAM datastore to identify these issues.

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

```yaml
Checking IPAM state...
  Block 10.244.0.0/26 (node: worker-1) - OK
  Block 10.244.0.64/26 (node: worker-1) - OK
  Block 10.244.1.0/26 (node: worker-2) - OK
  Block 10.244.1.64/26 (node: worker-3) - 2 leaked addresses found
  
Summary:
  Blocks checked: 4
  Blocks OK: 3
  Blocks with issues: 1
  Leaked IPs: 2
```

## Identifying Leaked IP Addresses

```bash
# Run a detailed check
calicoctl ipam check --show-all-ips

# Cross-reference allocated IPs with running pods
calicoctl ipam check 2>&1 | grep "leaked"
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

## Detecting Orphaned Blocks

Orphaned blocks are assigned to nodes that no longer exist:

```bash
# Check for blocks assigned to non-existent nodes
calicoctl ipam check 2>&1 | grep "orphan"

# List all block affinities
calicoctl ipam show --show-blocks

# Compare with actual nodes
calicoctl get nodes -o name
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
CHECK_OUTPUT=$(calicoctl ipam check 2>&1)
echo "$CHECK_OUTPUT"

# Parse results
LEAKED=$(echo "$CHECK_OUTPUT" | grep -c "leaked" || echo 0)
ORPHANED=$(echo "$CHECK_OUTPUT" | grep -c "orphan" || echo 0)

echo ""
echo "=== Summary ==="
echo "Leaked IPs: $LEAKED"
echo "Orphaned blocks: $ORPHANED"

# Show IP utilization
echo ""
echo "=== IP Utilization ==="
calicoctl ipam show

if [ "$LEAKED" -gt 0 ] || [ "$ORPHANED" -gt 0 ]; then
  echo ""
  echo "ACTION REQUIRED: IPAM issues detected."
  echo "Run 'calicoctl ipam release' to clean up leaked IPs."
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
              calicoctl ipam check
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

- **Check reports many leaked IPs**: This commonly occurs after ungraceful pod terminations or node failures. Use `calicoctl ipam release` to clean up.
- **Orphaned blocks from deleted nodes**: Remove block affinities for non-existent nodes. Consider using `calicoctl ipam release --node=<old-node>`.
- **Check takes too long**: In large clusters with many blocks, the check can be slow. Run during low-traffic periods.
- **False positives for pods in terminating state**: Pods that are shutting down may appear as leaked IPs. Wait for termination to complete and recheck.

## Conclusion

Regular `calicoctl ipam check` audits are essential for maintaining healthy IP address utilization. By identifying leaked IPs and orphaned blocks early, you prevent IP pool exhaustion and keep your IPAM state clean. Automate these checks with CronJobs to catch issues before they impact pod scheduling.
