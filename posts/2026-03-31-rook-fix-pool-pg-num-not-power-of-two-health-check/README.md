# How to Fix POOL_PG_NUM_NOT_POWER_OF_TWO Health Check in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Pool, Placement Group, Health Check

Description: Learn how to fix POOL_PG_NUM_NOT_POWER_OF_TWO in Ceph, a warning that a pool's PG count is not a power of two, causing suboptimal data distribution.

---

## What Is POOL_PG_NUM_NOT_POWER_OF_TWO?

`POOL_PG_NUM_NOT_POWER_OF_TWO` is a Ceph health warning that fires when a pool's `pg_num` value is not a power of two (e.g., 64, 128, 256, 512). While Ceph can function with non-power-of-two PG counts, they cause less efficient data distribution because Ceph's CRUSH algorithm uses bit-masking operations that work optimally with power-of-two values.

This warning was introduced in Ceph Nautilus. It does not indicate data loss risk - it is a performance and distribution efficiency recommendation.

## Checking the Warning

```bash
ceph health detail
```

Output example:

```text
[WRN] POOL_PG_NUM_NOT_POWER_OF_TWO: 1 pool(s) have a non-power-of-two pg_num
    pool 'my-pool' has 96 PGs
```

Check current PG counts:

```bash
ceph osd pool ls detail | grep pg_num
```

List all pools with their PG counts:

```bash
ceph osd dump | grep "^pool" | awk '{print $3, $14}'
```

## Why Power-of-Two Matters

Ceph uses a bit-masking operation to map objects to placement groups. With power-of-two PG counts, the bitmask produces a perfectly balanced mapping where each PG receives an equal share of objects. Non-power-of-two counts require remapping some hash values, producing slight imbalances in how many objects end up in each PG.

## Fixing the Issue

Identify the nearest power of two and adjust `pg_num`:

| Current | Nearest Power of Two |
|---|---|
| 96 | 128 |
| 192 | 256 |
| 384 | 512 |

### Step 1 - Increase pg_num to the Next Power of Two

```bash
ceph osd pool set my-pool pg_num 128
```

### Step 2 - Wait for PG Splitting to Complete

```bash
watch ceph -s
```

Wait until there are no PGs in `splitting` state.

### Step 3 - Update pgp_num to Match (Pre-Nautilus Only)

Starting with Ceph Nautilus, `pgp_num` automatically tracks `pg_num` changes, so this step is only needed on older clusters:

```bash
ceph osd pool set my-pool pgp_num 128
```

### Using the PG Autoscaler

If you have the PG autoscaler enabled, it will only suggest power-of-two values:

```bash
ceph mgr module enable pg_autoscaler
ceph osd pool set my-pool pg_autoscale_mode on
```

The autoscaler will automatically pick power-of-two values when adjusting PG counts.

## Checking the Target

Check the autoscaler's current targets with:

```bash
ceph osd pool autoscale-status
```

If the autoscaler target for your pool is not a power of two, you can override `pg_num` directly:

```bash
ceph osd pool set my-pool pg_num 128
```

## Verifying Resolution

After updating, verify the warning clears:

```bash
ceph health
ceph osd pool ls detail | grep my-pool
```

## Summary

`POOL_PG_NUM_NOT_POWER_OF_TWO` is a soft warning that a pool's PG count is not a power of two, causing minor data distribution inefficiency. Fix it by adjusting `pg_num` to the nearest power of two and waiting for PG splitting to complete. On Nautilus and later, `pgp_num` adjusts automatically. Enable the PG autoscaler to automatically maintain power-of-two PG counts going forward.
