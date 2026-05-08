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

              SA=/var/run/secrets/kubernetes.io/serviceaccount
              cat > /tmp/calicoctl.cfg <<EOF
              apiVersion: projectcalico.org/v3
              kind: CalicoAPIConfig
              metadata:
              spec:
                datastoreType: kubernetes
                k8sAPIEndpoint: https://kubernetes.default.svc
                k8sCAFile: $SA/ca.crt
                k8sToken: $(cat $SA/token)
              EOF
              
              # Run the check
              RESULT=$(calicoctl ipam check --config=/tmp/calicoctl.cfg --show-problem-ips 2>&1)
              echo "$RESULT"
              
              # Check for issues
              ISSUES=$(echo "$RESULT" | grep -ciE "leaked|not allocated properly" || true)
              
              # Report utilization
              echo ""
              calicoctl ipam show --config=/tmp/calicoctl.cfg
              
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

# Automatically releases leaked IPs reported by calicoctl ipam check

LOG="/var/log/calico-ipam-cleanup.log"
REPORT=$(mktemp)

cleanup() {
  rm -f "$REPORT"
  calicoctl datastore migrate unlock >/dev/null 2>&1 || true
}
trap cleanup EXIT

{
  echo "=== IPAM Cleanup $(date) ==="
  
  # Lock the datastore while checking and releasing leaked addresses
  calicoctl datastore migrate lock
  
  # Generate an IPAM report and release leaked addresses from it
  calicoctl ipam check -o "$REPORT" --show-problem-ips
  calicoctl ipam release --from-report "$REPORT"
  
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
LEAKED=$(echo "$RESULT" | grep -ci "leaked" || true)
UNALLOCATED=$(echo "$RESULT" | grep -ci "not allocated properly" || true)

# Get utilization
UTIL=$(calicoctl ipam show 2>&1)
TOTAL=$(echo "$UTIL" | awk -F'|' '$2 ~ /IP Pool/ {gsub(/ /, "", $4); total += $4} END {print total+0}')
USED=$(echo "$UTIL" | awk -F'|' '$2 ~ /IP Pool/ {gsub(/^ +| +$/, "", $5); split($5, used, " "); total += used[1]} END {print total+0}')

echo "calico_ipam_leaked_ips $LEAKED"
echo "calico_ipam_unallocated_ips $UNALLOCATED"
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
- **Cleanup is too aggressive**: Only release addresses that `calicoctl ipam check` reports as leaked. Never release IPs that may still be used by active endpoints.
- **Metrics show increasing leaked IPs**: Investigate why IPs are being leaked. Common causes include application crashes, forced pod deletions, and kubelet issues.

## Conclusion

Automated IPAM health checks prevent the slow accumulation of leaked IP addresses that leads to pool exhaustion. By running regular checks, alerting on issues, and optionally automating cleanup, you maintain a healthy IPAM state that reliably provides IP addresses to all your pods.
