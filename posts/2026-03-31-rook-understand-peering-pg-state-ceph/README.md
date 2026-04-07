# How to Understand the peering PG State in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Placement Group, Peering, State, Storage

Description: Understand the Ceph peering PG state, how the peering process works, what causes PGs to get stuck in peering, and how to resolve peering failures.

---

Peering is the process by which all OSDs in a PG's acting set agree on the complete and consistent state of every object in the PG. A PG must complete peering before it can serve any I/O. Understanding peering is fundamental to diagnosing cluster startup and OSD failure recovery.

## What Peering Is

When a PG starts or any OSD in its acting set changes, the PG must peer. The primary OSD:

1. Contacts all replica OSDs and requests their PG logs
2. Determines the authoritative object version history
3. Identifies any objects that need recovery or removal
4. Marks the PG as `active` when all replicas agree

Until peering completes, the PG is `peering` and cannot serve I/O.

## Checking Peering PGs

```bash
ceph status
# HEALTH_WARN: X pgs not active

ceph pg stat | grep peering

# List PGs currently in peering
ceph pg dump | grep "peering"
```

## How Long Peering Takes

Peering should complete in seconds. If it is taking minutes, something is wrong. Check:

```bash
# PGs that have been peering for a long time
ceph health detail | grep -i "stuck"

# Per-PG peering state
ceph pg <pg-id> query | jq '.recovery_state.name'
```

## Why PGs Get Stuck in Peering

### Not enough OSDs up

For a `size 3` pool with `min_size 2`, at least 2 OSDs must be up:

```bash
# Check acting set for stuck PG
ceph pg <pg-id> query | jq '{acting: .acting, up: .up}'

# Check which OSDs are down
ceph osd tree | grep down
```

### pg_temp map issues

Old pg_temp entries can confuse peering:

```bash
ceph osd dump | grep pg_temp
ceph osd pg-temp <pg-id>  # clear pg_temp by passing no OSDs
```

### Stuck in WaitUpThru

The PG may wait for the monitor's epoch to advance:

```bash
ceph pg <pg-id> query | jq '.recovery_state'
```

If stuck in `WaitUpThru`, the OSD is waiting for the monitor to acknowledge its up_thru value. Restarting the affected OSD or triggering an OSD map update can help:

```bash
# Check current OSD map epoch
ceph osd stat

# Restart the affected OSD to trigger a new map update
systemctl restart ceph-osd@<osd-id>
```

## Viewing Peering Log

```bash
ceph pg <pg-id> query | jq '.recovery_state.prior_set'
ceph pg <pg-id> query | jq '.peer_info'
```

## Forcing Peering

If a PG is stuck peering because not enough OSDs are available, you can lower the pool's `min_size` to allow the PG to become active with fewer replicas:

```bash
ceph osd pool set <pool-name> min_size 1
```

This allows PGs to become active with only one copy and may serve stale data. Restore the original `min_size` once the missing OSDs are recovered. Use only when you need to restore I/O and accept the risk of reduced redundancy.

## Peering After Cluster Restart

After a full cluster restart, all PGs start peering simultaneously. This is normal and usually resolves quickly:

```bash
watch ceph pg stat
# peering count decreases as OSDs complete startup
```

## Summary

Peering is the negotiation phase where all acting OSDs for a PG agree on its authoritative state. It is a brief transitional state that precedes `active`. PGs stuck in peering indicate a problem with OSD availability or the peering protocol. Resolve by ensuring all acting OSDs are reachable or by adjusting pool `min_size` if permanent OSD loss has occurred.
