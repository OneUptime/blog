# Using calicoctl ipam release with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Kubernetes, IP Address Management

Description: Learn how to safely release leaked and orphaned IP addresses using calicoctl ipam release to reclaim IP capacity in your Calico cluster.

---

## Introduction

The `calicoctl ipam release` command is an essential IPAM management tool in Calico. Understanding how to use it effectively helps you maintain healthy IP address allocation, troubleshoot address-related issues, and optimize IP utilization across your Kubernetes cluster.

Proper IP address management becomes increasingly important as clusters grow. Without visibility into how IPs are allocated and used, you risk pool exhaustion, address conflicts, and difficulty troubleshooting connectivity issues.

This guide provides practical examples of using `calicoctl ipam release` for common operational scenarios.

## Prerequisites

- Kubernetes cluster with Calico IPAM
- `calicoctl` v3.25+ installed and configured
- Admin-level access to the Calico datastore
- Understanding of IP addressing and CIDR notation

## Basic Usage

### Releasing a Specific IP

```bash
# Release a single leaked IP address

calicoctl ipam release --ip=10.244.0.5
```

### Releasing Leaked IPs from a Check Report

```bash
# Generate a report, then release leaked addresses from it
calicoctl ipam check -o report.json
calicoctl ipam release --from-report=report.json
```

## Safe Release Workflow

Always verify before releasing:

```bash
#!/bin/bash
# safe-release.sh
# Usage: ./safe-release.sh <ip-address>

IP="$1"
if [ -z "$IP" ]; then
  echo "Usage: $0 <ip-address>"
  exit 1
fi

echo "Checking IP: $IP"

# Check if any pod is using this IP
POD=$(kubectl get pods --all-namespaces -o wide | grep "$IP" | head -1)

if [ -n "$POD" ]; then
  echo "WARNING: IP $IP is in use by a pod:"
  echo "  $POD"
  echo "Do NOT release this IP."
  exit 1
fi

# Check IPAM allocation
echo "IPAM record:"
calicoctl ipam show --ip="$IP"

echo ""
read -p "Release IP $IP? (yes/no): " CONFIRM
if [ "$CONFIRM" = "yes" ]; then
  calicoctl ipam release --ip="$IP"
  echo "IP released."
else
  echo "Aborted."
fi
```

## Batch Release of Leaked IPs

```bash
#!/bin/bash
# batch-release-leaked.sh
# Releases leaked IPs identified by ipam check

echo "Running IPAM check to find leaked IPs..."
REPORT="${1:-ipam-report.json}"

calicoctl datastore migrate lock
trap 'calicoctl datastore migrate unlock' EXIT

calicoctl ipam check -o "$REPORT" --show-problem-ips

echo ""
read -p "Release leaked IPs from $REPORT? (yes/no): " CONFIRM
if [ "$CONFIRM" = "yes" ]; then
  calicoctl ipam release --from-report="$REPORT"
else
  echo "Aborted."
  exit 0
fi

echo ""
echo "Batch release complete. Running check again..."
calicoctl ipam check
```

## Releasing IPs from Removed Nodes

```bash
#!/bin/bash
# release-orphaned-nodes.sh
# Checks IPAM against Kubernetes after node removal and releases leaked IPs

REPORT="${1:-removed-node-ipam-report.json}"

calicoctl datastore migrate lock
trap 'calicoctl datastore migrate unlock' EXIT

calicoctl ipam check -o "$REPORT" --show-problem-ips

echo ""
read -p "Release leaked IPs from $REPORT? (yes/no): " CONFIRM
if [ "$CONFIRM" = "yes" ]; then
  calicoctl ipam release --from-report="$REPORT"
else
  echo "Aborted."
fi
```


## Verification

After running `calicoctl ipam release`, verify the results:

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

`calicoctl ipam release` is a vital tool for maintaining visibility into and control over your cluster's IP address allocation. Regular use as part of your operational workflows ensures healthy IPAM state and prevents IP-related issues from impacting your workloads.
