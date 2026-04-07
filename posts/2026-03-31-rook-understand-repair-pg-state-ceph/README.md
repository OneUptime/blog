# How to Understand the repair PG State in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Placement Group, Repair, State, Storage

Description: Understand the Ceph repair PG state, what triggers it, how Ceph repairs object inconsistencies, and how to verify repair completion.

---

The `repair` PG state indicates that Ceph is actively fixing object inconsistencies found during a scrub. It is a short-lived transitional state that follows the detection of an `inconsistent` PG.

## What repair Means

When `ceph pg repair <pg-id>` is called, or when Ceph automatically repairs during a scrub (if `osd_scrub_auto_repair` is enabled), the PG enters the `repair` state. During repair:

1. The primary OSD identifies the authoritative copy of each inconsistent object
2. It overwrites the corrupt or incorrect copies on replica OSDs
3. After all objects are repaired, the PG exits the `repair` state

## Triggering Repair

Repair is triggered manually or automatically:

```bash
# Manual repair
ceph pg repair <pg-id>

# Repair all inconsistent PGs in a pool
for pg in $(ceph pg dump | grep inconsistent | awk '{print $1}'); do
  ceph pg repair $pg
done
```

Enable automatic repair:

```bash
ceph config set osd osd_scrub_auto_repair true
ceph config set osd osd_scrub_auto_repair_num_errors 5  # max errors to auto-repair
```

## Monitoring Repair Progress

```bash
ceph pg stat | grep repair

# Watch the repair state clear
watch 'ceph health detail | grep -E "inconsistent|repair"'
```

For a specific PG:

```bash
ceph pg <pg-id> query | jq '.state'
```

The `repair` state should clear within minutes for small PGs.

## How Ceph Chooses the Authoritative Copy

Ceph uses the primary OSD's copy as authoritative in most cases. The decision is based on:

1. The acting primary's object version
2. Which replica has the highest version number
3. If versions are equal, the primary wins

You can inspect the decision:

```bash
ceph pg <pg-id> query | jq '.peer_info'
```

## When Repair Succeeds

After successful repair:

```bash
ceph health detail
# No more inconsistent PG messages

ceph pg dump | grep <pg-id>
# State should show active+clean
```

Confirm the fix with another scrub:

```bash
ceph pg deep-scrub <pg-id>
```

## When Repair Fails

If repair does not clear the inconsistency:

```bash
ceph health detail | grep "inconsistent"
```

Possible causes:
- All copies are equally corrupt (no authoritative version)
- The OSD containing the good copy is offline

In this case:

```bash
# Identify which objects are still inconsistent
rados list-inconsistent-obj <pg-id>

# If all copies are bad, the object may be unrecoverable
# Remove the corrupt object as a last resort
rados -p <pool-name> rm <object-name>
```

## Repair During Scrub

When `osd_scrub_auto_repair` is enabled, repair happens inline during the scrub cycle. The PG will show `scrubbing+repair` or `scrubbing+deep+repair`:

```bash
ceph pg dump | grep "scrubbing"
```

## Summary

The `repair` PG state is a positive indicator: Ceph has found inconsistencies and is actively correcting them. Repair is triggered manually via `ceph pg repair` or automatically via `osd_scrub_auto_repair`. Monitor its completion with `ceph health detail` and follow up with a deep scrub to verify the repair was successful. Persistent repair failures indicate hardware issues requiring physical inspection.
