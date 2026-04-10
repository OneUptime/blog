# Validation Summary: How to Create Ceph Operational Checklists

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl CLI)
- Bash scripting

## Sources Consulted
- Ceph official documentation: `ceph df` output format (https://docs.ceph.com/en/latest/rados/operations/monitoring/)
- Ceph official documentation: `ceph pg dump_stuck` subcommands (https://docs.ceph.com/en/latest/rados/operations/placement-groups/)
- Ceph official documentation: `ceph health detail` slow request reporting (https://docs.ceph.com/en/latest/rados/operations/health-checks/)
- Ceph official documentation: `ceph osd pool stats` output fields (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Rook documentation: toolbox deployment pattern (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)

## Issues Found

1. **Incorrect awk regex for `ceph df` filtering (line 43)**: The awk pattern `/[7-9][0-9]\.[0-9]+%|100\./` included a `%` character after the digit pattern. The `ceph df` output displays percentage values as plain numbers (e.g., `75.23`) without a `%` suffix — the `%` only appears in column headers like `%USED`. Removed the `%` from the regex so the pattern correctly matches high-usage values.

2. **Mislabeled check: "Scrub Errors" using `ceph pg dump_stuck` (lines 47-48)**: The command `ceph pg dump_stuck` shows stuck placement groups (stale, inactive, unclean), not scrub errors. Changed the label from "Scrub Errors" to "Stuck Placement Groups" and added the `unclean` subcommand for clarity.

3. **Wrong command for slow requests in daily health script (lines 52-53)**: `ceph osd pool stats` reports per-pool I/O rates and recovery statistics — it does not report slow requests. Slow requests are reported by `ceph health detail` (e.g., "N slow requests are blocked > 32 sec"). Changed to `ceph health detail | grep -i "slow requests"`.

4. **Wrong command for slow requests in pre-maintenance checklist (line 71)**: Same issue as above — the checklist referenced `ceph osd pool stats` for checking slow requests. Changed to `ceph health detail`.

## Review Notes
- The "40% free disk space" recommendation in the upgrade readiness checklist is a reasonable operational guideline, though Ceph's built-in thresholds are `nearfull_ratio` (default 0.85) and `full_ratio` (default 0.95). The more conservative 40%-free target gives good headroom for data rebalancing during upgrades.
- The `ceph pg dump_stuck` command without a subcommand defaults to showing `inactive` PGs. The fix explicitly uses `unclean` which is more broadly useful for daily health checks as it catches degraded, undersized, and stale PGs.
- The daily health check script runs `ceph health detail` twice after the fix (once for cluster health, once for slow requests). This is harmless but could be optimized by parsing a single invocation.
