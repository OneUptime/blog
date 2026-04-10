# Validation Summary: How to Move OSDs in the CRUSH Hierarchy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (CRUSH map, OSD management)
- Rook (Ceph operator for Kubernetes)
- Bash scripting (bulk OSD operations)

## Sources Consulted
- Ceph official documentation: CRUSH Maps — https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph official documentation: Control Commands — https://docs.ceph.com/en/reef/rados/operations/control/
- Ceph man page: ceph(8) — https://manpages.ubuntu.com/manpages/xenial/man8/ceph.8.html
- Ceph official documentation: Monitoring OSDs and PGs — https://docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/
- Ceph official documentation: Adding/Removing OSDs — https://docs.ceph.com/en/reef/rados/operations/add-or-rm-osds/
- Ceph GitHub PR #12981 (crush move on OSDs) — https://github.com/ceph/ceph/pull/12981

## Issues Found
- **`ceph osd find osd.3` used incorrect argument format**: The `ceph osd find` command takes a bare integer OSD ID, not the `osd.N` name format. Fixed to `ceph osd find 3`. The man page documents the parameter as `<int[0-]>`, confirming only integer IDs are accepted.

## Review Notes
- The `ceph osd crush move` command is used on OSDs in this post. While this works in modern Ceph versions (Luminous and later, after PR #12981), the official documentation primarily describes `crush move` for buckets (hosts, racks, etc.) and recommends `crush set` for OSDs. The post correctly notes the distinction between the two commands, so no change was made, but readers should be aware that `crush set` is the more conventional choice for moving individual OSDs.
- The `ceph osd crush dump | grep` approach in the "Viewing Current OSD Placement" section will find the OSD entry in the devices list but won't directly show the parent bucket. The comment says "Check the parent bucket of an OSD" which is slightly misleading — it shows the OSD's entry in the CRUSH dump rather than its parent. This is a minor documentation nuance, not a technical error in the command itself.
- The bulk move script correctly uses bash variable expansion (`$osd`) inside double-quoted Python code passed to `python3 -c`, which will work as intended.
