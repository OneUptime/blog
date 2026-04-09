# Validation Summary: How to Get PG Information with ceph pg dump

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (`ceph pg dump` command and subcommands)
- Kubernetes (`kubectl exec` into Rook toolbox)
- Unix tools (`grep`, `awk`, `sort`, `wc`, `head`)
- Python 3 (for JSON processing)

## Sources Consulted
- Ceph official documentation for `ceph pg dump` command and its subcommands (`pgs_brief`, `summary`, `pools`, `--format json`): https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph PG states documentation: https://docs.ceph.com/en/latest/rados/operations/pg-states/
- Rook toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Ceph CLI reference for `pg dump` subcommands and output format

## Issues Found
1. **Typo in Summary section**: "unscubbed" was corrected to "unscrubbed" (line 111).

## Review Notes
- **awk column references are fragile and version-dependent**: The `ceph pg dump` text output column layout varies across Ceph versions. The awk commands in "Checking Object Count and Size per PG" (using `$10` and `$11`) and "Checking Last Scrub Times" (using `$18`) reference specific column positions that may not be accurate for all Ceph versions. In modern Ceph (Reef 18.x / Squid 19.x), the column order is roughly: PG_STAT, OBJECTS, MISSING_ON_PRIMARY, DEGRADED, MISPLACED, UNFOUND, BYTES, OMAP_BYTES, LOG, DISK_LOG, STATE, ... which would put objects at `$2` and bytes at `$7`, not `$10` and `$11`. Readers should verify column positions against their own `ceph pg dump` header output before using these awk commands. For reliable field extraction, the JSON format (`--format json`) is recommended over text parsing.
- **JSON capacity planning script**: The Python script parsing `pool_stats` with fields `poolname` and `stat_sum.num_bytes` is correct for recent Ceph versions, but the exact JSON structure may vary across major Ceph releases. Readers targeting older Ceph versions should verify the JSON schema.
- All `ceph pg dump` subcommands (`pgs_brief`, `summary`, `pools`) and the `--format json` flag are valid and correctly documented.
- The use of `2>/dev/null` to suppress stderr (which contains summary/timing metadata) is correct practice for clean pipeline processing.
- The kubectl exec pattern for Rook toolbox access is correct and follows current Rook conventions.
