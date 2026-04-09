# Validation Summary: How to Migrate Ceph OSDs to New Disk Types

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Ceph (OSD management, CRUSH maps, device classes)
- Rook (CephCluster CRD, OSD provisioning)
- Kubernetes (kubectl, Rook operator)
- rados bench (performance benchmarking)

## Sources Consulted
- Ceph official documentation — Adding/Removing OSDs: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-osds/
- Ceph official documentation — CRUSH device classes: https://docs.ceph.com/en/latest/rados/operations/crush-map/#device-classes
- Ceph official documentation — Device management: https://docs.ceph.com/en/reef/rados/operations/devices/
- Ceph source code — MgrCommands.h (osd df command syntax): https://github.com/ceph/ceph/blob/main/src/mgr/MgrCommands.h
- Ceph source code — MonCommands.h (CRUSH rule syntax): https://github.com/ceph/ceph/blob/main/src/mon/MonCommands.h
- Ceph manpage (ceph.8) — osd purge behavior: https://manpages.debian.org/unstable/ceph-common/ceph.8.en.html
- Rook documentation — Ceph OSD Management: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-osd-mgmt/
- Ceph.io blog — New in Luminous: CRUSH device classes: https://ceph.io/en/news/blog/2017/new-luminous-crush-device-classes/

## Issues Found

1. **Invalid `ceph osd df` sort syntax**: `ceph osd df sort -k 10 -r` is not valid — `ceph osd df` has no built-in sort parameter. Changed to `ceph osd df | sort -k 10 -rn` (piped to shell sort).

2. **Wrong command for checking disk types**: `ceph device get-health-metrics osd.$osd` takes a device ID (vendor_model_serial format), not an OSD name like `osd.0`. Replaced with `ceph osd metadata osd.$osd` which correctly accepts OSD names and returns device info including device class.

3. **Missing `rm-device-class` before `set-device-class`**: `ceph osd crush set-device-class` fails if the OSD already has a device class assigned (which it will from auto-detection). Added `ceph osd crush rm-device-class osd.5` before the set command.

4. **Inconsistent device class in CRUSH rule**: The example adds an NVMe device (`nvme0n1`) but created a CRUSH rule targeting the `ssd` class. Since NVMe devices are auto-detected as `nvme`, changed the rule to `nvme-rule` targeting `nvme` class for consistency.

5. **Redundant commands after `ceph osd purge`**: `ceph auth del osd.0` and `ceph osd crush remove osd.0` were listed after `ceph osd purge`, but `purge` already removes auth keys, CRUSH entries, and the OSD map entry. Removed the redundant commands.

6. **Missing daemon stop step**: Added a comment about stopping the OSD daemon (in Rook, removing the device from the CephCluster CR) before running `ceph osd purge`, since purge does not stop the running daemon.

## Review Notes
- NVMe auto-detection as a separate `nvme` class was introduced in Ceph Luminous (v12.2.x), but there is a known caveat: when OSDs are provisioned via `ceph-volume` with LVM (default since Nautilus), NVMe devices may be misdetected as `ssd`. Users may still need manual reclassification in LVM-based deployments.
- In a Rook-managed cluster, the recommended way to remove OSDs is via the Rook purge-osd job (`kubectl rook-ceph rook purge-osd <ID> --force`) or by updating the CephCluster CRD, rather than manual `ceph osd purge`. The post uses manual CLI commands, which is acceptable for a general guide but worth noting.
- The `kubectl ... | grep new` command in Step 1 is a bit ambiguous — new OSD pods don't have "new" in their name. Users would need to know the expected OSD ID to grep for it. This is a minor readability issue, not a technical error.
