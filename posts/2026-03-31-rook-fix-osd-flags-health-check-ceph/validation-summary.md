# Validation Summary: How to Fix OSD_FLAGS Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- OSD (Object Storage Daemon) management
- Kubernetes (kubectl for Rook toolbox access)

## Sources Consulted
- Ceph official test suite (`qa/workunits/cephtool/test.sh`) — authoritative reference for correct CLI syntax: https://github.com/ceph/ceph/blob/main/qa/workunits/cephtool/test.sh
- Ceph PR #27735 — introduced `set-group`/`unset-group` per-OSD flag commands in Nautilus: https://github.com/ceph/ceph/pull/27735
- Ceph Troubleshooting OSDs documentation: https://docs.ceph.com/en/reef/rados/troubleshooting/troubleshooting-osd/
- 42on blog — Setting noout flag per Ceph OSD: https://42on.com/setting-noout-flag-per-ceph-osd/
- Clyso docs — ceph osd set-group reference: https://docs.clyso.com/blog/ceph-osd-set-group/

## Issues Found

### Issue 1: Non-existent command `ceph osd rm-flag`
- **What was wrong:** The post used `ceph osd rm-flag <osd-id> <flag>` throughout (lines 62, 65, 75, 97, 124, 129). This command does not exist in any version of Ceph.
- **What was changed:** Replaced all instances with the correct commands: `ceph osd rm-noup osd.<id>` (dedicated per-flag command, available since Luminous) and `ceph osd unset-group <flags> osd.<id>` (available since Nautilus).
- **Why:** Using the incorrect command would cause a CLI error and prevent users from actually resolving the OSD_FLAGS health warning.

### Issue 2: Non-existent command `ceph osd unset-flag`
- **What was wrong:** The post presented `ceph osd unset-flag osd.3 noup` as "older syntax" (line 69). This command does not exist in Ceph.
- **What was changed:** Replaced with `ceph osd unset-group noup,nodown osd.3` and relabeled as the Nautilus+ syntax for clearing multiple flags at once.
- **Why:** The command would fail. The actual alternative syntax is `unset-group`, not `unset-flag`.

### Issue 3: Bulk loop used incorrect command
- **What was wrong:** The for-loop used `ceph osd rm-flag $osd noup` with bare numeric OSD IDs.
- **What was changed:** Changed to `ceph osd rm-noup osd.$osd` with proper OSD identifier format.
- **Why:** Correct command syntax requires the `rm-noup` form with `osd.<id>` identifier.

### Issue 4: awk script used GNU-specific features and had a flawed regex
- **What was wrong:** The bulk flag check script used `match($0, /flags ([^,]+)/, arr)` which relies on GNU awk's third-argument capture group feature (not POSIX-compatible). Additionally, the regex `[^,]+` only captured the first flag before a comma, missing subsequent flags.
- **What was changed:** Rewrote using POSIX-compatible `match()` with `substr()` and a regex that captures the full comma-separated flag list.
- **Why:** The original script would fail on systems with non-GNU awk (e.g., macOS) and would only display the first flag even when multiple flags were set.

## Review Notes
- The `noscrub` and `nodeep-scrub` flags listed in the per-OSD flags table are more commonly set at the cluster-wide or pool level. They can appear per-OSD via `set-group`/`unset-group` in newer Ceph versions, but the dedicated `add-noscrub`/`rm-noscrub` commands may not exist in all versions. The table is left as-is since these flags can trigger OSD_FLAGS warnings.
- The post could benefit from mentioning the `ceph osd set-group`/`unset-group` commands more prominently, as they are the preferred modern approach for managing per-OSD flags since Nautilus.
- The `ceph osd dump` output format can vary between Ceph versions; the grep-based inspection commands shown should work across versions but users should be aware of minor formatting differences.
