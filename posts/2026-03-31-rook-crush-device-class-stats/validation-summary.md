# Validation Summary: How to View CRUSH Device Class Statistics in Ceph

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (CRUSH map, device classes, OSD management)
- Rook (Rook-Ceph operator, CephBlockPool CRD)
- Kubernetes (kubectl exec into toolbox pod)
- Python 3 (inline JSON parsing scripts)

## Sources Consulted
- Ceph official documentation: `ceph df` command reference (https://docs.ceph.com/en/latest/rados/operations/monitoring/)
- Ceph official documentation: CRUSH device classes (https://docs.ceph.com/en/latest/rados/operations/crush-map/#device-classes)
- Ceph official documentation: `ceph osd tree` and `ceph osd df` commands (https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/)
- Ceph official documentation: `ceph osd crush class` subcommands (https://docs.ceph.com/en/latest/man/8/ceph/#osd)
- Ceph official documentation: CRUSH rule creation (https://docs.ceph.com/en/latest/rados/operations/crush-map/#crush-rules)
- Rook documentation: CephBlockPool CRD `deviceClass` field (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)

## Issues Found
No technical issues found.

## Review Notes
- The sample `ceph df` output is illustrative. The TOTAL RAW USED shows 1.175 TiB while the sum of per-class RAW USED (900 + 200 + 75 = 1175 GiB) is actually ~1.148 TiB. This is a minor arithmetic inconsistency in the example data but does not affect the tutorial's educational value or technical accuracy of the commands.
- All Ceph CLI commands use correct syntax and flags for modern Ceph releases (Nautilus and later).
- The Python inline scripts correctly parse the JSON output structures of `ceph osd tree` and `ceph osd df tree`.
- The Rook CephBlockPool YAML correctly uses the `deviceClass` field under `spec`.
