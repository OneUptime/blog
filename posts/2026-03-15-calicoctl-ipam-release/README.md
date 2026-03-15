# How to Use calicoctl ipam release with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, IPAM, Kubernetes, Networking, IP Address Management, Troubleshooting

Description: Learn how to use calicoctl ipam release to manually free leaked or orphaned IP address allocations in Calico.

---

## Introduction

In a Kubernetes cluster running Calico, IP addresses are normally allocated and released automatically as pods are created and destroyed. However, certain failure scenarios such as abrupt node shutdowns, interrupted pod deletions, or datastore corruption can leave IP addresses marked as allocated even though no workload is using them.

The `calicoctl ipam release` command allows you to manually free these orphaned IP allocations. This is a critical operational tool for recovering from IP address leaks that, if left unresolved, could eventually exhaust the available address space.

This guide covers how to identify leaked IPs and safely release them using `calicoctl ipam release`.

## Prerequisites

- Kubernetes cluster with Calico IPAM
- `calicoctl` configured with datastore access
- `kubectl` access to verify workload state
- Understanding of which IPs are genuinely orphaned before releasing

## Releasing a Single IP Address

To release a specific IP address:

```bash
calicoctl ipam release --ip=10.244.1.15
```

Successful output:

```
Successfully released IP 10.244.1.15
```

If the IP is not allocated:

```
IP 10.244.1.15 is not currently allocated.
```

## Identifying Orphaned IPs Before Release

Always verify an IP is truly orphaned before releasing it. Releasing an IP that is still in use by a running pod will cause connectivity issues.

```bash
# Check if any pod is using the IP
kubectl get pods -A -o wide | grep "10.244.1.15"

# Check IPAM allocation details
calicoctl ipam show --show-blocks

# Run consistency check to find orphaned IPs
calicoctl ipam check
```

## Releasing Multiple Orphaned IPs

After running `calicoctl ipam check`, you can release all identified orphaned IPs:

```bash
#!/bin/bash
# Collect orphaned IPs from the check output
ORPHANED_IPS=$(calicoctl ipam check 2>&1 | grep "non-existent workload" | awk '{print $3}')

if [ -z "$ORPHANED_IPS" ]; then
  echo "No orphaned IPs found."
  exit 0
fi

echo "Found orphaned IPs:"
echo "$ORPHANED_IPS"
echo ""

read -p "Release all orphaned IPs? (y/n) " CONFIRM
if [ "$CONFIRM" != "y" ]; then
  echo "Aborted."
  exit 0
fi

for IP in $ORPHANED_IPS; do
  echo "Releasing $IP..."
  calicoctl ipam release --ip="$IP"
done

echo ""
echo "Released $(echo "$ORPHANED_IPS" | wc -w) IP(s)."
```

## Cleaning Up After Node Removal

When a node is removed from the cluster without proper drain, its IP blocks may still have allocations. Clean them up:

```bash
#!/bin/bash
REMOVED_NODE="worker-old"

echo "Checking for IPs allocated to removed node: $REMOVED_NODE"

# Verify the node is actually gone
if kubectl get node "$REMOVED_NODE" &>/dev/null; then
  echo "WARNING: Node $REMOVED_NODE still exists in the cluster. Aborting."
  exit 1
fi

# Find and release orphaned IPs from the removed node
calicoctl ipam check 2>&1 | grep "$REMOVED_NODE" | while read -r LINE; do
  IP=$(echo "$LINE" | awk '{print $3}')
  if [ -n "$IP" ]; then
    echo "Releasing orphaned IP: $IP"
    calicoctl ipam release --ip="$IP"
  fi
done
```

## Safe Release Workflow

A complete workflow for safely releasing IPs:

```bash
#!/bin/bash
IP=$1

if [ -z "$IP" ]; then
  echo "Usage: $0 <ip-address>"
  exit 1
fi

echo "=== Pre-release checks for $IP ==="

# Check if any pod is using this IP
POD=$(kubectl get pods -A -o wide --no-headers 2>/dev/null | grep "$IP" | head -1)
if [ -n "$POD" ]; then
  echo "WARNING: IP $IP is in use by a pod:"
  echo "  $POD"
  echo "DO NOT release this IP."
  exit 1
fi

# Check IPAM allocation
echo "IPAM status:"
calicoctl ipam show --show-blocks 2>/dev/null | grep "$IP" || echo "  IP not found in block listing"

echo ""
echo "No active pod found using $IP."
read -p "Proceed with release? (y/n) " CONFIRM
if [ "$CONFIRM" = "y" ]; then
  calicoctl ipam release --ip="$IP"
else
  echo "Aborted."
fi
```

## Verifying After Release

After releasing IPs, confirm the changes:

```bash
# Verify the IP is no longer allocated
calicoctl ipam show

# Run consistency check again
calicoctl ipam check

# Verify cluster health
kubectl get pods -A | grep -v Running | grep -v Completed
```

## Verification

Run a final consistency check to confirm all orphaned allocations have been resolved:

```bash
calicoctl ipam check
```

Expected output after cleanup:

```
Found 0 inconsistencies.
IPAM data is consistent.
```

## Troubleshooting

- **Release fails with error**: The IP may be in a block that is locked. Wait and retry, or check if another IPAM operation is in progress.
- **Released IP gets re-allocated immediately**: This is normal if new pods are being scheduled. The IP is simply being reused.
- **Pod loses connectivity after release**: You released an IP that was still in use. The affected pod needs to be restarted to get a new IP allocation.
- **IP not found in IPAM**: The IP may belong to a different IP pool or may not be managed by Calico IPAM. Verify the IP range against your configured IP pools.

## Conclusion

The `calicoctl ipam release` command is an important tool for maintaining IP address hygiene in a Calico cluster. Always verify that an IP is genuinely orphaned before releasing it, and combine this command with `calicoctl ipam check` for a systematic approach to IPAM cleanup. Regular audits and automated cleanup scripts help prevent IP exhaustion caused by leaked allocations.
