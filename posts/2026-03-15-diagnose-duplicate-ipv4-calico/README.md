# How to Diagnose Duplicate IPv4 Address Errors in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPv4, IPAM, Duplicate IP, Networking, Troubleshooting

Description: How to diagnose and resolve duplicate IPv4 address assignment errors in Calico's IPAM system in Kubernetes clusters.

---

## Introduction

Duplicate IPv4 address errors in Calico occur when two or more pods are assigned the same IP address. This causes unpredictable routing behavior, intermittent connectivity failures, and difficult-to-debug application errors. Traffic intended for one pod may reach a different pod, leading to authentication failures, data corruption, or silent request drops.

Calico uses its own IPAM (IP Address Management) system to allocate pod IPs from configured IP pools. Duplicate addresses can result from IPAM data store inconsistencies, node-level block affinity conflicts, race conditions during rapid pod scheduling, or stale allocations from deleted nodes that were not properly cleaned up.

This guide covers the diagnostic steps to identify duplicate IPv4 assignments, determine their root cause, and resolve the conflicts in Calico's IPAM.

## Prerequisites

- Kubernetes cluster (v1.24+) with Calico v3.25+
- `kubectl` and `calicoctl` CLI tools
- Access to the Calico datastore (Kubernetes API or etcd)
- Basic understanding of Calico IPAM and IP pools
- Permissions to inspect and modify IPAM allocations

## Identifying Duplicate IP Symptoms

Common symptoms that indicate duplicate IP addresses:

```bash
# Check for duplicate IPs across all pods
kubectl get pods --all-namespaces -o wide --no-headers | \
  awk '{print $7}' | sort | uniq -d

# If duplicates are found, identify which pods share the IP
DUPLICATE_IP="<detected-duplicate-ip>"
kubectl get pods --all-namespaces -o wide | grep "$DUPLICATE_IP"

# Check Calico workload endpoints for duplicates
calicoctl get workloadEndpoint --all-namespaces -o wide | \
  awk '{print $5}' | sort | uniq -d
```

## Examining Calico IPAM Allocations

```bash
# Check IPAM allocations for the duplicate IP
calicoctl ipam show --ip=$DUPLICATE_IP

# View the full IPAM allocation table
calicoctl ipam show

# Check IP allocations per node
calicoctl ipam show --show-blocks

# Look for blocks assigned to nodes that no longer exist
calicoctl get ipamBlock -o yaml | grep -B5 "affinity"
```

## Checking Node and Block Affinity

Calico assigns IP blocks to specific nodes. Affinity conflicts cause duplicates.

```bash
# List all IPAM blocks and their node affinities
calicoctl get ipamBlock -o custom-columns=NAME,CIDR,AFFINITY

# Compare with actual nodes
kubectl get nodes -o name

# Look for blocks assigned to non-existent nodes
calicoctl get ipamBlock -o yaml | grep "affinity:" | sort | while read line; do
  node=$(echo $line | sed 's/affinity: host://')
  if ! kubectl get node "$node" > /dev/null 2>&1; then
    echo "ORPHANED BLOCK: affinity to deleted node $node"
  fi
done
```

## Inspecting the Datastore

```bash
# Check for inconsistencies in the Kubernetes datastore
kubectl get ipamblocks.crd.projectcalico.org -o yaml | \
  grep -A2 "allocations"

# Look for stale workload endpoints
calicoctl get workloadEndpoint --all-namespaces -o yaml | \
  grep -B10 "$DUPLICATE_IP"

# Check if any handles reference deleted pods
calicoctl ipam show --show-blocks | grep -i "leaked\|orphan"
```

## Checking for Race Conditions

Rapid pod creation can trigger IPAM race conditions.

```bash
# Check recent pod creation events
kubectl get events --all-namespaces --field-selector reason=Created \
  --sort-by='.lastTimestamp' | tail -20

# Look for IPAM-related errors in calico-node logs
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node \
  --tail=100 | grep -i "duplicate\|conflict\|already allocated\|IPAM"

# Check for rapid pod scheduling
kubectl get events --all-namespaces --field-selector reason=Scheduled \
  --sort-by='.lastTimestamp' | tail -20
```

