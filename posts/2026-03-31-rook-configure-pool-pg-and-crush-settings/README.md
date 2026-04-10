# How to Configure Pool, PG, and CRUSH Settings in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Pool, Placement Group, CRUSH

Description: Learn how to configure Ceph pool, placement group, and CRUSH settings for optimal data distribution and performance.

---

## Overview

Three interrelated concepts govern how Ceph distributes data:

- **Pools** - logical namespaces that define replication factor, erasure coding, and access rules
- **Placement Groups (PGs)** - the unit of data distribution mapped by CRUSH onto OSDs
- **CRUSH** - the algorithm that maps PGs to OSDs based on the cluster topology

Getting these settings right is fundamental to cluster performance and resilience.

## Pool Configuration

Create a replicated pool with explicit PG count:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create mypool 64 64 replicated
```

The two `64` values are the PG count and PGP count. They should always be equal.

Set the replication factor:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set mypool size 3

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set mypool min_size 2
```

## Calculating PG Count

The recommended formula is:

```text
PG count = (OSDs * 100) / replication_factor
```

Round to the nearest power of 2. For example, with 12 OSDs and replication factor 3:

```text
(12 * 100) / 3 = 400 -> round to 512
```

You can also use the Ceph PG calculator at https://old.ceph.com/pgcalc/

## Configuring pg_num Autoscaling

Ceph can automatically adjust PG counts as the cluster grows:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set mypool pg_autoscale_mode on
```

Enable the autoscaler globally:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mgr module enable pg_autoscaler
```

## CRUSH Rule Configuration

List existing CRUSH rules:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd crush rule ls
```

Create a rule that distributes data across hosts:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd crush rule create-replicated replicated_rule default host
```

Apply the rule to a pool:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set mypool crush_rule replicated_rule
```

## Rook CephBlockPool Example

In Rook, configure pools via CRDs:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: mypool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
    requireSafeReplicaSize: true
  parameters:
    pg_num: "64"
    pg_autoscale_mode: "on"
  crushRoot: "default"
  deviceClass: "ssd"
```

## Summary

Pool, PG, and CRUSH settings work together to control data distribution in Ceph. Calculate PG counts using the (OSDs * 100) / replication formula, or enable `pg_autoscaler` for automatic management. Use CRUSH rules to control placement topology. In Rook, define these settings declaratively through `CephBlockPool` CRDs.
