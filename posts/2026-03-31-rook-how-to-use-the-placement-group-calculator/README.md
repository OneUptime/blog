# How to Use the Placement Group Calculator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Placement Group, Performance, Storage Tuning, Kubernetes

Description: Learn how to use the Ceph placement group calculator to determine optimal PG counts for your Ceph pools based on OSD count, pool count, and replication factor.

---

## Overview

Placement Groups (PGs) are the internal sharding mechanism Ceph uses to distribute data across OSDs. Too few PGs results in uneven data distribution and poor performance. Too many PGs wastes memory and CPU. The Ceph PG calculator helps you find the right PG count for your deployment.

## Understanding Placement Groups

Key concepts:
- Each PG maps to a set of OSDs determined by the CRUSH algorithm
- More PGs = better data distribution, more memory usage
- The target is approximately 100-200 PGs per OSD
- PG count is recommended to be a power of 2 (no longer required since Ceph Nautilus)

## Using the Built-in PG Auto-Scaling

Ceph has a built-in PG autoscaler that dynamically adjusts PG counts. Check its status:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool autoscale-status
```

Enable autoscaling globally (recommended for most deployments):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set global osd_pool_default_pg_autoscale_mode on
```

## Manual PG Calculation

Use the following formula to calculate initial PG count:

```text
PG count = (Target PGs per OSD * OSD count) / Replication factor
```

Round up to the nearest power of 2.

Example calculation:
- 6 OSDs
- Replication factor of 3
- Target 100 PGs per OSD

```text
PG count = (100 * 6) / 3 = 200 -> round up to 256
```

## Using the Online PG Calculator

Ceph provides an online PG calculator at `https://old.ceph.com/pgcalc/`. Input:
- Number of OSDs
- Expected pool count
- Replication factor per pool
- Target data percentage per pool

## Using the CLI to Estimate PG Count

Check the autoscale mode for a specific pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool get replicapool pg_autoscale_mode
```

Ask the autoscaler for a recommendation:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool autoscale-status
```

Output showing current and recommended PG counts:

```text
POOL               SIZE  TARGET SIZE  RATE  RAW CAPACITY  RATIO  TARGET RATIO  EFFECTIVE RATIO  BIAS  PG_NUM  NEW PG_NUM  AUTOSCALE
replicapool         75G              3.0        900G       0.08                        0.08      1.0      32          64  warn
myfs-metadata       1G               3.0        900G       0.01                        0.01      4.0       8               on
```

## Setting PG Count for a Pool

Set the PG count for a specific pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set replicapool pg_num 256

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set replicapool pgp_num 256
```

Wait for PGs to stabilize:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph -w | grep peering
```

## Configuring PG Count in Rook CRDs

Set the PG count in a CephBlockPool manifest:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: replicapool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  parameters:
    pg_num: "256"
    pgp_num: "256"
    pg_autoscale_mode: "on"
```

## Monitoring PG Distribution

Check how PGs are distributed across OSDs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd df tree | grep -E "OSD|TOTAL"
```

Check for imbalanced PG distribution (any OSD with significantly more or fewer PGs):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg dump pools
```

## Summary

The Ceph PG calculator guides you to set optimal PG counts per pool based on OSD count, pool count, and replication factor. The recommended approach is to enable the built-in autoscaler (`osd_pool_default_pg_autoscale_mode: on`) which dynamically adjusts PG counts as pools grow. For fine-grained control, use the formula `(Target PGs per OSD * OSD count) / Replication factor`, rounded up to the nearest power of 2, and set it in the Rook CephBlockPool CRD.
