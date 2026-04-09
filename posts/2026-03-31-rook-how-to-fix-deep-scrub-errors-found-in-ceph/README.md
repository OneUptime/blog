# How to Fix 'deep-scrub errors found' in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Scrubbing, Data Integrity, Troubleshooting

Description: Learn how to diagnose and fix 'deep-scrub errors found' in Ceph, including identifying corrupt objects and recovering data integrity.

---

## Understanding Deep-Scrub Errors

Ceph performs two types of data integrity checks: regular scrubs (which verify placement group metadata) and deep scrubs (which read actual object data and verify checksums). When a deep scrub detects data inconsistencies, it reports:

```text
HEALTH_ERR
    1 scrub errors
    Possible data damage: 1 pg inconsistent
```

Or more specifically:

```text
PG_DAMAGED 1 pg inconsistent
    pg 2.3 is active+clean+inconsistent, acting [0,2,1]
```

Deep-scrub errors indicate actual data corruption or checksum mismatches that require immediate attention.

## Identifying the Affected PGs and Objects

First, get a detailed view of which placement groups have errors:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

```text
HEALTH_ERR 1 scrub errors; Possible data damage: 1 pg inconsistent
    OSD_SCRUB_ERRORS 1 scrub errors
    PG_DAMAGED Possible data damage: 1 pg inconsistent
        pg 2.3 is active+clean+inconsistent, acting [0,2,1]
```

Then list inconsistent PGs directly:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- rados list-inconsistent-pg rbd
```

```text
["2.3"]
```

## Getting Detailed Inconsistency Information

Use `rados list-inconsistent-obj` to identify exactly which objects are corrupt:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- rados list-inconsistent-obj 2.3 --format=json-pretty
```

```text
{
    "epoch": 14,
    "inconsistents": [
        {
            "object": {
                "name": "rbd_data.12345.0000000000000001",
                "nspace": "",
                "locator": "",
                "snap": "head",
                "version": 1
            },
            "errors": [
                "data_digest_mismatch_info"
            ],
            "union_shard_errors": [
                "data_digest_mismatch_info"
            ],
            "selected_object_info": {
                "oid": {
                    "oid": "rbd_data.12345.0000000000000001"
                },
                "data_digest": "0x5ad8a543",
                "omap_digest": "0xffffffff"
            },
            "shards": [
                {
                    "osd": 0,
                    "primary": false,
                    "data_digest": "0x5ad8a543",
                    "omap_digest": "0xffffffff",
                    "errors": []
                },
                {
                    "osd": 2,
                    "primary": true,
                    "data_digest": "0xdeadbeef",
                    "omap_digest": "0xffffffff",
                    "errors": [
                        "data_digest_mismatch_info"
                    ]
                }
            ]
        }
    ]
}
```

The output shows OSD 2 has a data digest mismatch - this OSD's copy of the object is corrupt.

## Repairing Inconsistent PGs

Ceph can attempt automatic repair of inconsistent PGs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg repair 2.3
```

```text
instructing pg 2.3 on osd.0 to repair
```

Wait for repair to complete, then verify:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg 2.3 query | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['state'])"
```

```text
active+clean
```

## Forcing a Deep Scrub on Specific PGs

To trigger an immediate deep scrub on a specific PG:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg deep-scrub 2.3
```

Or deep-scrub all PGs on a specific OSD:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd deep-scrub osd.2
```

## Handling Unrepairable Objects

If `pg repair` cannot fix the issue, the object may be permanently corrupted on all replicas. In this case:

```bash
# Check if the object belongs to an RBD image
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- rados -p rbd stat rbd_data.12345.0000000000000001
```

For RBD images, you may need to restore from backup. First identify which RBD image the object belongs to:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- rbd info <image-name> --pool rbd
```

## Preventing Future Deep-Scrub Errors

Configure regular deep-scrub schedules to catch errors early:

```bash
# Check current scrub settings
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph config get osd osd_scrub_min_interval
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph config get osd osd_deep_scrub_interval

# Set deep-scrub to run weekly (604800 seconds)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph config set osd osd_deep_scrub_interval 604800
```

Ensure scrubbing is not disabled on your pools:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool set rbd nodeep-scrub false
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool set rbd noscrub false
```

## Monitoring Scrub Health with Alerts

Check scrub error counts programmatically:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg stat | grep inconsistent
```

If you use Prometheus, monitor the `ceph_pg_inconsistent` metric and alert when it is greater than 0.

## Summary

Deep-scrub errors in Ceph indicate actual data corruption and must be addressed promptly. Use `rados list-inconsistent-pg` and `rados list-inconsistent-obj` to identify the affected objects, then run `ceph pg repair` to attempt automatic recovery. If repair fails, restore corrupted data from backups. Maintain regular deep-scrub schedules to detect corruption before it becomes widespread.
