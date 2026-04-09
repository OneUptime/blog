# How to Fix 'health HEALTH_ERR' After Cluster Deployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Troubleshooting, Health, Kubernetes

Description: Diagnose and fix HEALTH_ERR in a newly deployed Rook-Ceph cluster by inspecting health details, OSD status, MON quorum, and PG states.

---

## What HEALTH_ERR Means

`HEALTH_ERR` is Ceph's most severe health state, indicating that the cluster cannot safely serve all data. Unlike `HEALTH_WARN`, this state typically blocks writes or indicates active data loss risk.

After a fresh Rook-Ceph deployment, `HEALTH_ERR` often appears due to misconfiguration rather than actual hardware failure.

## Step 1 - Get Detailed Health Information

Start by getting the full health report:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

Example output:

```text
HEALTH_ERR 1 monitors have not enabled msgr2; 1 pool(s) have no replicas configured; 1 osds exist in the crush map but not in the osdmap
```

Each line in `health detail` corresponds to a specific problem that must be addressed.

## Step 2 - Check MON Status

MON quorum issues are a common cause of `HEALTH_ERR`:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mon stat
```

Expected healthy output:

```text
e3: 3 mons at {a=[v2:10.0.0.1:3300/0,v1:10.0.0.1:6789/0], ...}, election epoch 6, leader a, quorum a,b,c
```

If you see fewer monitors than expected, check MON pod status:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-mon
```

Logs for a failing MON:

```bash
kubectl -n rook-ceph logs <mon-pod-name>
```

## Step 3 - Check OSD Status

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd stat
```

Look for OSDs that are `down` or `out`:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
```

If OSDs are down, check the OSD pods:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-osd
kubectl -n rook-ceph logs <osd-pod-name>
```

## Step 4 - Check PG Status

Placement group errors are often the direct cause of `HEALTH_ERR`:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg stat
```

Example error:

```text
1 pgs unknown; 1 pgs creating
```

Get details on problematic PGs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg dump_stuck
```

## Step 5 - Fix "pool has no replicas" Error

If a pool was created with 0 replicas or an invalid size, fix it:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool set <pool-name> size 3
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool set <pool-name> min_size 2
```

## Step 6 - Fix CRUSH Map Issues

A mismatch between the CRUSH map and actual OSDs can cause `HEALTH_ERR`:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd crush dump | grep -i osd
```

If an OSD is in the CRUSH map but not in the osdmap:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd crush remove osd.<id>
```

## Step 7 - Enable msgr2 if Required

If health detail shows monitors have not enabled msgr2:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph mon enable-msgr2
```

## Step 8 - Check for Insufficient OSD Count

Ceph requires at least as many OSDs as the pool replica count. With 3-replica pools, you need at least 3 OSDs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd stat
```

If you have fewer OSDs than needed, add more nodes or devices to the cluster.

## Step 9 - Force PG Creation (Edge Case)

In some scenarios, PGs get stuck in `creating` state. Check the affected pools:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg dump | grep creating
```

If the PG autoscaler is interfering with PG creation, disable automatic scaling:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool set <pool-name> pg_autoscale_mode warn
```

If PGs remain stuck, ensure the CRUSH rules can be satisfied by your OSD topology, then force a repair on the stuck PGs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg repeer <pgid>
```

## Monitoring Recovery Progress

After applying fixes, monitor cluster health continuously:

```bash
watch -n5 "kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status"
```

## Summary

`HEALTH_ERR` after Rook-Ceph deployment usually stems from MON quorum issues, OSDs being down, incorrectly configured pool replica counts, or CRUSH map mismatches. Use `ceph health detail` to get specific error codes, then address each one systematically - checking MON pods, OSD pods, pool sizes, and CRUSH configuration until the cluster reports `HEALTH_OK`.
