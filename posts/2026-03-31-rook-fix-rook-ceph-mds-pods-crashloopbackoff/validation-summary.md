# Validation Summary: How to Fix Rook-Ceph MDS Pods CrashLoopBackOff

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook-Ceph (Kubernetes operator for Ceph)
- CephFS (Ceph Filesystem)
- Ceph MDS (Metadata Server)
- Kubernetes (kubectl CLI)
- cephfs-journal-tool (Ceph filesystem journal utility)
- cephfs-data-scan (Ceph filesystem metadata recovery utility)

## Sources Consulted
- Ceph official documentation on CephFS disaster recovery: https://docs.ceph.com/en/latest/cephfs/disaster-recovery/
- Ceph official documentation on MDS administration: https://docs.ceph.com/en/latest/cephfs/administration/
- Ceph official documentation on cephfs-journal-tool: https://docs.ceph.com/en/latest/man/8/cephfs-journal-tool/
- Ceph official documentation on cephfs-data-scan: https://docs.ceph.com/en/latest/man/8/cephfs-data-scan/
- Rook-Ceph documentation on CephFilesystem CRD: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Kubernetes documentation on kubectl commands for pod inspection

## Issues Found
1. **Invalid `ceph fs scrub` command in Common Cause 5**: The command `ceph fs scrub start myfs recursive` is not a valid Ceph CLI command. CephFS metadata scrub is initiated via `ceph tell mds.<daemon> scrub start <path> [recursive]`, which requires a running MDS daemon. Since this section addresses scenarios where MDS is crashing, an online scrub cannot be used. Replaced with `cephfs-data-scan` commands (`scan_extents`, `scan_inodes`, `scan_links`) which perform offline metadata recovery from the data pool — the correct approach when MDS cannot start.

2. **Logically inconsistent workflow in Common Cause 5**: The original workflow set `ceph fs set myfs joinable false` (preventing MDS from running) then attempted a scrub operation (which requires a running MDS). Replaced `ceph fs set myfs joinable false` with `ceph fs fail myfs` (the modern recommended command) and replaced the scrub with offline `cephfs-data-scan` recovery commands that work without a running MDS. The re-enable step (`ceph fs set myfs joinable true`) was kept as-is since it correctly re-enables MDS joining.

3. **Updated introductory text for Common Cause 5**: Changed "run a filesystem check" to "rebuild metadata from the data pool as a last resort" to accurately describe the severity and nature of the `cephfs-data-scan` operation.

## Review Notes
- The `cephfs-data-scan` commands used in the fix are a last-resort recovery mechanism that may lose directory hierarchy metadata. The WARNING comment in the code block conveys this, matching the post's positioning of Common Cause 5 as a final troubleshooting step.
- The data pool name `myfs-data0` follows Rook-Ceph's default naming convention for CephFilesystem data pools. Users with custom pool names will need to adjust accordingly.
- Both `cephfs-journal-tool` and `cephfs-data-scan` should be available in the Rook toolbox container as they are part of the standard Ceph packages.
- The `ceph mds fail myfs:0` command in Common Cause 2 correctly uses the `filesystem:rank` format introduced in Ceph Nautilus.
- The CephFilesystem CRD YAML snippets in Common Causes 3 and 4 use the correct Rook `ceph.rook.io/v1` API version and field names.
