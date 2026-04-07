# How to Verify Data Integrity with Deep Scrubbing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Scrubbing, Data Integrity, OSD

Description: Learn how Ceph deep scrubbing works to verify data integrity across OSDs and how to schedule, trigger, and monitor scrub operations in your cluster.

---

Scrubbing is Ceph's mechanism for proactively detecting data corruption and inconsistencies across placement groups. Deep scrubbing reads and verifies the actual bytes on disk, making it the most thorough form of data validation available.

## Light Scrubbing vs Deep Scrubbing

- **Light scrubbing** - compares object metadata (size, attributes) across replicas without reading data
- **Deep scrubbing** - reads all object data from disk and verifies checksums against stored values

Deep scrubbing catches silent corruption that light scrubbing would miss, such as bit rot in the underlying storage medium.

## Default Scrub Schedule

By default, Ceph performs:
- Light scrub: every 24 hours
- Deep scrub: every 7 days

Check when each placement group was last scrubbed:

```bash
ceph health detail | grep -E "PG_NOT_SCRUBBED|PG_NOT_DEEP_SCRUBBED"
```

Or inspect PG details in JSON:

```bash
ceph pg dump pgs --format=json-pretty
```

## Triggering Manual Deep Scrub

Force a deep scrub on a specific PG:

```bash
ceph pg deep-scrub 2.1a
```

Force deep scrub on all PGs in a pool:

```bash
for pg in $(ceph pg ls-by-pool mypool | awk '/^[0-9]+\./ {print $1}'); do
  ceph pg deep-scrub $pg
done
```

## Configuring Scrub Settings

```bash
# Minimum interval between scrubs (seconds)
ceph config set osd osd_scrub_min_interval 86400

# Maximum interval before forcing a scrub (seconds)
ceph config set osd osd_scrub_max_interval 604800

# Deep scrub interval
ceph config set osd osd_deep_scrub_interval 604800
ceph config set mgr osd_deep_scrub_interval 604800

# Limit scrub load impact
ceph config set osd osd_scrub_load_threshold 0.5
ceph config set osd osd_scrub_chunk_max 25
```

## Monitoring Scrub Status

Watch for inconsistent PGs after scrubs complete:

```bash
ceph health detail | grep -E "inconsistent|scrub"
```

View recent scrub errors in OSD logs:

```bash
kubectl -n rook-ceph logs -l app=rook-ceph-osd | grep -i "deep-scrub\|scrub error"
```

## Prioritizing Scrubs on Specific Pools

For critical data, shorten the pool-specific scrub intervals:

```bash
ceph osd pool set critical-pool scrub_min_interval 43200
ceph osd pool set critical-pool deep_scrub_interval 259200
```

## Using Rook CephBlockPool to Set Scrub Parameters

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: mypool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  parameters:
    scrub_min_interval: "86400"
    deep_scrub_interval: "604800"
```

## Repairing Found Inconsistencies

When deep scrubbing finds corrupt data:

```bash
ceph health detail | grep inconsistent
# Example output: pg 2.1a is active+clean+inconsistent

ceph pg repair 2.1a
```

Ceph attempts to repair the PG by fixing inconsistent metadata and, in replicated pools, marking the bad copy missing so normal recovery can refill it from an authoritative replica.

## Summary

Deep scrubbing is essential for maintaining long-term data integrity in Ceph. By reading data off disk and verifying checksums, it catches silent corruption before it affects applications. Configuring appropriate scrub intervals, monitoring for inconsistent PGs, and using the repair command to fix detected issues keeps your cluster healthy and your data trustworthy.
