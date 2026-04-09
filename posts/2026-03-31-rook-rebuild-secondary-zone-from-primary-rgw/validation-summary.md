# Validation Summary: How to Rebuild Secondary Zone from Primary in Ceph RGW

## Status
validated

## Post Type
Tutorial / Disaster Recovery Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- Ceph Multisite (realm, zonegroup, zone, period)
- radosgw-admin CLI
- Rook (tagged, though commands are generic Ceph CLI)

## Sources Consulted
- Ceph official documentation: radosgw-admin man page (`doc/man/8/radosgw-admin.rst`)
- Ceph Multisite Configuration documentation (docs.ceph.com — RGW multisite setup guide)
- Ceph source code references for `bucket sync run` and `bucket sync status` subcommands

## Issues Found

### 1. Broken bucket list parsing in "Estimating Rebuild Time" section
- **What was wrong:** `radosgw-admin bucket list` outputs a JSON array (e.g., `["bucket1", "bucket2"]`), not plain text with one bucket per line. Piping this directly into `while read b` would feed JSON syntax characters (`[`, `"bucket1",`, `]`) as the bucket name argument, causing every `bucket stats` call to fail.
- **What was changed:** Added a `python3 -c "import sys,json; [print(b) for b in json.load(sys.stdin)]"` step to parse the JSON array into one bucket name per line before piping to the `while read` loop. Also quoted `$b` as `"$b"` to handle bucket names with spaces.
- **Why:** Without JSON parsing, the estimation script would produce no output or errors for every bucket.

### 2. Premature sync completion detection in "Verify Rebuild Completion" section
- **What was wrong:** The script used `grep "caught up"` on `radosgw-admin sync status` output to determine if sync was complete. However, the sync status output contains separate lines for metadata sync and data sync. Metadata sync completes much faster than data sync. The original `grep` would match as soon as metadata reported "caught up", causing the script to declare success while data sync was still running.
- **What was changed:** Changed the check to count the number of "caught up" lines (`grep -c "caught up"`) and require at least 2 matches (one for metadata, one for data) before declaring completion. Added progress feedback showing how many of the 2 sync types are caught up.
- **Why:** The original check could lead operators to believe the secondary zone was fully rebuilt when only metadata had synced, with data still in progress.

## Review Notes
- The post is tagged with "Rook" but all commands are generic `radosgw-admin` CLI commands and `systemctl` restarts, which apply to non-containerized Ceph deployments. In a Rook-managed cluster, `radosgw-admin` commands would be run inside the Rook toolbox pod, and the `systemctl restart` in Step 3 would instead be a pod restart (e.g., `kubectl delete pod -l app=rook-ceph-rgw`). This is not incorrect per se, but readers using Rook should be aware of the difference.
- `bucket sync run` and `bucket sync status` are valid commands in the Ceph source code but are not documented in the official `radosgw-admin` man page. They work in practice but may not appear in `--help` output on all Ceph versions.
- The `--source-zone` flag on `metadata sync init` may be unnecessary since metadata sync always targets the master zone, but passing it does not cause an error.
