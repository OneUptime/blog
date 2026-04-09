# How to Add New OSDs to a Ceph Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, OSD, Storage, Capacity Expansion

Description: Step-by-step guide to adding new OSDs to an existing Ceph cluster using cephadm or Rook, including verification and rebalancing monitoring.

---

## Overview

Adding OSDs to a Ceph cluster expands storage capacity and redistributes data across more drives, improving both capacity and performance. Ceph handles rebalancing automatically via CRUSH, but you need to ensure new drives are provisioned correctly and that rebalancing does not overwhelm the cluster.

## Methods for Adding OSDs

There are two common methods depending on your deployment:
1. **cephadm** - for bare-metal or VM-based Ceph deployments
2. **Rook** - for Kubernetes-based Ceph deployments

## Method 1 - Adding OSDs with cephadm

### Step 1 - Verify the New Drive

SSH into the target host and confirm the new drive is visible and not in use:

```bash
lsblk
# Look for the new drive, e.g., /dev/sdd

# Ensure it has no existing filesystems or partitions
wipefs -a /dev/sdd
```

### Step 2 - Check Available Devices

Use cephadm to list available devices on a host:

```bash
ceph orch device ls <hostname>
```

Output shows each device with its availability status.

### Step 3 - Add the OSD

```bash
# Add OSD on a specific device
ceph orch daemon add osd <hostname>:/dev/sdd

# Or let cephadm add all available devices across the cluster
ceph orch apply osd --all-available-devices
```

### Step 4 - Apply OSD Spec (Recommended)

Create an OSD spec file for reproducible configuration:

```yaml
# osd-spec.yaml
service_type: osd
service_id: default
placement:
  host_pattern: 'node*'
spec:
  data_devices:
    all: true
```

```bash
ceph orch apply -i osd-spec.yaml
```

## Method 2 - Adding OSDs with Rook

### Step 1 - Add New Node or Drive

In Rook, OSDs are managed by the `CephCluster` custom resource. Add the new storage to the cluster spec:

```yaml
# cephcluster.yaml snippet
spec:
  storage:
    useAllNodes: true
    useAllDevices: true
    # Or specify nodes explicitly:
    nodes:
    - name: "node1"
      devices:
      - name: "sdd"
    - name: "node4"  # new node
      devices:
      - name: "sda"
      - name: "sdb"
```

```bash
kubectl apply -f cephcluster.yaml
```

Rook will detect the changes and provision new OSD pods automatically.

### Step 2 - Monitor OSD Pod Creation

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-osd -w
```

## Verifying the New OSDs

After adding OSDs, verify they appear in the cluster:

```bash
# Check OSD tree
ceph osd tree

# List all OSDs and their weights
ceph osd df

# Confirm the new OSD is up and in
ceph osd stat
```

Expected output shows the new OSD with `up` and `in` status.

## Monitoring Rebalancing

Ceph automatically begins rebalancing data across the new OSDs using CRUSH. Monitor progress:

```bash
# Watch the overall cluster status
watch -n 5 ceph -s

# Watch PG rebalancing
watch -n 5 ceph pg stat

# View data movement rate
ceph osd perf
```

## Controlling Rebalancing Speed

By default, rebalancing uses all available bandwidth. You can throttle it to reduce impact on production workloads:

```bash
# Limit recovery operations (default is 3)
ceph config set osd osd_recovery_max_active 1

# Limit backfill operations
ceph config set osd osd_max_backfills 1

# Restore defaults after rebalancing is complete
ceph config set osd osd_recovery_max_active 3
ceph config set osd osd_max_backfills 1
```

## Adjusting OSD CRUSH Weight

If the new drives have different capacity than existing ones, CRUSH weight is set automatically. You can verify and adjust manually:

```bash
# Check weights
ceph osd df

# Set custom weight (in TiB)
ceph osd crush reweight osd.5 1.5
```

## Summary

Adding new OSDs to Ceph expands cluster capacity and triggers automatic data rebalancing via CRUSH. Using cephadm, new OSDs can be added with `ceph orch daemon add osd` or by applying an OSD service spec. With Rook on Kubernetes, updating the `CephCluster` spec triggers automatic OSD provisioning. Always monitor rebalancing progress with `ceph -s` and consider throttling recovery operations to minimize impact on existing workloads.
