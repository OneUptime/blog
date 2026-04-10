# Validation Summary: How to Understand Shadow CRUSH Hierarchies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (CRUSH map, device classes, shadow hierarchies)
- Rook (Ceph orchestration on Kubernetes)
- CRUSH algorithm (placement rules, bucket trees)

## Sources Consulted
- Ceph official documentation: CRUSH Maps - https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph official documentation: Manually editing the CRUSH Map - https://docs.ceph.com/en/latest/rados/operations/crush-map-edits/
- Ceph source code: MonCommands.h (command signature definitions) - https://github.com/ceph/ceph/blob/main/src/mon/MonCommands.h
- Ceph source code: CrushWrapper.cc (shadow bucket implementation) - https://github.com/ceph/ceph/blob/main/src/crush/CrushWrapper.cc
- Ceph blog: New in Luminous: CRUSH device classes - https://ceph.io/community/new-luminous-crush-device-classes/
- Ceph PR #16016: crush, mon: include device class in tree view
- Ceph QA test suite: crush_ops.sh

## Issues Found

### 1. Incorrect command: `ceph osd tree --show-shadow`
**What was wrong:** The post listed `ceph osd tree --show-shadow` as a way to view shadow hierarchies. The `--show-shadow` flag is only available on `ceph osd crush tree`, not on `ceph osd tree`. The `osd tree` command does not accept this parameter (confirmed via MonCommands.h).
**What was changed:** Removed the `ceph osd tree --show-shadow` line, keeping only the correct `ceph osd crush tree --show-shadow` command.

### 2. Incorrect command: `ceph osd crush rm-device-class ssd`
**What was wrong:** The post showed `ceph osd crush rm-device-class ssd` as a way to remove a device class from all OSDs. This command takes OSD IDs as arguments, not a class name. Passing a bare class name like `ssd` would fail or be misinterpreted.
**What was changed:** Replaced the incorrect command with the correct syntax using OSD IDs (`ceph osd crush rm-device-class osd.2`), and added a one-liner showing how to remove a class from all OSDs by combining with `ceph osd crush class ls-osd ssd`.

### 3. Misleading description of shadow bucket IDs
**What was wrong:** The post stated shadow buckets use "large negative IDs". All CRUSH buckets (regular and shadow) use negative IDs - this is a fundamental CRUSH convention. Shadow bucket IDs are dynamically allocated and not guaranteed to be "large" or in any specific range.
**What was changed:** Removed the word "large" from the description, changing it to "Shadow buckets use negative IDs (like -100, -101)".

## Review Notes
- The CRUSH rule example omits `min_size` and `max_size` fields, which is correct for modern Ceph versions (Reef and later). Older documentation may show these fields but they are no longer part of the CRUSH rule definition.
- The auto-detection path `/sys/block/sdX/queue/rotational` is correct. Ceph uses this to distinguish HDD (value 1) from SSD/NVMe (value 0), with NVMe further distinguished by device name/transport type.
- The overall explanation of shadow hierarchies, their naming convention, and how CRUSH rules resolve `class` keywords is accurate and well-presented.
