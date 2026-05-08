# Using calicoctl ipam show with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Kubernetes, IP Address Management

Description: Master calicoctl ipam show to visualize IP address allocation, utilization, and block distribution across your Calico cluster.

---

## Introduction

The `calicoctl ipam show` command is an essential IPAM management tool in Calico. Understanding how to use it effectively helps you maintain healthy IP address allocation, troubleshoot address-related issues, and optimize IP utilization across your Kubernetes cluster.

Proper IP address management becomes increasingly important as clusters grow. Without visibility into how IPs are allocated and used, you risk pool exhaustion, address conflicts, and difficulty troubleshooting connectivity issues.

This guide provides practical examples of using `calicoctl ipam show` for common operational scenarios.

## Prerequisites

- Kubernetes cluster with Calico IPAM
- `calicoctl` v3.25+ installed and configured
- Admin-level access to the Calico datastore
- Understanding of IP addressing and CIDR notation

## Basic Usage

```bash
# Show overall IPAM utilization

calicoctl ipam show
```

Example output:

```text
+----------+--------------+-----------+------------+-----------+
| GROUPING |     CIDR     | IPS TOTAL | IPS IN USE | IPS FREE  |
+----------+--------------+-----------+------------+-----------+
| IP Pool  | 10.244.0.0/16|     65536 | 342 (1%)   | 65194 (99%) |
+----------+--------------+-----------+------------+-----------+
```

## Viewing Block Distribution

```bash
# Show per-block allocation details
calicoctl ipam show --show-blocks
```

This shows per-pool utilization and the IP blocks allocated from those pools:

```text
+----------+------------------+-----------+------------+-----------+
| GROUPING |       CIDR       | IPS TOTAL | IPS IN USE | IPS FREE  |
+----------+------------------+-----------+------------+-----------+
| IP Pool  | 10.244.0.0/16    |     65536 | 35 (0%)    | 65501 (100%) |
| Block    | 10.244.0.0/26    |        64 | 12 (19%)   | 52 (81%) |
| Block    | 10.244.0.64/26   |        64 | 8 (12%)    | 56 (88%) |
| Block    | 10.244.1.0/26    |        64 | 15 (23%)   | 49 (77%) |
+----------+------------------+-----------+------------+-----------+
```

## Checking Specific IP Addresses

```bash
# Check the allocation status of a specific IP
calicoctl ipam show --ip=10.244.0.5
```

## Monitoring IP Utilization Over Time

```bash
#!/bin/bash
# track-ip-utilization.sh
# Records IP utilization for trend analysis

LOG="/var/log/calico-ip-utilization.csv"
TIMESTAMP=$(date +%Y-%m-%dT%H:%M:%S)

# Parse utilization
UTIL=$(calicoctl ipam show 2>/dev/null)
read -r TOTAL USED FREE <<EOF
$(echo "$UTIL" | awk -F'|' '
/IP Pool/ {
  gsub(/^[[:space:]]+|[[:space:]]+$/, "", $4)
  gsub(/^[[:space:]]+|[[:space:]]+$/, "", $5)
  gsub(/^[[:space:]]+|[[:space:]]+$/, "", $6)
  split($5, used, " ")
  split($6, free, " ")
  total += $4
  in_use += used[1]
  available += free[1]
}
END {print total, in_use, available}
')
EOF

echo "$TIMESTAMP,$TOTAL,$USED,$FREE" >> "$LOG"
echo "Recorded: total=$TOTAL used=$USED free=$FREE"
```

## Capacity Planning

```bash
#!/bin/bash
# ipam-capacity-check.sh

THRESHOLD=80  # Alert at 80% utilization

UTIL=$(calicoctl ipam show 2>/dev/null)
read -r TOTAL USED PERCENT <<EOF
$(echo "$UTIL" | awk -F'|' '
/IP Pool/ {
  gsub(/^[[:space:]]+|[[:space:]]+$/, "", $4)
  gsub(/^[[:space:]]+|[[:space:]]+$/, "", $5)
  split($5, used, " ")
  total += $4
  in_use += used[1]
}
END {
  if (total > 0) {
    printf "%.0f %.0f %.0f\n", total, in_use, (in_use * 100 / total)
  }
}
')
EOF

if [ -n "$TOTAL" ] && [ "$TOTAL" != "0" ]; then
  echo "IP utilization: $USED/$TOTAL ($PERCENT%)"
  
  if [ "$PERCENT" -ge "$THRESHOLD" ]; then
    echo "WARNING: IP utilization above ${THRESHOLD}%!"
    echo "Consider adding a new IP pool or cleaning up leaked IPs."
  fi
fi
```


## Verification

After running `calicoctl ipam show`, verify the results:

```bash
# Check overall IPAM state
calicoctl ipam show

# Verify no issues
calicoctl ipam check

# Confirm pod connectivity
kubectl run verify-test --image=busybox --restart=Never -- sleep 30
sleep 5
kubectl get pod verify-test -o wide
kubectl delete pod verify-test --grace-period=0
```

## Troubleshooting

- **Command returns empty output**: Verify datastore connectivity with `calicoctl get nodes`.
- **Permission errors**: Ensure RBAC allows access to IPAM resources (ipamblocks, ipamhandles, blockaffinities, ippools).
- **Unexpected results**: Cross-reference with `kubectl get pods --all-namespaces -o wide` to verify actual pod state matches IPAM records.

## Conclusion

`calicoctl ipam show` is a vital tool for maintaining visibility into and control over your cluster's IP address allocation. Regular use as part of your operational workflows ensures healthy IPAM state and prevents IP-related issues from impacting your workloads.
