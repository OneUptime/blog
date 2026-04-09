# Validation Summary: How to Monitor Compression Ratios Per Pool in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- BlueStore compression (`compress_bytes_used`, `compress_under_bytes`)
- Ceph CLI tools (`ceph df detail`, `ceph osd pool stats`, `rados df`)
- Prometheus / PromQL (Ceph mgr prometheus module metrics)
- Grafana (dashboard visualization)
- jq (JSON processing)
- Bash scripting

## Sources Consulted
- Ceph official documentation on `ceph df detail` and pool statistics (https://docs.ceph.com/en/latest/rados/operations/monitoring/)
- Ceph official documentation on BlueStore compression (https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/#inline-compression)
- Ceph `ceph osd pool stats` command behavior and output format
- Ceph `rados` CLI reference — `rados stat` vs `rados df` usage (https://docs.ceph.com/en/latest/man/8/rados/)
- Ceph Prometheus module metric names (https://docs.ceph.com/en/latest/mgr/prometheus/)

## Issues Found

### Issue 1: Incorrect `ceph osd pool stats` output
- **What was wrong:** The example output for `ceph osd pool stats mypool` included `compress_bytes_used` and `compress_under_bytes` fields. This command only shows real-time I/O stats (client throughput, IOPS, recovery rates), not cumulative compression statistics. The compression stats are available through `ceph df detail`, not `ceph osd pool stats`.
- **What was changed:** Removed the fabricated compression fields from the output, corrected the example to show only I/O stats, and added a note directing readers to use `ceph df detail` for compression-specific statistics.

### Issue 2: Incorrect `rados stat` command
- **What was wrong:** The command `rados -p mypool stat` was presented as a way to get pool-level statistics. However, `rados stat` requires an object name argument (`rados -p <pool> stat <object>`) and operates on individual objects, not pools. It cannot be used for pool-level statistics.
- **What was changed:** Replaced `rados -p mypool stat` with `rados df`, which is the correct command for viewing per-pool usage statistics. Updated the section heading from "Using rados Pool Stats" to "Using rados df" and added a brief description of what the command shows.

## Review Notes
- The Prometheus metrics section uses a `bash` code block for PromQL expressions. This is cosmetic and doesn't affect correctness, but `promql` or `text` would be more semantically accurate.
- The PromQL expression `ceph_pool_compress_under_bytes / ceph_pool_compress_bytes_used` could produce NaN/Infinity if `compress_bytes_used` is 0. A more robust query would use `ceph_pool_compress_under_bytes / (ceph_pool_compress_bytes_used > 0)` to filter out zero-value denominators. This is an improvement opportunity rather than an error.
- The `ceph df detail` column names shown in the text output (`COMPRESS_UNDER_BYTES`, `COMPRESS_BYTES_USED`) may vary slightly between Ceph versions; the JSON field names (`.stats.compress_under_bytes`, `.stats.compress_bytes_used`) used in the scripts are the stable, authoritative references.
- All other commands, JSON paths, Prometheus metric names, jq expressions, and technical explanations are accurate.
