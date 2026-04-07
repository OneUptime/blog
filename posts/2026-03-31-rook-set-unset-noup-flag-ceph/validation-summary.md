# Validation Summary: How to Set and Unset the noup Flag in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (OSD management, cluster flags)
- Rook (referenced via tags)
- systemd (ceph-osd service management)

## Sources Consulted
- Ceph official documentation on OSD flags and cluster management
- Ceph CLI reference for `ceph osd set`, `ceph osd unset`, `ceph osd dump`
- Ceph documentation on per-OSD flags (`add-noup`, `rm-noup`)
- Ceph architecture documentation on PG mapping via CRUSH

## Issues Found

1. **Incorrect claim about PG assignment (line 15):** The post stated "no PGs are assigned to it" when noup is set. This is inaccurate — PG assignment is determined by CRUSH and the OSD's `in`/`out` state, not its `up`/`down` state. An OSD that is `down` but `in` still has PGs mapped to it; it simply cannot actively serve them. Fixed to: "the OSD will not actively serve PGs or handle any client I/O, even though PGs may still be mapped to it via CRUSH."

2. **Non-existent `ceph osd up` command (line 71):** The post claimed you could run `ceph osd up osd.3` to manually mark an OSD as up while noup is set. This command does not exist in Ceph. OSDs transition to `up` only when their daemon reports to the monitors; there is no manual override. Rewrote the section to explain the correct approach: temporarily unsetting the global noup flag, letting the target OSD come up, then re-setting it. Also noted the per-OSD `add-noup`/`rm-noup` commands and clarified they only add restrictions and do not override the global flag.

## Review Notes
- All other commands (`ceph osd set noup`, `ceph osd unset noup`, `ceph osd dump`, `ceph osd stat`, `ceph osd tree`, `ceph osd set noout`, `ceph osd set noin`) are correct and current.
- The use cases described (controlled cluster startup, network maintenance) are valid and well-explained.
- The recommendation to combine `noup`, `noout`, and `noin` during full cluster restarts is a well-known best practice.
