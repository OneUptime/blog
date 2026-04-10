# Validation Summary: How to Add, Move, Rename, and Remove Buckets in CRUSH

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (CRUSH map management)
- Rook (Ceph orchestration on Kubernetes)
- CRUSH (Controlled Replication Under Scalable Hashing)
- crushtool (CRUSH map compilation/decompilation utility)

## Sources Consulted
- Ceph official documentation: CRUSH Maps — https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph official documentation: Manually editing the CRUSH Map — https://docs.ceph.com/en/reef/rados/operations/crush-map-edits/
- Ceph official documentation: ceph administration tool man page — https://docs.ceph.com/en/reef/man/8/ceph/
- Ceph PR #12981: make 'osd crush move ...' work on osds — https://github.com/ceph/ceph/pull/12981
- Ceph PR #2732: ceph osd crush rename-bucket — https://github.com/ceph/ceph/pull/2732
- Ceph Feature #9526: mon: 'osd crush rename-bucket' — https://tracker.ceph.com/issues/9526

## Issues Found

1. **`ceph osd crush move osd.8 host=node-05` — wrong command for OSDs.** While `crush move` works on OSDs in modern Ceph (Luminous+), the standard and recommended command for placing OSDs is `ceph osd crush set`. Changed to `ceph osd crush set osd.8 1.0 host=node-05` with a comment noting it is the preferred method for OSDs.

2. **`ceph osd find osd.8` — incorrect syntax.** The `ceph osd find` command expects a bare integer OSD ID, not the `osd.N` format. The man page documents the parameter as `<int[0-]>`. Changed to `ceph osd find 8`.

3. **Renaming section only showed the manual export/edit/reimport workflow.** Ceph provides `ceph osd crush rename-bucket <old-name> <new-name>` as a direct, single-command method for renaming buckets (available since Luminous 12.x). Updated the section to show `rename-bucket` as the preferred method, keeping the manual CRUSH map edit approach as a fallback for complex multi-edit scenarios.

4. **Summary paragraph referenced "manual CRUSH map edits to rename".** Updated to reference `ceph osd crush rename-bucket` instead, matching the corrected renaming section.

## Review Notes
- The `sed -i` command in the manual rename approach uses GNU sed syntax. On macOS, `sed -i ''` (with empty string argument) is required instead. This is a minor portability note but not changed since the blog targets Linux/Ceph server environments.
- The bulk hierarchy rebuild script is correct and functional. Variable quoting could be improved (e.g., `"$RACK"` instead of `$RACK`) but this is a style preference, not a bug, for the simple values used.
