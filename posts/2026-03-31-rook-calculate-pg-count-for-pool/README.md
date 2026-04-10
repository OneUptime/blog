# How to Calculate the Correct Number of PGs for a Ceph Pool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Placement Group, Pool, Performance

Description: Learn how to calculate the correct number of Placement Groups for a Ceph pool to balance performance, memory usage, and recovery time.

---

## Why PG Count Matters

Placement Groups (PGs) are the fundamental unit of data distribution in Ceph. Each pool is divided into a fixed number of PGs, and each PG maps to a set of OSDs. Too few PGs causes uneven data distribution and slow recovery. Too many PGs wastes memory (each PG consumes roughly 100 KB or more of RAM per OSD, depending on workload) and increases CPU overhead.

The ideal PG count depends on the number of OSDs, the replication factor, and the number of pools sharing those OSDs.

## The PG Calculation Formula

The traditional Ceph PG calculation formula:

```text
PG count = (OSDs * 100) / replication_factor
Round up to the nearest power of 2
```

For a pool with 3x replication on 9 OSDs:

```text
(9 * 100) / 3 = 300 -> round up to 512 PGs
```

For a pool intended to use 50% of the cluster, scale accordingly:

```text
(9 * 100 * 0.5) / 3 = 150 -> round up to 256 PGs
```

## Using the Ceph PG Calculator

Ceph provides an online calculator and a CLI tool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool autoscale-status
```

The `NEW PG_NUM` column shows the recommended count based on actual data distribution.

## Creating a Pool with the Correct PG Count

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create mypool 128 128

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set mypool size 3

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set mypool min_size 2
```

## Configuring PG Count in Rook CephBlockPool

The declarative way to set PG count in Rook:

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
    pg_num: "128"
    pgp_num: "128"
```

## Enabling PG Autoscaling

Rather than calculating manually, enable autoscaling to let Ceph manage PG counts:

```yaml
spec:
  parameters:
    pg_autoscale_mode: "on"
```

Or via CLI:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set mypool pg_autoscale_mode on
```

## Checking PGs Per OSD

Verify you stay near the target of 100 PGs per OSD (Ceph issues a health warning above 250):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd df
```

Check the `PGS` column in the output. If any OSD is well above 200, consider reducing PG counts or adding more OSDs.

## Summary

PG count calculation balances data distribution, memory usage, and recovery speed. Use the formula `(OSDs * 100) / replication_factor` rounded to the next power of 2. For multi-pool clusters, scale by the expected data fraction. Enable PG autoscaling in Rook to have Ceph adjust counts automatically as data grows.
