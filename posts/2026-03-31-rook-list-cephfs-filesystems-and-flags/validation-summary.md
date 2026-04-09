# Validation Summary: How to List CephFS Filesystems and Flags

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Ceph (CephFS, MDS, filesystem management)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl commands for Rook toolbox and CRDs)

## Sources Consulted
- Ceph source code `src/include/ceph_fs.h` on the reef branch (GitHub: ceph/ceph) for `CEPH_MDSMAP_*` flag constant definitions
- Ceph official documentation for `ceph fs ls`, `ceph fs status`, `ceph fs dump`, `ceph fs get` commands
- Rook documentation for `CephFilesystem` CRD and toolbox pod usage

## Issues Found

### 1. Filesystem flags table had incorrect flag-to-meaning mappings
**What was wrong:** The original table listed four flags with incorrect meanings:
- `0x1` was described as "Joinable (the filesystem is accepting clients)" — actually `CEPH_MDSMAP_NOT_JOINABLE` (inverted meaning, and refers to MDS daemons, not clients)
- `0x4` was described as "Allow standby replay" — actually a deprecated flag (was `ALLOW_MULTIMDS`)
- `0x8` was described as "Standby replay enabled" — actually a deprecated flag (was `ALLOW_DIRFRAGS`); the real standby replay flag is `0x20`
- `0x10` was described as "Enabled (filesystem is active)" — actually `CEPH_MDSMAP_ALLOW_MULTIMDS_SNAPS`

**What was changed:** Replaced the 4-row table with a complete 9-row table listing all `CEPH_MDSMAP_*` flags with correct bit positions, hex values, decimal values, official constant names, and descriptions sourced from `src/include/ceph_fs.h`. Added explanatory text about default flag values and the inverted meaning of `NOT_JOINABLE`.

### 2. Sample `ceph fs dump` output had unrealistic flags value
**What was wrong:** The sample output showed `flags 12` (decimal), which equals `0xC` = deprecated `ALLOW_MULTIMDS` + deprecated `ALLOW_DIRFRAGS` — not a realistic value for a Ceph Reef cluster.

**What was changed:** Updated to `flags 50` (decimal) = `0x32` = `ALLOW_SNAPS` (0x2) + `ALLOW_MULTIMDS_SNAPS` (0x10) + `ALLOW_STANDBY_REPLAY` (0x20), which is a realistic value for a reef cluster with standby replay enabled.

## Review Notes
- The `ceph fs status` sample output includes a "MDS version:" line at the bottom. This is not part of the standard `ceph fs status` output in all Ceph versions but does not constitute a technical error since sample outputs can vary by version and configuration.
- All CLI commands (`ceph fs ls`, `ceph fs status`, `ceph fs dump`, `ceph fs get`, `ceph fs ls --format json-pretty`) are valid and correctly documented.
- The kubectl commands for Rook toolbox access and CephFilesystem CRD listing are correct.
- The `session_timeout` (60s) and `session_autoclose` (300s) defaults shown in the dump sample are accurate for Ceph Reef.
