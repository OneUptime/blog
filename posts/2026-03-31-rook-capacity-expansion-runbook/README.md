# How to Create a Ceph Capacity Expansion Runbook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Capacity, Runbook, Storage, Kubernetes

Description: A practical runbook for expanding Ceph storage capacity in Rook by adding new OSDs, nodes, or larger disks without disrupting running workloads.

---

## When to Expand Capacity

Trigger capacity expansion when:
- `ceph df` shows cluster usage above 70%
- PG autoscaler reports insufficient OSDs
- New workloads require additional storage headroom

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph df
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd df tree
```

## Option 1: Add New Disks to Existing Nodes

If existing nodes have available disk slots, add the new devices to the `CephCluster` spec:

```yaml
spec:
  storage:
    nodes:
    - name: "worker-node-1"
      devices:
      - name: "sdc"
      - name: "sdd"   # new disk
    - name: "worker-node-2"
      devices:
      - name: "sdc"
      - name: "sdd"   # new disk
```

Apply and watch the operator provision new OSDs:

```bash
kubectl -n rook-ceph apply -f ceph-cluster.yaml
watch "kubectl -n rook-ceph get pods | grep osd"
```

## Option 2: Add New Nodes

Label new nodes for Ceph scheduling and update the CephCluster:

```bash
kubectl label node new-worker-3 role=storage-node
```

```yaml
spec:
  placement:
    all:
      nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
          nodeSelectorTerms:
          - matchExpressions:
            - key: role
              operator: In
              values:
              - storage-node
  storage:
    useAllNodes: true
    useAllDevices: true
```

## Option 3: Use StorageDeviceSets for Cloud Providers

For cloud environments with dynamic volume provisioning:

```yaml
spec:
  storage:
    storageClassDeviceSets:
    - name: set1
      count: 6   # increase from 3 to 6
      portable: true
      volumeClaimTemplates:
      - metadata:
          name: data
        spec:
          resources:
            requests:
              storage: 2Ti
          storageClassName: gp3
          volumeMode: Block
          accessModes:
          - ReadWriteOnce
```

## Step: Verify New OSDs Are Active

After applying changes:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd stat
```

Check that data is rebalancing across the new OSDs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
# Look for "misplaced" or "backfilling" in the pgmap
```

## Step: Reweight OSDs if Needed

If the new larger disks are not being used proportionally:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd reweight-by-utilization
```

## Summary

Ceph capacity expansion in Rook is non-disruptive and can be done by adding disks to existing nodes, adding new storage nodes, or increasing StorageDeviceSet counts for cloud clusters. Always verify new OSDs join the CRUSH map and that rebalancing completes successfully.
