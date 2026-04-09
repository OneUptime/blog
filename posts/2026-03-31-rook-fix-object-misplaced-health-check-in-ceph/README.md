# How to Fix OBJECT_MISPLACED Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Object, Health Check, Rebalancing

Description: Learn how to resolve OBJECT_MISPLACED in Ceph, a warning that objects are stored on incorrect OSDs and need to be relocated via backfill operations.

---

## What Is OBJECT_MISPLACED?

`OBJECT_MISPLACED` is a Ceph health warning that means objects are currently stored on OSDs that are not their intended homes according to the current CRUSH map. The objects are still accessible (they exist somewhere in the cluster), but they are in the wrong place and need to be moved via backfill operations.

This commonly happens after:
- Adding new OSDs (CRUSH rebalances data to include new nodes)
- Changing CRUSH weights or rules
- Removing or reweighting OSDs
- Changing pool parameters

## Checking the Warning

```bash
ceph health detail
```

Example output:

```text
[WRN] OBJECT_MISPLACED: 124/372 objects misplaced (33.333%)
    5 pgs are active+remapped+backfill_wait
```

Check how many objects are misplaced:

```bash
ceph -s | grep misplaced
ceph pg stat
```

## Is This Normal?

`OBJECT_MISPLACED` during routine cluster changes is completely normal. When you add OSDs or change CRUSH weights, Ceph calculates new ideal object locations and then begins migrating objects via backfill. The `OBJECT_MISPLACED` warning will clear automatically once backfill completes.

You only need to intervene if:
- Backfill is paused
- Backfill is moving too slowly
- Backfill is consuming too much I/O

## Checking Backfill Progress

Monitor the progress:

```bash
watch ceph -s
ceph pg stat | grep backfill
```

Check if backfill is paused:

```bash
ceph osd dump | grep nobackfill
```

## Fix Steps

### Step 1 - Check if Backfill is Paused

```bash
ceph osd dump | grep -E "nobackfill|norebalance|norecover"
```

If paused, resume it:

```bash
ceph osd unset nobackfill
ceph osd unset norebalance
```

### Step 2 - Speed Up Backfill

If backfill is progressing too slowly:

```bash
ceph config set osd osd_max_backfills 4
ceph config set osd osd_backfill_scan_min 128
ceph config set osd osd_backfill_scan_max 1024
```

### Step 3 - Throttle Backfill if Impacting Clients

If backfill is too aggressive and degrading client I/O:

```bash
ceph config set osd osd_max_backfills 1
ceph osd set-backfillfull-ratio 0.85
```

### Step 4 - Check for Stuck PGs

```bash
ceph pg ls remapped
```

Force recovery on stuck PGs:

```bash
ceph pg force-backfill <pg-id>
```

## Monitoring to Completion

```bash
watch "ceph -s | grep -E 'misplaced|backfill'"
```

The warning clears automatically when all objects reach their correct OSDs.

## Summary

`OBJECT_MISPLACED` is a normal transitional state in Ceph that occurs after CRUSH changes (adding/removing OSDs, reweighting). Objects are accessible but being migrated to their correct OSD locations via backfill. The warning clears automatically. You may need to resume paused backfill, tune backfill speed, or force-backfill stuck PGs to ensure timely completion.
