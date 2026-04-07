# Validation Summary: How to Troubleshoot Ceph Placement Groups

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (Placement Groups, OSDs, scrubbing, backfill, recovery)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl exec, pod management)

## Sources Consulted
- Ceph official documentation: Placement Groups (https://docs.ceph.com/en/latest/rados/operations/placement-groups/)
- Ceph official documentation: Monitoring PGs (https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/)
- Ceph official documentation: PG States (https://docs.ceph.com/en/latest/rados/operations/pg-states/)
- Ceph CLI reference for `ceph pg`, `ceph osd` subcommands
- Rook Ceph Toolbox documentation (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)

## Issues Found
1. **`watch ceph status` used inside container exec** — The `watch` utility is not reliably available in the Rook Ceph toolbox container image. Replaced with `ceph -w`, which is a built-in Ceph CLI command that streams real-time cluster events and serves the same monitoring purpose.
2. **Misleading comment for `set-backfillfull-ratio`** — The inline comment said "Set backfill priority" but `ceph osd set-backfillfull-ratio` sets the OSD fullness threshold at which backfill operations are blocked, not a priority value. Updated the comment to accurately describe the command's purpose.

## Review Notes
- All 12 Ceph CLI commands verified as correct and current syntax.
- All 7 PG states in the table are accurate with correct descriptions.
- The kubectl commands use the standard Rook toolbox deployment pattern (`deploy/rook-ceph-tools`) which is correct.
- The post could benefit from mentioning `ceph pg dump_stuck undersized` as a fourth stuck state category, but this is not an error.
- The summary section references `ceph pg query` as a standalone command; the actual syntax used in the post (`ceph pg <pgid> query`) is correct in the code block, so this is a minor wording shorthand rather than an error.
