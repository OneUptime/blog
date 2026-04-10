# Validation Summary: How to Add and Manage Devices in CRUSH Maps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (CRUSH map, OSD management)
- Rook (Ceph operator for Kubernetes)
- crushtool (CRUSH map compile/decompile utility)
- Device classes (HDD, SSD, NVMe tiering)

## Sources Consulted
- [CRUSH Maps -- Ceph Documentation](https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- [Manually Editing the CRUSH Map -- Ceph Documentation](https://docs.ceph.com/en/latest/rados/operations/crush-map-edits/)
- [Adding/Removing OSDs -- Ceph Documentation](https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/)
- [crushtool man page -- Ceph Documentation](https://docs.ceph.com/en/latest/man/8/crushtool/)
- [ceph CLI man page -- Ceph Documentation](https://docs.ceph.com/en/reef/man/8/ceph/)
- [New in Luminous: CRUSH Device Classes -- Ceph Blog](https://ceph.io/en/news/blog/2017/new-luminous-crush-device-classes/)
- [Control Commands -- Ceph Documentation](https://docs.ceph.com/en/reef/rados/operations/control/)

## Issues Found
1. **`ceph osd stop osd.4` is not the recommended way to stop an OSD daemon.** While the command technically exists in the Ceph source code as an internal/undocumented monitor-level state flag, it is not listed in the official man page or documentation. All official Ceph documentation recommends `sudo systemctl stop ceph-osd@{osd-num}` for stopping OSD daemons. Changed `ceph osd stop osd.4` to `sudo systemctl stop ceph-osd@4` and updated the comment accordingly.

## Review Notes
- The CRUSH weight unit is technically tebibytes (TiB), not terabytes (TB), though the post's description of "1.0 = 1 TB" follows common Ceph community usage and the official docs also use TB in most places.
- In modern Ceph (Luminous+), `ceph osd purge` can replace the three-step removal sequence (`crush remove` + `auth del` + `osd rm`). The post's step-by-step approach is still valid and more educational, but readers should be aware of the simpler alternative.
- All other commands (`ceph osd crush add`, `ceph osd crush reweight`, `ceph osd crush set-device-class`, `ceph osd crush rm-device-class`, `ceph osd crush class ls`, `ceph osd crush class ls-osd`, `crushtool -d/-c`, `ceph osd getcrushmap`, `ceph osd setcrushmap`) are syntactically correct and match official documentation.
