# Using calicoctl ipam release with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, IPAM, Kubernetes, IP Address Management

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

### Releasing All IPs from a Removed Node

```bash
# Release all IPs allocated to a node that no longer exists
calicoctl ipam release --node=old-worker-node
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
# Releases all IPs identified as leaked by ipam check

echo "Running IPAM check to find leaked IPs..."
CHECK_OUTPUT=$(calicoctl ipam check 2>&1)

# Extract leaked IPs (format depends on calicoctl version)
LEAKED_IPS=$(echo "$CHECK_OUTPUT" | grep "leaked" | grep -oP '\d+\.\d+\.\d+\.\d+')

if [ -z "$LEAKED_IPS" ]; then
  echo "No leaked IPs found."
  exit 0
fi

COUNT=$(echo "$LEAKED_IPS" | wc -l)
echo "Found $COUNT leaked IPs."
echo ""

for IP in $LEAKED_IPS; do
  # Double-check no pod uses this IP
  if kubectl get pods --all-namespaces -o wide 2>/dev/null | grep -q "$IP"; then
    echo "SKIP: $IP (still in use by a pod)"
    continue
  fi
  
  echo "Releasing: $IP"
  calicoctl ipam release --ip="$IP"
done

echo ""
echo "Batch release complete. Running check again..."
calicoctl ipam check
```

## Releasing IPs from Removed Nodes

```bash
#!/bin/bash
# release-orphaned-nodes.sh
# Releases IPs from nodes that no longer exist in the cluster

VALID_NODES=$(calicoctl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}')

# Get nodes with block affinities
AFFINITY_NODES=$(kubectl get blockaffinities.crd.projectcalico.org -o jsonpath='{range .items[*]}{.spec.node}{"\n"}{end}' | sort -u)

for NODE in $AFFINITY_NODES; do
  if ! echo "$VALID_NODES" | grep -q "^${NODE}$"; then
    echo "Orphaned node: $NODE"
    echo "  Releasing IPs..."
    calicoctl ipam release --node="$NODE"
  fi
done
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
