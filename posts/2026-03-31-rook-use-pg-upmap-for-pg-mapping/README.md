# How to Use pg-upmap for PG Mapping in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Placement Group, CRUSH, Balancing

Description: Learn how to use Ceph's pg-upmap mechanism to manually override CRUSH placement decisions and achieve fine-grained data distribution control.

---

## What is pg-upmap

The `pg-upmap` feature allows you to override the CRUSH algorithm's PG placement decisions on a per-PG basis. This is useful when you want to:

- Rebalance data more precisely than the default balancer provides
- Move specific PGs off an OSD before maintenance
- Fix uneven distribution without changing the CRUSH map

pg-upmap requires all clients to be running Luminous or later. In Kubernetes environments with Rook, all CSI clients meet this requirement.

## Enabling pg-upmap

Enable the `balancer` module which uses pg-upmap internally:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mgr module enable balancer

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph balancer mode upmap
```

## Checking Current PG Mapping

View the current effective mapping for a PG (includes any upmap overrides):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg map 1.0
```

View existing upmap overrides:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd dump | grep upmap
```

## Manually Adding a pg-upmap Entry

Override the mapping for a specific PG to move it from one OSD to another:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pg-upmap-items 1.0 2 7
```

This tells Ceph that PG 1.0 should use OSD 7 instead of OSD 2. Ceph will migrate data accordingly.

## Using the Automatic Balancer

Instead of manually specifying upmap entries, let the balancer compute optimal entries:

```bash
# Check what the balancer would do
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph balancer eval

# Preview the optimization plan
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph balancer optimize myplan

# Apply the plan
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph balancer execute myplan
```

## Removing pg-upmap Overrides

Remove a specific upmap override:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd rm-pg-upmap-items 1.0
```

Remove all upmap overrides from the cluster:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd dump | grep '^pg_upmap_items ' | awk '{print $2}' | \
  xargs -I {} kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
    ceph osd rm-pg-upmap-items {}
```

## Monitoring Upmap Effects

After applying upmap entries, watch recovery progress:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph -w | grep -E "backfill|recovery|misplaced"
```

Check OSD utilization after rebalancing:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd df
```

## Summary

pg-upmap allows fine-grained control over PG placement beyond what the CRUSH algorithm computes. Use the balancer module with `upmap` mode for automatic optimization, or add manual upmap entries for specific migration needs. Always monitor recovery progress after applying upmap changes and verify improved balance with `ceph osd df`.
