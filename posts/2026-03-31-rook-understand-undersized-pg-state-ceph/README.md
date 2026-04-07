# How to Understand the undersized PG State in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Placement Group, State, Storage, Replication

Description: Understand the Ceph undersized PG state, what it means for data durability, how it differs from degraded, and how to resolve it.

---

The `undersized` PG state indicates that the acting set for a PG has fewer OSDs than the pool's `size` setting, but the PG has NOT fallen below the `min_size` threshold. The PG continues to serve I/O but with reduced replication.

## undersized vs degraded

These two states are closely related but have distinct meanings:

| State | Meaning | I/O Status |
|-------|---------|-----------|
| `degraded` | Some object replicas are missing | Active, data missing |
| `undersized` | Acting set is smaller than pool size | Active, acting set reduced |

A PG can be `undersized` without being `degraded` if the acting set is smaller than `size` but all objects in the acting set are consistent. Conversely, a PG can be degraded without being undersized.

## What Causes undersized

1. Not enough OSDs are available to fill the acting set
2. Insufficient OSDs in a CRUSH failure domain
3. Pool `size` is set higher than the available OSD count

```bash
# Check pool size settings
ceph osd pool get mypool size
ceph osd pool get mypool min_size

# Check how many OSDs are up
ceph osd stat
```

## Checking Undersized PGs

```bash
ceph status
# HEALTH_WARN: X/Y pgs undersized

ceph pg stat | grep undersized

# Detailed list
ceph pg dump | grep undersized
```

For a specific PG:

```bash
ceph pg <pg-id> query | jq '{state: .state, acting: .acting, up: .up}'
```

## Risk Assessment

Undersized PGs have less protection than configured. For a `size 3` pool:

- 2 acting OSDs: can lose 1 more OSD before data loss
- 1 acting OSD: data is vulnerable

```bash
# Count undersized PGs by acting set size
ceph pg dump --format json | jq '.pg_stats[] | select(.state | contains("undersized")) | .acting | length' | sort | uniq -c
```

## Resolving undersized

### Add More OSDs

If the pool `size` exceeds available OSD count, add more OSDs:

```bash
ceph osd tree   # count available OSDs per host/rack
```

### Reduce Pool Size

If the pool size is intentionally larger than available OSDs:

```bash
ceph osd pool set mypool size 2
ceph osd pool set mypool min_size 1
```

### Recover Failed OSDs

If OSDs are down but recoverable:

```bash
systemctl start ceph-osd@<id>.service
watch ceph osd stat
```

## Undersized During Maintenance

During rolling maintenance, `undersized` is expected and temporary. Set `noout` before starting:

```bash
ceph osd set noout
# Perform maintenance - PGs become undersized temporarily
# Restart OSDs
ceph osd unset noout
# PGs recover to full size
```

## Summary

Undersized PGs have a smaller acting set than the configured pool `size`, which means reduced but not necessarily absent redundancy. The cluster continues serving I/O but with less fault tolerance. Resolve by adding OSDs, recovering downed ones, or adjusting the pool size to match the available hardware. During planned maintenance, this state is expected and transient.
