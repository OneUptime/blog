# Validation Summary: How to View CRUSH Map Visualization for OSDs in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (CRUSH map, OSD tree, crush rules)
- Rook (Ceph operator for Kubernetes)
- kubectl (Kubernetes CLI)
- crushtool (Ceph CRUSH map decompiler)
- Python 3 (for JSON parsing)

## Sources Consulted
- Ceph official documentation on CRUSH maps: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph official documentation on CRUSH map editing: https://docs.ceph.com/en/latest/rados/operations/crush-map-edits/
- Ceph CLI reference for `osd crush rule`: https://docs.ceph.com/en/latest/man/8/ceph/#osd
- Rook documentation on Ceph toolbox: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Rook documentation on CephBlockPool and failure domains: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/

## Issues Found
1. **Incorrect sample output format for `ceph osd crush rule dump`**: The sample output showed the decompiled text format (as produced by `crushtool -d`), but `ceph osd crush rule dump` outputs JSON. Changed the sample output from text format to the correct JSON format with `rule_id`, `rule_name`, `type`, `min_size`, `max_size`, and `steps` fields. Also updated the explanation text to reference `chooseleaf_firstn` (the JSON field name) instead of `chooseleaf firstn 0 type host` (the decompiled text syntax).

## Review Notes
- The `crushtool -d` command on line 69 runs locally (after copying the binary out of the pod), which requires `ceph-common` or similar package to be installed on the local machine. This is a reasonable assumption for the target audience but could be noted.
- All other Ceph CLI commands (`ceph osd tree`, `ceph osd getcrushmap`, `ceph osd crush add-bucket`, `ceph osd crush move`, `ceph osd crush rule create-replicated`) use correct syntax and flags.
- The CRUSH acronym expansion ("Controlled Replication Under Scalable Hashing") is correct.
- The Python JSON parsing script correctly accesses the `nodes` array structure returned by `ceph osd tree --format json`.
- The `kubectl cp` command correctly extracts the pod name from `kubectl get pod -o name` output and strips the `pod/` prefix.
