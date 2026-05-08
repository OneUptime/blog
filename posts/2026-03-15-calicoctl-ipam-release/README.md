# How to Use calicoctl ipam release with Practical Examples

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Kubernetes, Networking, IP Address Management, Troubleshooting

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

```text
Successfully released IP address 10.244.1.15
```

If the IP is not assigned:

```text
IP address 10.244.1.15 is not assigned
```

## Identifying Orphaned IPs Before Release

Always verify an IP is truly orphaned before releasing it. Releasing an IP that is still in use by a running pod will cause connectivity issues.

```bash
# Check if any pod is using the IP

kubectl get pods -A -o wide --no-headers | awk '$7 == "10.244.1.15"'

# Check IPAM allocation details
calicoctl ipam show --ip=10.244.1.15

# Run consistency check to find orphaned IPs
calicoctl ipam check
```

## Releasing Multiple Orphaned IPs

After running `calicoctl ipam check`, you can release leaked IPs from a generated report:

```bash
#!/bin/bash
REPORT="ipam-report.json"

# Lock the datastore so the report and release operate on a stable view.
calicoctl datastore migrate lock
trap 'calicoctl datastore migrate unlock' EXIT

calicoctl ipam check -o "$REPORT"
calicoctl ipam check --show-problem-ips

read -p "Release leaked IPs and handles from $REPORT? (y/n) " CONFIRM
if [ "$CONFIRM" != "y" ]; then
  echo "Aborted."
  exit 0
fi

calicoctl ipam release --from-report="$REPORT"
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

# Generate a report and release leaked IPs and handles.
calicoctl datastore migrate lock
trap 'calicoctl datastore migrate unlock' EXIT

calicoctl ipam check --show-problem-ips -o ipam-report.json
calicoctl ipam release --from-report=ipam-report.json
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
POD=$(kubectl get pods -A -o wide --no-headers 2>/dev/null | awk -v ip="$IP" '$7 == ip' | head -1)
if [ -n "$POD" ]; then
  echo "WARNING: IP $IP is in use by a pod:"
  echo "  $POD"
  echo "DO NOT release this IP."
  exit 1
fi

# Check IPAM allocation
echo "IPAM status:"
calicoctl ipam show --ip="$IP"

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
calicoctl ipam show --ip=10.244.1.15

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

```text
Check complete; found 0 problems.
```

## Troubleshooting

- **Release fails with error**: Check datastore access, client/server version compatibility, and whether a report-based release is using a fresh report from the same locked datastore.
- **Released IP gets re-allocated immediately**: This is normal if new pods are being scheduled. The IP is simply being reused.
- **Pod loses connectivity after release**: You released an IP that was still in use. The affected pod needs to be restarted to get a new IP allocation.
- **IP not found in IPAM**: The IP may belong to a different IP pool or may not be managed by Calico IPAM. Verify the IP range against your configured IP pools.

## Conclusion

The `calicoctl ipam release` command is an important tool for maintaining IP address hygiene in a Calico cluster. Always verify that an IP is genuinely orphaned before releasing it, and combine this command with `calicoctl ipam check` for a systematic approach to IPAM cleanup. Regular audits and automated cleanup scripts help prevent IP exhaustion caused by leaked allocations.
