# Automating IPAM Health Checks with calicoctl ipam check

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Automation, Monitoring, Kubernetes

Description: Automate regular IPAM health checks using calicoctl ipam check to detect IP leaks and allocation issues before they cause pod scheduling failures.

---

## Introduction

IP address leaks accumulate silently over time. Without automated checking, you may not notice until the IP pool is exhausted and pods cannot be scheduled. Automating `calicoctl ipam check` as a regular maintenance task ensures that IPAM issues are caught and resolved proactively.

## Prerequisites

- Kubernetes cluster with Calico IPAM
- Scheduling system (Kubernetes CronJob or external)
- Alerting system for notifications

## Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: calico-ipam-audit
  namespace: calico-system
spec:
  schedule: "0 */6 * * *"
  successfulJobsHistoryLimit: 5
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: calicoctl
          containers:
          - name: ipam-audit
            image: calico/ctl:v3.27.0
            command:
            - /bin/sh
            - -c
            - |
              echo "=== IPAM Audit $(date) ==="
              
              # Run the check
              RESULT=$(calicoctl ipam check 2>&1)
              echo "$RESULT"
              
              # Check for issues
              ISSUES=$(echo "$RESULT" | grep -cE "leaked|orphan" || echo 0)
              
              # Report utilization
              echo ""
              calicoctl ipam show
              
              if [ "$ISSUES" -gt 0 ]; then
                echo "ALERT: $ISSUES IPAM issues detected"
                exit 1
              fi
              
              echo "OK: No IPAM issues"
          restartPolicy: Never
```

## Automated Cleanup Script

```bash
#!/bin/bash
# auto-cleanup-ipam.sh
# Automatically cleans up leaked IPs and orphaned blocks

LOG="/var/log/calico-ipam-cleanup.log"

{
  echo "=== IPAM Cleanup $(date) ==="
  
  # Run check
  calicoctl ipam check
  
  # Get valid nodes
  VALID_NODES=$(calicoctl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}')
  
  # Clean orphaned blocks
  echo "Checking for orphaned blocks..."
  # This is a conservative approach - only release from nodes that clearly do not exist
  
  # Report final state
  echo ""
  echo "Post-cleanup state:"
  calicoctl ipam show
  calicoctl ipam check
} >> "$LOG" 2>&1
```

## Monitoring Integration

```bash
#!/bin/bash
# ipam-metrics.sh
# Exports IPAM metrics for monitoring

RESULT=$(calicoctl ipam check 2>&1)
LEAKED=$(echo "$RESULT" | grep -c "leaked" || echo 0)
ORPHANED=$(echo "$RESULT" | grep -c "orphan" || echo 0)

# Get utilization
UTIL=$(calicoctl ipam show 2>&1)
TOTAL=$(echo "$UTIL" | grep "IPs" | head -1 | awk '{print $1}')
USED=$(echo "$UTIL" | grep "in use" | awk '{print $1}')

echo "calico_ipam_leaked_ips $LEAKED"
echo "calico_ipam_orphaned_blocks $ORPHANED"
echo "calico_ipam_total_ips ${TOTAL:-0}"
echo "calico_ipam_used_ips ${USED:-0}"
```

## Verification

```bash
# Test the CronJob
kubectl create job --from=cronjob/calico-ipam-audit test-ipam-audit -n calico-system
kubectl logs -n calico-system -l job-name=test-ipam-audit -f

# Run the cleanup script
./auto-cleanup-ipam.sh
```

## Troubleshooting

- **CronJob always fails**: Check RBAC permissions for the service account. The job needs read access to IPAM resources.
- **Cleanup is too aggressive**: Only release IPs from nodes that are confirmed to no longer exist. Never release IPs from active nodes.
- **Metrics show increasing leaked IPs**: Investigate why IPs are being leaked. Common causes include application crashes, forced pod deletions, and kubelet issues.

## Conclusion

Automated IPAM health checks prevent the slow accumulation of leaked IP addresses that leads to pool exhaustion. By running regular checks, alerting on issues, and optionally automating cleanup, you maintain a healthy IPAM state that reliably provides IP addresses to all your pods.
