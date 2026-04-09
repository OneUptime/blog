# Validation Summary: How to Dump CephFS Filesystem Info

## Status
validated

## Post Type
Reference / Diagnostic Guide

## Technologies Covered
- Ceph (CephFS, FSMap, MDS)
- Rook (Rook toolbox for running Ceph commands in Kubernetes)
- kubectl
- jq (for JSON parsing)

## Sources Consulted
- Ceph official documentation on `ceph fs dump`: https://docs.ceph.com/en/latest/cephfs/administration/
- Ceph official documentation on CephFS MDS: https://docs.ceph.com/en/latest/cephfs/mds-states/
- Ceph CLI reference for filesystem commands: https://docs.ceph.com/en/latest/man/8/ceph/
- Rook toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- CephFS feature bit definitions in Ceph source code (src/mds/cephfs_features.h)

## Issues Found
No technical issues found.

## Review Notes
- All commands (`ceph fs dump`, `ceph fs get`, `ceph mds stat`, `ceph fs dump --format json-pretty`) are correct and current.
- The sample text and JSON output structures accurately reflect real `ceph fs dump` output, including correct field names and reasonable default values (session_timeout=60, session_autoclose=300, max_file_size=1TB).
- The CephFS incompat feature list (with feature 7 correctly absent) matches the known feature bit definitions.
- The `inline_data` field is shown as "disabled" which is correct; inline data has been deprecated in newer Ceph releases (Reef+) but the field still appears in the dump output and the post's description is accurate.
- `ceph mds stat` still works in current Ceph versions, though `ceph fs status` is the more commonly recommended command for detailed MDS status. The post uses `ceph mds stat` appropriately as a quick cross-reference tool.
