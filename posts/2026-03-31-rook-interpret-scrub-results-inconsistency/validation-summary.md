# Validation Summary: How to Interpret Scrub Results and Inconsistency Reports

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (scrubbing, PG management, data integrity)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl commands for Rook toolbox access)
- RADOS (Ceph's reliable autonomic distributed object store)

## Sources Consulted
- Ceph official documentation: Repairing PG Inconsistencies (https://docs.ceph.com/en/pacific/rados/operations/pg-repair/)
- Ceph official documentation: Troubleshooting PGs (https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-pg/)
- Red Hat: Unsafe Inconsistent PG, not safe to run pg repair (https://access.redhat.com/solutions/1462213)
- Red Hat: How to handle Inconsistent Placement Groups in Ceph (https://access.redhat.com/solutions/1589113)
- Ceph PG query JSON output structure (Ceph source code and documentation)
- Ceph `rados list-inconsistent-obj` command documentation

## Issues Found

### Issue 1: Incorrect JSON field in Python parsing script (Severity: High)
**What was wrong:** The "Parsing the Scrub Report Structure" section contained a Python script that parsed `ceph pg query` output using `data.get("peer_stat", {})`. The field `peer_stat` does not exist in `ceph pg query` output. The `ceph pg query` command returns PG state information (acting/up sets, recovery state, scrubber status) but does not contain per-object inconsistency details.

**What was changed:** Replaced the entire code block with the correct commands: `rados list-inconsistent-pg <pool>` to find inconsistent PGs in a pool, and `rados list-inconsistent-obj <pgid>` to get detailed per-object inconsistency information. These are the correct Ceph commands for this purpose.

### Issue 2: Dangerous advice about `ceph pg repair` in summary (Severity: High)
**What was wrong:** The summary stated "When in doubt, use `ceph pg repair` to let Ceph resolve conflicts using its authoritative copy selection logic." This is dangerous advice. Per official Ceph documentation, `ceph pg repair` copies the primary OSD's data to other replicas. If the primary holds corrupted data, repair will propagate that corruption to all replicas. Red Hat documentation explicitly warns against running repair for digest mismatch errors.

**What was changed:** Replaced the recommendation with a warning about the risks of `ceph pg repair`, noting that it copies the primary's data and can propagate corruption. Added guidance to inspect inconsistency details and consider backing up affected objects before running repair.

### Issue 3: Incorrect tool reference in summary
**What was wrong:** The summary recommended using `ceph pg query` for "detailed JSON reports" about inconsistencies. While `ceph pg query` provides PG state information, per-object inconsistency details come from `rados list-inconsistent-obj`.

**What was changed:** Updated the summary to reference `rados list-inconsistent-obj` as the correct command for detailed per-object inconsistency reports.

## Review Notes
- The `ceph health detail` sample output format is slightly simplified compared to modern Ceph (Nautilus+), which uses `[ERR]`/`[WRN]` prefixes. This is acceptable as sample output but readers on newer Ceph versions will see slightly different formatting.
- The statement "The primary OSD is usually considered authoritative" in the "Identifying Authoritative vs. Inconsistent Copies" section is a simplification. When checksums are available, Ceph uses digest comparison to select the authoritative copy. The primary is only favored as a fallback when checksums are unavailable. This simplification is acceptable for the blog's scope but could be expanded for advanced audiences.
- The inconsistency types table is accurate and covers the main error types reported by Ceph scrub.
- All kubectl commands correctly target the `rook-ceph` namespace and the `rook-ceph-tools` deployment, which is standard for Rook clusters.
