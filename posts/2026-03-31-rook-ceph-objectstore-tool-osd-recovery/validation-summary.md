# Validation Summary: How to Use ceph-objectstore-tool for OSD Data Recovery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (ceph-objectstore-tool)
- Rook-Ceph (Kubernetes operator for Ceph)
- Kubernetes (kubectl)

## Sources Consulted
- Official ceph-objectstore-tool man page: https://docs.ceph.com/en/latest/man/8/ceph-objectstore-tool/
- ceph-objectstore-tool RST source (GitHub): https://github.com/ceph/ceph/blob/main/doc/man/8/ceph-objectstore-tool.rst
- ceph_objectstore_tool.cc source code (GitHub): https://github.com/ceph/ceph/blob/main/src/tools/ceph_objectstore_tool.cc
- Ceph Operating a Cluster docs: https://docs.ceph.com/en/latest/rados/operations/operating/
- Ceph Control Commands docs: https://docs.ceph.com/en/latest/rados/operations/control/

## Issues Found

1. **Prerequisites: `ceph osd down` does not stop the OSD daemon** — The original post listed `ceph osd out osd.0` and `ceph osd down osd.0` as an alternative to stopping the OSD in Rook. However, `ceph osd down` only marks the OSD as down in the cluster map; it does not stop the daemon process. Replaced with `sudo systemctl stop ceph-osd@0`, which is the correct way to stop an OSD on a traditional (non-Rook) deployment.

2. **List objects from a PG: wrong operation** — The post used `--pgid 1.0 --op list-pgs` with a comment saying "List objects from a specific PG." The `list-pgs` operation lists all PGs on an OSD and ignores the `--pgid` flag. Changed to `--op list` with `--pgid 1.0`, which correctly lists objects within a specific placement group.

3. **Remove a corrupt object: wrong syntax** — The post used `--op remove --pgid 1.0 '{...}'` to remove a single object. However, `--op remove` with `--pgid` removes an entire PG, not an individual object. Object-level removal uses the positional command syntax: `'<json_object>' remove` after `--pgid`. Fixed to use the correct positional form.

4. **Fix Missing PG Info: `fix-lost` is the wrong operation** — The post used `--op fix-lost` to fix "a PG stuck in unknown state." The `fix-lost` operation clears the `FLAG_LOST` flag on individual objects; it does not fix PG-level state. For a PG stuck in unknown state, the correct operation is `--op mark-complete`, which updates the PG metadata to allow it to peer. Changed accordingly and updated the section heading.

5. **get-bytes: wrong syntax** — The post used `--op get-bytes` followed by a JSON object identifier. However, `get-bytes` is a positional object command, not an `--op` operation. The correct syntax places the JSON object as a positional argument followed by `get-bytes`. Also added the required `--pgid` flag which was missing.

## Review Notes
- The ghobject_t JSON format used throughout the post (with fields `oid`, `key`, `snapid`, `hash`, `max`, `pool`, `namespace`) is correct. The `snapid: -2` value correctly represents `CEPH_NOSNAP` for head objects.
- The export/import workflow (`--op export` and `--op import` with `--file` and `--pgid`) is correct and is a well-documented recovery pattern.
- The Rook-specific command `kubectl -n rook-ceph scale deployment rook-ceph-osd-0 --replicas=0` is the correct way to stop an OSD in a Rook-managed cluster.
