# How to Fix MANY_OBJECTS_PER_PG Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Placement Group, Health Check, Performance

Description: Learn how to fix MANY_OBJECTS_PER_PG in Ceph, a warning that some PGs contain far more objects than average, causing load imbalance and slow scrubs.

---

## What Is MANY_OBJECTS_PER_PG?

`MANY_OBJECTS_PER_PG` is a Ceph health warning that fires when one or more Placement Groups contain significantly more objects than the average PG in the pool. By default, Ceph warns when a PG has more than 10x the average number of objects.

Large PGs cause:
- Slower scrubbing (scrub takes longer on dense PGs)
- Load imbalance across OSDs
- Longer recovery times for those PGs
- Potential OSD memory pressure

This is often caused by too few PGs for the data volume, or by object naming patterns that hash unevenly.

## Diagnosing the Issue

```bash
ceph health detail
```

Example output:

```text
[WRN] MANY_OBJECTS_PER_PG: 3 PGs have too many objects
    pg 1.0 has 24500 objects (average 2450)
```

Check PG object distribution:

```bash
ceph pg dump | awk '{print $1, $12}' | sort -k2 -n -r | head -20
```

Check average objects per PG for a pool:

```bash
rados -p <pool-name> df
ceph osd pool stats <pool-name>
```

## Fix Options

### Option 1 - Increase PG Count for the Pool

The primary fix is increasing `pg_num` to distribute objects more evenly:

```bash
ceph osd pool autoscale-status
```

Increase based on autoscaler recommendation:

```bash
ceph osd pool set <pool-name> pg_num 256
```

Wait for splitting:

```bash
watch ceph -s
```

Then update `pgp_num`:

```bash
ceph osd pool set <pool-name> pgp_num 256
```

### Option 2 - Enable the PG Autoscaler

Let Ceph automatically manage PG counts:

```bash
ceph mgr module enable pg_autoscaler
ceph osd pool set <pool-name> pg_autoscale_mode on
```

### Option 3 - Investigate Object Naming Patterns

If objects are clustering in specific PGs due to naming patterns, the application may need to be updated to use more varied object names to improve hash distribution.

Check object distribution in the pool:

```bash
rados -p <pool-name> ls | awk '{print substr($0, 1, 4)}' | sort | uniq -c | sort -n -r | head -20
```

If prefixes are too uniform, consider adding random suffixes or using a different naming convention.

### Option 4 - Adjust the Warning Threshold

If the distribution is acceptable and the warning is spurious:

```bash
ceph config set global mon_pg_warn_max_object_skew 20
```

## Monitoring Object Distribution

After increasing PG count, verify the distribution improves:

```bash
ceph pg dump | awk 'NF>1 {print $12}' | awk '{sum+=$1; count++; if($1>max)max=$1} END {print "avg="sum/count, "max="max}'
```

## Summary

`MANY_OBJECTS_PER_PG` warns that some PGs hold a disproportionate number of objects, causing performance imbalances. The standard fix is increasing `pg_num` (via autoscaler or manually) to spread objects more evenly. Also investigate whether application object naming patterns are causing uneven hashing. Well-distributed PG object counts improve scrub speed, recovery time, and OSD load balance.
