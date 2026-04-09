# Validation Summary: How to Find Which OSD Stores a Specific Object in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (RADOS, CRUSH map, BlueStore)
- Rook (Ceph operator for Kubernetes)
- OSD (Object Storage Daemon)
- RBD (RADOS Block Device)
- CephFS (Ceph Filesystem)
- ceph-objectstore-tool

## Sources Consulted
- Ceph official documentation on `ceph osd map`: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Ceph official documentation on `ceph osd find`: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph official documentation on `ceph-objectstore-tool`: https://docs.ceph.com/en/latest/man/8/ceph-objectstore-tool/
- Ceph RBD internals documentation (block_name_prefix and object naming): https://docs.ceph.com/en/latest/rbd/
- CephFS data object naming conventions: https://docs.ceph.com/en/latest/cephfs/

## Issues Found

### Issue 1: Incorrect claim about `ceph osd find` output
- **What was wrong:** The post stated that `ceph osd find` "returns the host name and data path." In reality, `ceph osd find` returns JSON containing the OSD ID, network address, OSD FSID, and CRUSH location (host, rack, root). It does not return a filesystem data path.
- **What was changed:** Updated the description to "Each returns JSON with the host name, network address, and CRUSH location."
- **Why:** Readers following the tutorial would expect to see a data path in the output and be confused when it isn't there.

### Issue 2: Missing prerequisite for `ceph-objectstore-tool`
- **What was wrong:** The post showed running `ceph-objectstore-tool` without mentioning that the OSD daemon must be stopped first. BlueStore takes an exclusive lock on the OSD data directory, so the tool will fail if the OSD is running.
- **What was changed:** Added a note that the OSD must be stopped, and included `systemctl stop ceph-osd@4` and `systemctl start ceph-osd@4` commands before and after the tool invocation.
- **Why:** Running `ceph-objectstore-tool` against a live OSD will fail with a lock error. This is a critical operational detail that could confuse readers or lead them to think the command is broken.

## Review Notes
- The hex conversion example for CephFS inode (12345678 → 0xbc614e) is mathematically correct.
- The `ceph osd map` output format shown is realistic and accurately demonstrates the PG mapping, up set, and acting set.
- The RBD object naming convention using `block_name_prefix` is correct.
- The scripting example for multiple objects is functional, though for large pools the `rados ls` output could be very large — a production note about this could be useful in a future revision.
- The post uses "stripe_number" to describe RBD object suffixes; the more precise term is "object number" (hex offset), but the usage is understandable and not misleading in context.
