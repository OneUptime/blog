# How to Fix PG_AVAILABILITY Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Placement Group, Health Check, OSD

Description: Learn how to resolve the PG_AVAILABILITY health error in Ceph, which occurs when placement groups are unavailable due to insufficient OSD replicas or failures.

---

## What Is PG_AVAILABILITY?

`PG_AVAILABILITY` is a critical Ceph health error that indicates one or more Placement Groups (PGs) are unavailable - meaning they cannot serve read or write requests. This happens when not enough OSD replicas are reachable to satisfy the pool's `min_size` requirement. Unavailable PGs can cause application I/O to hang or fail completely.

Common causes include multiple OSD failures in the same failure domain, network partitions, or a cluster that is still recovering after a disruption.

## Diagnosing the Problem

Check health detail:

```bash
ceph health detail
```

Output example:

```text
[ERR] PG_AVAILABILITY: Reduced data availability: 24 pgs inactive
    pg 1.0 is stuck inactive for 1260.835, current state stale+undersized+degraded
```

Check PG states:

```bash
ceph pg stat
ceph pg dump_stuck inactive
ceph pg dump_stuck unclean
```

List the OSDs that are down:

```bash
ceph osd tree | grep down
```

## Fix Steps

### Step 1 - Identify and Restart Down OSDs

Find which OSDs are down:

```bash
ceph osd stat
```

In Rook, restart the affected OSD pod:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-osd
kubectl -n rook-ceph delete pod rook-ceph-osd-2-<hash>
```

### Step 2 - Check OSD Logs for Crash Reasons

```bash
kubectl -n rook-ceph logs rook-ceph-osd-2-<hash> --previous
```

Look for `SIGSEGV`, disk errors, or journal issues.

### Step 3 - Force PG Peering if Stuck

If a PG is stuck in an inactive state even after OSDs are back up, force recovery:

```bash
ceph pg repair <pg-id>
ceph pg scrub <pg-id>
```

### Step 4 - Allow Degraded I/O (Temporary)

If you need read/write access while PGs are degraded, temporarily reduce `min_size` to allow I/O with fewer available replicas:

```bash
ceph osd pool set <pool-name> min_size 1
```

### Step 5 - Adjust min_size if Necessary

In extreme scenarios where permanent OSD loss is not recoverable, reduce `min_size` temporarily to restore availability (this reduces durability):

```bash
ceph osd pool set <pool-name> min_size 1
```

Reset to a safe value after recovery:

```bash
ceph osd pool set <pool-name> min_size 2
```

## Preventing PG Unavailability

Ensure your pools have adequate replication factor for your OSD count:

```bash
ceph osd pool set <pool-name> size 3
ceph osd pool set <pool-name> min_size 2
```

Use failure domains to spread replicas:

```bash
ceph osd crush rule create-replicated replicated_rule default host
```

## Summary

`PG_AVAILABILITY` means PGs cannot serve I/O because too few OSD replicas are reachable. Fix it by restarting down OSDs, reviewing OSD crash logs, forcing PG scrub/repair, and if necessary temporarily reducing `min_size` to restore read access. Always maintain adequate replication across multiple failure domains to prevent this condition.
