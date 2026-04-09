# How to Set Pool Flags in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Pool Flags, Storage Management, Data Protection

Description: Configure Ceph pool flags including HASHPSPOOL, NODELETE, NOPGCHANGE, and NOSIZECHANGE to protect pools from accidental deletion or configuration changes.

---

## What Are Pool Flags

Ceph pool flags are boolean properties that control specific behaviors of a pool. Some flags enable optional features, while others act as protection mechanisms against accidental changes.

```bash
# View current pool flags in the detail listing
ceph osd pool ls detail | grep mypool

# Or view all pool properties including individual flags
ceph osd pool get mypool all
```

## HASHPSPOOL Flag

`HASHPSPOOL` is enabled by default on all modern Ceph pools. It hashes the pool ID into the PG seed calculation, which produces a more uniform object distribution and prevents placement bias issues that existed in very old Ceph versions.

```bash
# This should already be set - verify
ceph osd pool get mypool hashpspool

# Enable if missing (should not be necessary on modern clusters)
ceph osd pool set mypool hashpspool true
```

This flag is enabled by default and should not be disabled. Disabling it causes data movement as objects are remapped.

## NODELETE Flag

Prevents the pool from being deleted accidentally. When set, `ceph osd pool delete` returns an error:

```bash
# Protect a critical pool from deletion
ceph osd pool set mypool nodelete true

# Verify
ceph osd pool get mypool nodelete

# Attempt to delete (will be blocked)
ceph osd pool delete mypool mypool --yes-i-really-really-mean-it
# Error: pool deletion is disabled; set the nodelete flag to false first
```

To delete a protected pool, you must first unset the flag:

```bash
ceph osd pool set mypool nodelete false
ceph osd pool delete mypool mypool --yes-i-really-really-mean-it
```

## NOPGCHANGE Flag

Prevents changes to the PG count (`pg_num` and `pgp_num`). Useful for pools where PG count should be fixed (e.g., pools tied to specific CRUSH configurations):

```bash
# Lock the PG count
ceph osd pool set mypool nopgchange true

# Attempt to change PG count (will fail)
ceph osd pool set mypool pg_num 256
# Error: pool pg_num changes are disabled; set the nopgchange flag to false first

# Remove the lock
ceph osd pool set mypool nopgchange false
```

## NOSIZECHANGE Flag

Prevents changes to the pool's `size` (replica count) and `min_size`:

```bash
# Lock the replication factor
ceph osd pool set mypool nosizechange true

# Verify
ceph osd pool get mypool nosizechange

# Attempt to change size (will fail)
ceph osd pool set mypool size 2
# Error: pool size changes are disabled; set the nosizechange flag to false first
```

This is useful for compliance environments where the replication factor must not be changed without a formal change process.

## BULK Flag

The `bulk` flag marks a pool as a bulk storage pool. This hints to the PG autoscaler that the pool expects to use a large portion of cluster capacity:

```bash
# Mark pool as bulk storage
ceph osd pool set mypool bulk true

# Check autoscale behavior
ceph osd pool autoscale-status
```

## WRITE_FADVISE_DONTNEED Flag

Advises the kernel not to cache data after writes, which can improve performance for streaming write workloads by freeing page cache:

```bash
ceph osd pool set mypool write_fadvise_dontneed true
```

## Viewing All Flags

```bash
# Get all flags for a pool
ceph osd pool get mypool all | grep -E "nodelete|nopgchange|nosizechange|hashpspool|bulk"

# Or use the full detail listing
ceph osd pool ls detail | grep mypool
```

Example output section showing flags:

```text
flags hashpspool,nodelete,nosizechange
```

## Setting Multiple Protection Flags

For production pools that should be protected from accidental changes:

```bash
# Protect a critical production pool
POOL=production-data

ceph osd pool set $POOL nodelete true
ceph osd pool set $POOL nopgchange true
ceph osd pool set $POOL nosizechange true

# Verify
ceph osd pool get $POOL all | grep -E "nodelete|nopgchange|nosizechange"
```

## Cluster-Level Pool Protection

You can also set cluster-wide defaults:

```bash
# Disallow all pool deletes cluster-wide
ceph config set mon mon_allow_pool_delete false

# This prevents pool deletion even without the nodelete flag
```

## Using Flags in Rook

In Rook, some pool protections can be enforced via the CephCluster spec or via post-creation configuration using the Rook toolbox:

```bash
# Via Rook toolbox
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash
ceph osd pool set rook-ceph-store.rgw.buckets.data nodelete true
```

## Summary

Ceph pool flags provide control over pool behavior and protection against accidental changes. `NODELETE` prevents pool deletion, `NOPGCHANGE` locks the PG count, and `NOSIZECHANGE` locks the replication factor. `HASHPSPOOL` enables consistent object placement and should always be enabled. For production pools, setting `nodelete`, `nopgchange`, and `nosizechange` together creates a robust change-protection policy that prevents accidental misconfiguration.