## Analyzing calico-node Logs

```bash
# Search for IP conflict messages across all calico-node pods
for pod in $(kubectl get pods -n calico-system -l k8s-app=calico-node -o name); do
  echo "=== $pod ==="
  kubectl logs -n calico-system $pod -c calico-node --tail=200 | \
    grep -i "duplicate\|conflict\|already\|error.*ipam\|reassign"
done

# Check BIRD logs for route conflicts
for pod in $(kubectl get pods -n calico-system -l k8s-app=calico-node -o name); do
  echo "=== $pod BIRD ==="
  kubectl logs -n calico-system $pod -c bird --tail=50 | \
    grep -i "conflict\|error\|unreachable"
done
```

## Resolving Duplicate Allocations

Once duplicates are identified, release the stale allocation.

```bash
# Release a specific IP from IPAM
calicoctl ipam release --ip=$DUPLICATE_IP

# If the IP is still in use by a running pod, delete the conflicting pod
# Kubernetes will reschedule it with a new IP
kubectl delete pod <conflicting-pod> -n <namespace>

# Clean up orphaned IPAM blocks from deleted nodes
calicoctl ipam release --from-report=<garbage-collection-report>
```

## Cleaning Up After Deleted Nodes

```bash
# Remove IPAM data for nodes that no longer exist
# First, identify orphaned blocks
ORPHANED_NODES=$(calicoctl get ipamBlock -o yaml | grep "affinity: host:" | \
  sed 's/.*affinity: host://' | sort -u | while read node; do
  kubectl get node "$node" > /dev/null 2>&1 || echo "$node"
done)

# Release allocations for each orphaned node
for node in $ORPHANED_NODES; do
  echo "Cleaning up IPAM for deleted node: $node"
  calicoctl ipam release --from-report=$(calicoctl ipam check | grep "$node")
done

# Run IPAM garbage collection check
calicoctl ipam check
```

## Running IPAM Garbage Collection

```bash
# Check for leaked IPs and handles
calicoctl ipam check

# The output shows:
# - Allocated IPs with no matching workload endpoint
# - Blocks with affinity to non-existent nodes
# - Handles referencing deleted workloads

# Release leaked allocations based on the check report
calicoctl ipam release --from-report=<report-file>
```

## Verification

```bash
# Verify no duplicate IPs remain
kubectl get pods --all-namespaces -o wide --no-headers | \
  awk '{print $7}' | sort | uniq -d
# Expected: no output (no duplicates)

# Verify IPAM is clean
calicoctl ipam check
# Expected: no leaked IPs or orphaned blocks

# Verify affected pods are running with unique IPs
kubectl get pods -n <namespace> -o wide

# Test connectivity to previously affected pods
kubectl exec <test-pod> -- curl -s --connect-timeout 5 http://<fixed-pod-ip>:<port>
```

## Troubleshooting

- **IPAM release fails**: The IP may be held by an active workload endpoint. Delete the conflicting pod first.
- **Duplicates recur after cleanup**: Check for a node with corrupted local IPAM cache. Restart calico-node on that node.
- **Large number of orphaned blocks**: This indicates nodes were removed without proper drain. Implement node decommissioning procedures.
- **IPAM check shows no issues but duplicates persist**: The duplicate may be at the CNI plugin level. Restart calico-node on the affected nodes.
- **Block affinity cannot be released**: The block may still have active allocations. Delete all pods using IPs from that block first.

## Conclusion

Duplicate IPv4 address errors in Calico stem from IPAM inconsistencies caused by orphaned block affinities, race conditions during rapid scheduling, or stale allocations from deleted nodes. Diagnosis involves checking for duplicate pod IPs, examining IPAM block allocations, and inspecting calico-node logs for conflict messages. Resolution requires releasing stale allocations, cleaning up orphaned blocks, and running IPAM garbage collection. Implementing proper node decommissioning procedures and periodic IPAM health checks prevents recurrence.
