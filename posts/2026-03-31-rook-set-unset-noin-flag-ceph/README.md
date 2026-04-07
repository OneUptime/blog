# How to Set and Unset the noin Flag in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Flag, Maintenance, Storage

Description: Learn how the Ceph noin flag prevents OSDs from being marked in and how to use it to control when new or recovered OSDs begin receiving data.

---

The `noin` flag prevents Ceph from automatically marking OSDs as `in` (active participants in data placement). This lets you control when an OSD starts receiving PG assignments, which is useful when adding new hardware or recovering from failures.

## What noin Does

Normally, when an OSD starts and becomes `up`, Ceph marks it `in` after a short delay, which triggers the CRUSH map to start routing PGs to it. With `noin` set, OSDs remain `up` but not `in`, so no data moves to them until you explicitly mark them in.

## Setting the noin Flag

```bash
ceph osd set noin
```

Confirm the flag is active:

```bash
ceph osd dump | grep flags
ceph status
```

The cluster will report `HEALTH_WARN: noin flag(s) set`.

## Use Case - Staged Hardware Addition

When adding new OSDs to a large cluster, you may want to control rebalancing to avoid saturating the network. Set `noin` first, then add the OSDs:

```bash
ceph osd set noin

# Add the new OSDs via cephadm or Rook
ceph orch apply osd --all-available-devices

# OSDs become up but not in
ceph osd tree
```

Then selectively mark individual OSDs in:

```bash
ceph osd in osd.10
ceph osd in osd.11
```

## Use Case - Prevent Automatic Recovery

After a cluster incident where multiple OSDs went down and came back, you may want to inspect the state before allowing data movement:

```bash
ceph osd set noin
# Inspect PG states
ceph pg dump | grep -v "active+clean"
# When ready to allow recovery
ceph osd unset noin
```

## Marking Specific OSDs In Manually

```bash
# Mark one OSD in
ceph osd in osd.5

# Mark multiple OSDs in
for i in 5 6 7 8; do ceph osd in osd.$i; done
```

## Unsetting the noin Flag

```bash
ceph osd unset noin
```

After unsetting, Ceph will automatically mark any `up` OSDs as `in` and begin routing PGs to them.

```bash
ceph osd dump | grep flags
ceph health
```

## Relationship to noout

`noin` and `noout` complement each other. During a rolling upgrade:

- Set `noout` to prevent OSDs from being marked out when stopped
- Set `noin` to prevent new OSDs from immediately receiving data

Use them together for maximum control during complex maintenance.

## Summary

The `noin` flag gives you manual control over when OSDs begin participating in data placement. It is particularly useful when adding new nodes in stages or when you want to inspect cluster state before allowing recovery. Always unset the flag after completing your maintenance to restore automatic OSD management.
