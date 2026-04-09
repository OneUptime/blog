# How to Fix SMALLER_PGP_NUM Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Placement Group, Health Check, Pool

Description: Learn how to resolve SMALLER_PGP_NUM in Ceph, a warning that a pool's pgp_num is smaller than its pg_num, causing PGs to not be spread across all OSDs.

---

## What Is SMALLER_PGP_NUM?

`SMALLER_PGP_NUM` is a Ceph health warning that appears when a pool's `pgp_num` (Placement Group for Placement) is smaller than `pg_num` (Placement Group number).

`pg_num` defines how many PGs exist in the pool. `pgp_num` defines how many of those PGs are used for data placement (distributing data to OSDs). When `pgp_num < pg_num`, the extra PGs are created but not actively used for data placement, meaning data is not being fully distributed across the cluster.

This situation commonly happens when `pg_num` is increased but `pgp_num` is not updated to match.

## Checking the Warning

```bash
ceph health detail
```

Example output:

```text
[WRN] SMALLER_PGP_NUM: 1 pool(s) have a smaller pgp_num than pg_num
    pool 'rbd' has pg_num 256 > pgp_num 128
```

Check all pools:

```bash
ceph osd dump | grep "^pool" | awk '{print $3, $14, $16}'
```

## Why pgp_num Matters

- `pg_num` - total number of PGs (controls splitting/merging)
- `pgp_num` - how many PGs participate in data placement (controls OSD distribution)

If `pgp_num < pg_num`, the new PGs from increasing `pg_num` are not yet active for data placement. Data remains on the old PGs until `pgp_num` catches up.

## Fix Steps

The fix is straightforward: set `pgp_num` equal to `pg_num`.

### Step 1 - Check Current Values

```bash
ceph osd pool get rbd pg_num
ceph osd pool get rbd pgp_num
```

### Step 2 - Verify Cluster is Healthy Before Updating

Do not update `pgp_num` while the cluster is recovering or backfilling:

```bash
ceph -s | grep -E "degraded|recovering|backfilling"
```

### Step 3 - Update pgp_num

Set `pgp_num` to match `pg_num`:

```bash
ceph osd pool set rbd pgp_num 256
```

### Step 4 - Monitor Rebalancing

After updating `pgp_num`, the cluster begins remapping PGs to new OSD locations:

```bash
watch ceph -s
```

Expect to see some `remapped` PGs during the transition:

```bash
ceph pg stat | grep remapped
```

## Batch Fix for Multiple Pools

Fix all pools where `pgp_num < pg_num`:

```bash
ceph osd dump | grep "^pool" | while read -r line; do
  pool=$(echo "$line" | awk '{print $3}' | tr -d "'")
  pg_num=$(echo "$line" | awk '{print $14}')
  pgp_num=$(echo "$line" | awk '{print $16}')
  if [ "$pgp_num" -lt "$pg_num" ]; then
    echo "Fixing pool $pool: pg_num=$pg_num pgp_num=$pgp_num"
    ceph osd pool set "$pool" pgp_num "$pg_num"
  fi
done
```

## Preventing This Issue

When increasing `pg_num`, always follow up with updating `pgp_num` to match, but only after PG splitting completes:

```bash
ceph osd pool set rbd pg_num 256
watch ceph -s   # wait for splits to complete
ceph osd pool set rbd pgp_num 256
```

## Summary

`SMALLER_PGP_NUM` warns that a pool's `pgp_num` is less than `pg_num`, meaning not all PGs are actively used for data placement. Fix it by setting `pgp_num` equal to `pg_num` after verifying the cluster is healthy. This triggers data rebalancing as objects are remapped to the newly active PGs. Always update `pgp_num` after changing `pg_num`.
