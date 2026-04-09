# Validation Summary: How to Calculate Erasure Coding Overhead Factor

## Status
validated

## Post Type
Reference / Capacity Planning Guide

## Technologies Covered
- Ceph (erasure coding, BlueStore, OSD management)
- Rook (Ceph operator for Kubernetes)
- Python (calculation examples)
- RADOS (Ceph object store CLI)

## Sources Consulted
- Ceph official documentation on erasure coding: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Ceph official documentation on `ceph df`: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph official documentation on `rados df` vs `ceph osd pool stats`: https://docs.ceph.com/en/latest/man/8/rados/
- Ceph erasure coding profile configuration: https://docs.ceph.com/en/latest/rados/operations/erasure-code-profile/

## Issues Found
1. **Incorrect command for per-pool storage comparison**: The post used `ceph osd pool stats myecpool` with the comment "compare stored vs raw used." However, `ceph osd pool stats` displays I/O rate statistics (client reads/writes, recovery rates), not storage utilization. Replaced with `rados df`, which correctly shows per-pool `STORED` vs `USED` columns for comparing logical data to raw usage. Also updated the description from the outdated `kb_used`/`stored` field names to the current `STORED`/`USED` column names used in modern Ceph output.

## Review Notes
- All mathematical calculations in the overhead factor table, Python code output, and capacity budget examples were independently verified and are correct.
- The overhead factor formula `(k+m)/k` is the standard and correct formula for erasure coding storage overhead.
- The 6+2 profile overhead is shown as 1.33x (rounded from 1.3333...) throughout the post, which introduces a minor rounding artifact in the capacity budget section (80/1.33 = 60.2 TiB vs exact 80/(8/6) = 60.0 TiB). This is consistent within the post and acceptable for a practical guide.
- The 5-10% practical overhead margin recommendation is reasonable and aligns with real-world Ceph deployment guidance.
- The minimum OSD requirement of k+m is correct per Ceph documentation.
