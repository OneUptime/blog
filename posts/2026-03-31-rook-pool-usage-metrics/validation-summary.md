# Validation Summary: How to View Pool-Specific Usage Metrics in Ceph

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- kubectl (Kubernetes CLI)
- Python 3 (for JSON parsing scripts)
- Prometheus (monitoring metrics)

## Sources Consulted
- Ceph official documentation on monitoring: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph official documentation on pool operations: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph MGR Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph `ceph df` command reference and JSON output schema
- Ceph `rados df` command reference
- Other validated posts in this blog repository for cross-referencing metric names and command syntax

## Issues Found

### 1. Incorrect description of `USED COMPR` column (line 37)
- **What was wrong:** Described as "Bytes saved by compression". `USED COMPR` actually shows the compressed size of data stored on disk, not the bytes saved. The savings would be `UNDER COMPR - USED COMPR`.
- **What was changed:** Updated to "Compressed size of data stored on disk".

### 2. Slightly misleading description of `UNDER COMPR` column (line 38)
- **What was wrong:** Described as "Bytes that would be stored without compression", which implies a hypothetical. `UNDER COMPR` is the actual original uncompressed size of data that is currently stored in compressed form.
- **What was changed:** Updated to "Original uncompressed size of data stored compressed".

### 3. Incorrect pool quota commands (lines 85-86)
- **What was wrong:** Used `ceph osd pool get replicapool max_bytes` and `ceph osd pool get replicapool max_objects`. The `get` subcommand works for pool properties like `size`, `pg_num`, etc., but quota settings require the dedicated `get-quota` subcommand. The original commands would produce an "unrecognized variable" error.
- **What was changed:** Replaced both lines with `ceph osd pool get-quota replicapool`.

### 4. Python f-string incompatibility (line 102)
- **What was wrong:** The f-string `f'{'Pool':<30} {'Stored':>10} ...'` uses single quotes nested inside a single-quote-delimited f-string. This only works in Python 3.12+ (PEP 701). On Python 3.11 and earlier (still widely deployed), this is a SyntaxError.
- **What was changed:** Replaced with `'{:<30} {:>10} {:>10} {:>7}'.format('Pool', 'Stored', 'Used', '%Used')` for broad compatibility.

### 5. Incorrect Prometheus metric name (line 120)
- **What was wrong:** Used `ceph_pool_objects_total`. The correct metric exposed by the Ceph MGR Prometheus module is `ceph_pool_objects` (a gauge, not a counter — the `_total` suffix is incorrect per Prometheus naming conventions).
- **What was changed:** Updated to `ceph_pool_objects`.

## Review Notes
- The `rados df -p <pool>` command (line 60) may not be supported in all Ceph versions. In some versions, `rados df` always reports all pools and the `-p` flag may be ignored. Users should verify this works in their specific Ceph release.
- The `DIRTY` column description ("Unflushed data for cache tiering") is acceptable, though technically it counts unflushed objects rather than bytes. Cache tiering is deprecated in newer Ceph releases, so this column is less relevant going forward.
- The JSON parsing scripts assume specific key names (`stored`, `bytes_used`, `max_avail`, `percent_used`) in the `ceph df --format json` output. These have been stable across recent Ceph releases (Pacific, Quincy, Reef) but readers should verify against their specific version.
