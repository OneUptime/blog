# How to Configure CRUSH Root for OSDs in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, OSD, CRUSH, Storage

Description: Set a custom CRUSH root for OSDs in Rook-Ceph to isolate storage pools, separate workload tiers, and control exactly where data replicas are placed across your cluster.

---

## What is a CRUSH Root

Ceph's CRUSH algorithm places data replicas by traversing a hierarchy tree. At the top of each subtree is a root bucket. By default all OSDs land under the `default` root.

Assigning OSDs to a different root lets you:
- Create isolated storage tiers (SSD pool vs HDD pool)
- Prevent a pool from using specific nodes
- Separate workloads that must not share physical hardware

## Setting crushRoot in Rook

Add `crushRoot` to the OSD device or node `config` block:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    useAllNodes: false
    nodes:
      - name: "ssd-node-1"
        devices:
          - name: "nvme0n1"
        config:
          crushRoot: "ssd-root"
          deviceClass: "ssd"
      - name: "hdd-node-1"
        devices:
          - name: "sdb"
        config:
          crushRoot: "hdd-root"
          deviceClass: "hdd"
```

Rook passes the root name via `--crush-location` when starting the OSD daemon. Ceph creates the root bucket if it does not already exist.

## Creating Pools Tied to a CRUSH Root

After OSDs are placed, create a pool that targets your custom root using a CRUSH rule:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash
```

```bash
ceph osd crush rule create-replicated ssd-rule ssd-root host ssd
ceph osd pool create ssd-pool 32 replicated ssd-rule
```

The rule `ssd-rule` traverses the `ssd-root` hierarchy and distributes replicas across hosts within that root. Pools on `hdd-root` remain entirely separate.

## Viewing the CRUSH Hierarchy

Verify your roots and OSD placement:

```bash
ceph osd crush tree
```

Expected output structure:

```text
ID   CLASS  WEIGHT   TYPE NAME
-10         5.00000  root ssd-root
 -9         5.00000      host ssd-node-1
  3  ssd    5.00000          osd.3
-11         20.00000 root hdd-root
 -8         20.00000     host hdd-node-1
  4  hdd    20.00000         osd.4
```

## Using crushRoot with the Default Root

If you leave some nodes at the default root and reassign others, the default pool rules continue to work on the default nodes. New roots are additive - they do not remove OSDs from the default tree unless you explicitly move them:

```bash
ceph osd crush set-device-class ssd osd.3
ceph osd crush set osd.3 5.0 host=ssd-node-1 root=ssd-root
```

## Verifying Pool Placement

After pool creation, confirm data is landing on the intended OSDs:

```bash
ceph osd pool get ssd-pool crush_rule
ceph osd crush rule dump ssd-rule
```

Check that `step take ssd-root` appears in the rule dump, confirming the pool draws only from that root.

## Summary

Setting `crushRoot` in Rook lets you carve out isolated hardware tiers in a single Ceph cluster. Combined with `deviceClass`, it gives you precise control over data placement, enabling tiered storage pools where fast SSDs serve latency-sensitive workloads and HDDs handle bulk data cost-effectively.
