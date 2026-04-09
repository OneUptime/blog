# Validation Summary: How to Calculate Raw vs Usable Capacity in Ceph

## Status
validated

## Post Type
Tutorial / Capacity Planning Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- BlueStore (Ceph OSD backend)
- Erasure coding (data protection scheme)
- `bc` (arbitrary precision calculator)
- kubectl (Kubernetes CLI)

## Sources Consulted
- Ceph official documentation on `mon_osd_full_ratio` and capacity management: https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/
- Ceph documentation on erasure coding profiles: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Ceph `ceph df` command reference: https://docs.ceph.com/en/latest/man/8/ceph/
- GNU `bc` manual for `scale` behavior on division operations
- Ceph BlueStore documentation: https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/

## Issues Found

### 1. Incorrect usable capacity formula (The Basic Formula section)
- **What was wrong:** The formula used `(1 - full_threshold)` which, with `full_threshold` of 0.95, would yield 0.05 (5%) — making the result drastically wrong (e.g., 300 / 3 x 0.05 = 5 TB instead of the intended ~80-95 TB).
- **What was changed:** Replaced `(1 - full_threshold)` with `full_ratio` and clarified the variable name references `mon_osd_full_ratio`. The corrected formula is `Usable Capacity = Raw Capacity / Replication Factor x full_ratio`.
- **Why:** The `mon_osd_full_ratio` (default 0.95) represents the usable fraction directly, not a value to subtract from 1.

### 2. Parentheses causing `bc` truncation error in EC 4+2 calculation (Step 3)
- **What was wrong:** The expression `300 * (4/6) * 0.80` with `scale=1` causes `bc` to evaluate `4/6` first, truncating to `0.6` instead of `0.6667`. This produces `144.0 TB` instead of the correct `160.0 TB`.
- **What was changed:** Removed parentheses to `300 * 4/6 * 0.80`, which evaluates left-to-right as `300 * 4 = 1200`, then `1200 / 6 = 200.0`, then `200.0 * 0.80 = 160.0`.
- **Why:** Without parentheses, the multiplication happens before division, avoiding premature truncation and producing the mathematically correct result.

### 3. `bc` scale mismatch for EC 8+3 overhead display (Step 3)
- **What was wrong:** `scale=2; 11/8` in `bc` outputs `1.37` (truncated), but the echo string claims `1.375x`.
- **What was changed:** Changed `scale=2` to `scale=3` for the EC 8+3 line so `bc` outputs `1.375`, matching the displayed text.
- **Why:** 11/8 = 1.375 exactly, requiring 3 decimal places to display correctly.

## Review Notes
- The `ceph df detail` example output in Step 4 uses a "COPIES" column header that may not match all Ceph versions exactly (column names vary across releases), but the illustrated concept is correct.
- The 80% safety margin recommendation is sound engineering practice. Ceph's `mon_osd_nearfull_ratio` defaults to 0.85, and `mon_osd_full_ratio` defaults to 0.95. Planning for 80% provides a good buffer below the nearfull warning threshold.
- The BlueStore overhead estimate of 1-2% in Step 6 is reasonable for typical deployments with colocated DB on the same device.
- The Step 5 calculation (`$RAW_TB * 4/6 * 0.80`) does not have the parentheses bug because it already evaluates left-to-right without forced grouping.
