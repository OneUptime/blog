# How to Set OSD Initial Weight in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, CRUSH, Rebalancing

Description: Learn how to set and manage OSD initial CRUSH weight in Ceph to control data distribution and minimize rebalancing when adding new OSDs.

---

## Understanding OSD Weight in Ceph

Every OSD in a Ceph cluster has a CRUSH weight that determines how much data it stores relative to other OSDs. By default, CRUSH assigns weight proportional to the OSD's raw disk capacity in terabytes: a 2 TB drive gets weight 2.0 and a 4 TB drive gets weight 4.0. When a new OSD is added, CRUSH immediately begins moving data to fill it according to its weight, which can cause a rebalancing storm if the full weight is applied at once.

## Checking Current OSD Weights

View the CRUSH map weights for all OSDs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd tree
```

The `WEIGHT` column shows the CRUSH weight. The `REWEIGHT` column shows the reweight (a multiplier applied on top of CRUSH weight).

## Starting New OSDs with Zero Weight

To add an OSD without immediately triggering rebalancing, set the `osd_crush_initial_weight` Ceph config option before adding the new OSD. In a Rook cluster, run this from the toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_crush_initial_weight 0
```

Any OSD created after this setting is applied joins the cluster with a CRUSH weight of 0 and receives no data until you manually increase its weight. Once you are done adding OSDs, reset the option so future OSDs get their normal weight:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config rm osd osd_crush_initial_weight
```

## Gradually Increasing OSD Weight

Incrementally increase the weight to spread rebalancing over time:

```bash
# Set weight to 25% of target
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd reweight osd.9 0.25

# Wait for cluster to stabilize, then increase
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd reweight osd.9 0.5

# Continue incrementally
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd reweight osd.9 0.75

# Final weight
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd reweight osd.9 1.0
```

## Setting CRUSH Weight Directly

CRUSH weight is different from reweight. To change the underlying CRUSH weight:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd crush reweight osd.9 2.0
```

This sets the absolute CRUSH weight to 2.0 (suitable for a 2 TB drive).

## Monitoring Rebalancing Progress

After each weight change, wait for the cluster to stabilize before increasing further:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  watch -n 10 "ceph status | grep -E 'misplaced|backfill|recovery'"
```

When `misplaced` objects reach 0, rebalancing is complete and you can proceed to the next increment.

## Summary

Setting OSD initial weight to zero prevents rebalancing storms when adding new nodes. Gradually increasing weight via `ceph osd reweight` spreads the data movement over time, keeping client I/O latency predictable. For permanent weight changes, use `ceph osd crush reweight` to update the CRUSH map directly. Always monitor misplaced object counts between increments.
