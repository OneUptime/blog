# How to Fix 'scrub errors' Detected During Data Scrubbing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Scrubbing, Data Integrity, Troubleshooting

Description: Investigate and repair Ceph scrub errors to fix inconsistent placement groups and protect data integrity across your storage cluster.

---

## What Are Ceph Scrub Errors

Ceph performs two types of background integrity checks:

- **Scrub** - compares metadata across OSD replicas
- **Deep scrub** - reads and verifies actual data checksums on all replicas

When inconsistencies are found between replicas, Ceph logs "scrub errors" and marks affected PGs as `inconsistent`. These errors mean Ceph found data or metadata that doesn't match across replicas, which could indicate disk corruption, past hardware failure, or software bugs.

## Step 1 - Identify Affected PGs

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

Output may show:

```text
HEALTH_ERR 1 scrub errors; pg 2.3 is inconsistent
```

List all inconsistent PGs:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg dump | grep inconsistent
```

Or use the health report:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- rados list-inconsistent-pg <pool-name>
```

## Step 2 - Get Details on Inconsistent Objects

For a specific PG (e.g., `2.3`):

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- rados list-inconsistent-obj 2.3
```

Example output:

```json
{
  "epoch": 12,
  "inconsistents": [
    {
      "object": {
        "name": "myobject",
        "nspace": "",
        "locator": "",
        "snap": "head",
        "version": 1
      },
      "errors": ["data_digest_mismatch"],
      "union_shard_errors": ["data_digest_mismatch_oi"],
      "selected_object_info": "..."
    }
  ]
}
```

## Step 3 - Attempt Automatic Repair

Ceph can repair inconsistencies automatically if a good copy exists:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg repair 2.3
```

This instructs Ceph to replace the bad copy with the good copy from another replica.

Monitor repair progress:

```bash
watch "kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg 2.3 query | grep state"
```

## Step 4 - Verify Repair Success

After the repair completes, re-check the PG status:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg 2.3 query | grep -E "state|scrub"
```

Run a fresh deep scrub to verify the repair:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg deep-scrub 2.3
```

Check health again:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph health detail
```

## Step 5 - Handle Repair Failures

If Ceph cannot determine which copy is authoritative, repair may fail. This can happen when:
- All replicas have different checksums
- The number of agreeing replicas doesn't meet quorum

In these cases, you may need to manually delete the corrupted object (accepting data loss):

```bash
# List objects in the pool
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- rados -p <pool-name> ls

# Remove the specific corrupted object
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- rados -p <pool-name> rm <object-name>
```

After removal, re-scrub the PG:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph pg scrub 2.3
```

## Step 6 - Investigate Disk Health

Scrub errors often indicate underlying disk problems. Check disk health on the affected OSD nodes:

```bash
# Check SMART data for disk errors
sudo smartctl -a /dev/sdb
```

Look for:
- Reallocated sector counts above 0
- Pending sector count above 0
- Uncorrectable sector count above 0

If disks show SMART errors, plan for OSD replacement.

## Step 7 - Configure Scrub Schedule

To prevent scrub errors from accumulating undetected, ensure deep scrubs run regularly:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd pool unset <pool-name> nodeep-scrub
```

Control the scrub schedule with:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell osd.* injectargs '--osd-scrub-begin-hour=2'
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph tell osd.* injectargs '--osd-scrub-end-hour=6'
```

## Summary

Ceph scrub errors indicate data or metadata inconsistencies between replicas. Address them by identifying inconsistent PGs with `rados list-inconsistent-pg`, running `ceph pg repair` to restore consistency from good replicas, and checking disk health on affected OSD nodes for SMART errors. If repair fails and data loss must be accepted, delete the corrupted object and re-scrub. Regular deep scrubs ensure issues are caught early before they compound.
