# How to Recover Rook-Ceph After Total Node Failure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Node, Failure, Recovery

Description: Complete guide to recovering Rook-Ceph when all storage nodes fail simultaneously, covering data preservation and cluster reconstruction steps.

---

Total node failure - where all storage nodes go offline at once - is the worst-case scenario for a Rook-Ceph cluster. This can occur during a data center power outage, a network partition that isolates the storage tier, or a severe Kubernetes control plane failure. Recovery depends on whether the nodes can be brought back online or must be replaced.

## Scenario A: Nodes Return After Outage

If nodes went offline due to a power cut or network issue and come back online intact, Rook typically handles recovery automatically.

Verify node status after they come back:

```bash
kubectl get nodes -o wide
```

Check for any NotReady nodes:

```bash
kubectl get nodes | grep NotReady
```

Once nodes are Ready, Rook will restart OSD and monitor pods:

```bash
kubectl -n rook-ceph get pods -w
```

Ceph will begin recovering any data that was in-flight during the outage. Monitor recovery progress:

```bash
watch -n 10 "kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph status"
```

```text
cluster:
  health: HEALTH_WARN
           Degraded data redundancy: 143/429 objects degraded (33.333%)

progress:
  Degraded objects (3m)
    [===========.....................] 38%
```

Do not restart or interfere with Ceph during active recovery. Allow it to complete.

## Scenario B: Nodes Are Lost and Must Be Replaced

If nodes cannot be recovered (hardware failure, permanent data loss), you must replace them. The approach depends on how many nodes were lost.

Check OSD health to understand data availability:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg stat
```

If all PGs are still `active+clean` (because the lost nodes hosted no unique data replicas), adding new nodes is straightforward. If PGs are `undersized` or `incomplete`, data may be at risk.

## Replacing Lost Nodes

Add replacement nodes to the Kubernetes cluster. Ensure they meet Rook requirements (no pre-existing Ceph data, correct kernel version, clean disks):

```bash
# Label new nodes appropriately
kubectl label node new-node-1 role=storage
kubectl label node new-node-2 role=storage
kubectl label node new-node-3 role=storage
```

Update the CephCluster CR to include the new nodes or use `useAllNodes: true` if appropriate:

```yaml
spec:
  storage:
    useAllNodes: false
    nodes:
    - name: new-node-1
    - name: new-node-2
    - name: new-node-3
```

Apply the updated CR:

```bash
kubectl apply -f cephcluster.yaml
```

The Rook operator will create OSD pods on the new nodes, and Ceph will begin backfilling data from surviving replicas.

## Recovering When Quorum is Lost

If the total node failure took down all monitors, restore quorum before addressing OSD issues. If at least one node is recoverable, boot it first and check if a monitor is still accessible:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-mon
```

If no monitor pod is running, check if monitor data exists on recovered nodes:

```bash
ls /var/lib/rook/
```

With existing mon data, annotate the CephCluster to restore quorum from the recovered node:

```bash
kubectl -n rook-ceph annotate cephcluster rook-ceph \
  ceph.rook.io/restore-mon-quorum="a"
```

## Handling Incomplete PGs

If PGs are in `incomplete` state after replacement nodes are added, it means some data shards are permanently lost. Identify affected PGs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump | grep incomplete
```

For `incomplete` PGs with replication factor 3, data loss occurs only if all 3 replicas were on the failed nodes. Force PG recovery (accepting potential data loss):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg force-recovery <pg-id>
```

## Post-Recovery Validation

After cluster recovery, validate data integrity:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd stat
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- rados df
```

Test application connectivity by writing and reading test data:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rados -p replicapool put testobj /etc/hostname
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rados -p replicapool get testobj /tmp/testobj
```

## Summary

Recovering Rook-Ceph from total node failure involves two scenarios: nodes returning after an outage (usually automatic recovery) and nodes permanently lost (requiring replacement hardware, node re-addition, and quorum restoration). Data integrity depends on the replication factor and whether the failed nodes held unique replicas. Monitor Ceph PG recovery progress after adding replacement nodes and validate application connectivity before declaring recovery complete.
