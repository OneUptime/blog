# Validation Summary: How to Diagnose the Top 10 Most Common Ceph Issues

## Status
validated

## Post Type
Troubleshooting Guide / Reference

## Technologies Covered
- Ceph (OSD, MON, MDS, RBD, CephFS, PG management)
- Rook (implied by tags)
- systemd (service management)
- NTP (time synchronization)
- iostat (disk I/O diagnostics)

## Sources Consulted
- Ceph official documentation for `ceph osd pool get-quota` vs `ceph osd pool get` — https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph official documentation for `ceph auth` capabilities — https://docs.ceph.com/en/latest/rados/operations/user-management/
- Ceph official documentation for `client.admin` default capabilities — https://docs.ceph.com/en/latest/rados/operations/user-management/#user-capabilities
- Ceph official documentation for PG management — https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph official documentation for MON troubleshooting — https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-mon/
- Other validated posts in this blog repository for consistency cross-referencing

## Issues Found
1. **Section 9 — Incorrect pool quota command**: `ceph osd pool get POOL quota` is not a valid Ceph command. The `get` subcommand accepts pool properties like `size`, `pg_num`, etc., but `quota` is not a recognized parameter. Changed to `ceph osd pool get-quota POOL`, which is the correct dedicated subcommand for retrieving pool quota settings.

2. **Section 7 — Missing MDS capability in client.admin keyring**: The `ceph auth get-or-create client.admin` command was missing `mds "allow *"`. The standard `client.admin` keyring requires capabilities for all four daemon types: `mon`, `osd`, `mgr`, and `mds`. Without MDS capabilities, CephFS operations would fail with permission errors. Added `mds "allow *"` to the command.

## Review Notes
- The quorum explanation in Section 5 ("If fewer than half the MONs are responding, quorum is lost") is technically correct for odd-numbered MON deployments (which Ceph recommends), though the more precise statement would be "If a majority of MONs are not responding." Since Ceph best practices mandate odd numbers of MONs, the current phrasing is acceptable.
- The `set-full-ratio 0.97` in Section 2 is a valid but risky emergency measure. The post correctly labels it as temporary, which is appropriate.
- The comment `# 100 GB` in Section 9 for the value 107374182400 is technically 100 GiB (gibibytes), but using GB colloquially for GiB is standard practice in storage contexts.
- All other commands (`ceph osd tree`, `ceph pg stat`, `ceph pg dump_stuck`, `ceph daemon osd.N dump_ops_in_flight`, `ceph quorum_status`, `rbd lock list`, `rbd lock remove`, `ceph tell mds.*`, etc.) are syntactically correct and appropriate for their described diagnostic purposes.
