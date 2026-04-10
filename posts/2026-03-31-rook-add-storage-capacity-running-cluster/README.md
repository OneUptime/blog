# How to Add Storage Capacity to a Running Ceph Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Expansion, Storage, OSD, Online, Scaling

Description: Add storage capacity to a running Rook-Ceph cluster by adding new OSD disks or nodes online without downtime, including pre-checks, configuration changes, and monitoring rebalancing.

---

## Overview

Ceph supports online capacity expansion by adding new OSDs while the cluster continues serving data. When you add OSDs, Ceph automatically rebalances placement groups to distribute data across all OSDs. This guide covers adding both individual disks to existing nodes and entirely new nodes.

## Pre-Expansion Checks

Before adding capacity:

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash

# Verify cluster is healthy before expansion
ceph health
ceph status

# Confirm no degraded PGs
ceph pg stat | grep -E "degraded|peering|stale|incomplete"

# Check current OSD utilization
ceph osd df tree | tail -5
```

Do not add OSDs to a degraded cluster - fix health issues first.

## Option 1 - Add Disks to Existing Nodes

### Step 1 - Prepare the New Disk

Ensure the disk is unformatted and unpartitioned:

```bash
# On the target node, verify the disk
ssh osd-node-1 "lsblk -f /dev/sdd"
# Should show no filesystem or partition table
```

### Step 2 - Update Rook CephCluster Spec

```yaml
spec:
  storage:
    nodes:
      - name: osd-node-1
        devices:
          - name: sda  # existing
          - name: sdb  # existing
          - name: sdd  # NEW - add this
```

```bash
kubectl apply -f cephcluster.yaml
```

### Step 3 - Watch OSD Pod Creation

```bash
kubectl -n rook-ceph get pods -w | grep osd-prepare
kubectl -n rook-ceph get pods -w | grep osd
```

## Option 2 - Add New Nodes to the Cluster

### Step 1 - Prepare the New Node

Install Kubernetes prerequisites on the new node and add it to the cluster:

```bash
# Add node to Kubernetes cluster
kubeadm token create --print-join-command
# Run the join command on the new node

# Verify node joined
kubectl get nodes
```

### Step 2 - Label the Node for Rook

```bash
kubectl label node new-osd-node topology.kubernetes.io/zone=us-east-1a
kubectl label node new-osd-node storage-node=true
```

### Step 3 - Update CephCluster to Include New Node

```yaml
spec:
  storage:
    useAllNodes: false
    nodes:
      - name: osd-node-1
        # existing devices
      - name: osd-node-2
        # existing devices
      - name: new-osd-node  # NEW
        devices:
          - name: sda
          - name: sdb
          - name: sdc
```

```bash
kubectl apply -f cephcluster.yaml
```

## Step 4 - Monitor OSD Provisioning

```bash
kubectl -n rook-ceph get pods | grep -E "osd-prepare|osd-[0-9]"

# Watch logs for new OSD prepare job
kubectl -n rook-ceph logs -f job/rook-ceph-osd-prepare-new-osd-node
```

## Step 5 - Verify New OSDs Are Up

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph osd tree
```

New OSDs should appear with status `up in`.

## Step 6 - Monitor Rebalancing

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash

# Watch rebalancing progress
watch -n10 "ceph status | grep -A3 'io:'"

# Check PG distribution across OSDs
ceph osd df
```

Rebalancing can take hours to days depending on cluster size.

## Step 7 - Throttle Rebalancing to Reduce Impact

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash

# Limit recovery speed to reduce client I/O impact
ceph config set osd osd_recovery_max_active_hdd 2
ceph config set osd osd_recovery_op_priority 3
ceph config set osd osd_max_backfills 1

# Restore after rebalancing completes
ceph config rm osd osd_recovery_max_active_hdd
ceph config rm osd osd_recovery_op_priority
ceph config rm osd osd_max_backfills
```

## Step 8 - Verify Expansion Complete

```bash
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- bash

# Confirm all OSDs in and healthy
ceph osd stat

# Verify utilization is now more balanced
ceph osd df tree

# Confirm health is OK
ceph health
```

## Summary

Adding capacity to a running Ceph cluster is an online operation that requires no downtime. Rook handles OSD provisioning automatically when you update the CephCluster spec with new nodes or devices. The most time-consuming part is the subsequent PG rebalancing, which can be throttled to minimize client I/O impact. Always verify cluster health before expansion and monitor rebalancing progress to completion.
