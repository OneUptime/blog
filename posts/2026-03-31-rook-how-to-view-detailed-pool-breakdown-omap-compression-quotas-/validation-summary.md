# Validation Summary: How to View Detailed Pool Breakdown in Ceph

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Ceph (storage cluster commands: `ceph df`, `ceph osd pool stats`, `ceph pg dump`)
- Rook (Kubernetes Ceph operator context)
- RADOS (object-level OMAP inspection)
- BlueStore (OSD backend)
- Python 3 (inline JSON parsing scripts)

## Sources Consulted
- Ceph official documentation: pool statistics and `ceph df detail` output format (https://docs.ceph.com/en/latest/rados/operations/monitoring/)
- Ceph `ceph osd pool stats` JSON output structure — `client_io_rate` key with `read_bytes_sec`, `write_bytes_sec`, `read_op_per_sec`, `write_op_per_sec` fields
- Ceph `ceph pg dump` JSON output structure — `pg_stats` at top level in Nautilus+ (https://docs.ceph.com/en/latest/rados/operations/placement-groups/)
- Ceph `ceph df detail` JSON output — compression fields `compress_bytes_used`, `compress_under_bytes`, and OMAP field `stored_omap` (Reef+)
- Ceph admin socket commands: `dump_ops_in_flight` lists in-flight operations, not allocator stats
- Ceph RADOS CLI: `rados ls`, `rados stat`, `rados listomapkeys` for OMAP inspection

## Issues Found

1. **Incorrect JSON key `client_stats` in `ceph osd pool stats` scripts**: The post used `client_stats` as the key for I/O rate data in `ceph osd pool stats` JSON output. The correct key is `client_io_rate`. Fixed in the I/O Statistics section.

2. **Non-existent compression fields in pool stats**: The first compression script attempted to read `compress_attempts` and `compress_success` from `ceph osd pool stats` output. These fields do not exist in pool-level stats — they are OSD-level BlueStore perf counters accessible via `ceph daemon osd.X perf dump`. Removed the incorrect script; the post already had a correct second script using `ceph df detail` for compression ratios.

3. **Non-existent OMAP fields in pool stats**: The OMAP script used `omap_rop` and `omap_wop` fields from `ceph osd pool stats`, which do not exist. OMAP operation counters are OSD-level perf counters, not pool stats. Replaced with `ceph health detail` for OMAP warnings and `ceph df detail` for per-pool `stored_omap` bytes (available in Reef+).

4. **Incorrect `ceph pg dump` JSON path**: The PG breakdown script used `data.get('pg_map', {}).get('pg_stats', [])` but in modern Ceph (Nautilus+), `pg_stats` is at the top level of the JSON output, not nested under `pg_map`. Fixed to `data.get('pg_stats', [])`.

5. **Non-existent `op_per_sec` field**: The I/O stats script used `op_per_sec` which doesn't exist. Ceph splits this into `read_op_per_sec` and `write_op_per_sec`. Fixed to use both fields.

6. **Misleading comment on `dump_ops_in_flight`**: The comment said "BlueStore allocator stats" but `ceph daemon osd.0 dump_ops_in_flight` lists currently in-flight OSD operations, not allocator statistics. Fixed the comment.

## Review Notes
- The `stored_omap` field in `ceph df detail` JSON output is available in Ceph Reef (18.x) and later. Older versions may not include this field. The post could benefit from noting version requirements.
- In a Rook/Kubernetes environment, `ceph daemon osd.X` commands require exec-ing into the OSD pod, since admin sockets are not accessible from outside the container. The post doesn't mention this Rook-specific caveat.
- The summary script's quota filtering logic (`grep -qv "N/A"`) is fragile — it works but could give false positives if pool names contain "N/A". A JSON-based approach would be more robust but this is a minor concern.
