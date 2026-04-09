# Validation Summary: How to Recover CephFS After Monitor Store Loss

## Status
validated

## Post Type
Tutorial / Disaster Recovery Guide

## Technologies Covered
- Ceph (Reef v18.x)
- Rook-Ceph (Kubernetes operator for Ceph)
- CephFS (Ceph Filesystem)
- Kubernetes (kubectl)
- ceph-monstore-tool
- ceph-objectstore-tool
- monmaptool

## Sources Consulted
- Ceph Troubleshooting Monitors documentation: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-mon/
- Ceph monmaptool man page (Reef): https://docs.ceph.com/en/reef/man/8/monmaptool/
- Ceph Messenger v2 protocol documentation: https://docs.ceph.com/en/reef/rados/configuration/msgr2/
- Ceph v18.2.0 Reef release announcement: https://ceph.io/en/news/blog/2023/v18-2-0-reef-released/
- ceph-monstore-tool source code: https://github.com/ceph/ceph/blob/main/src/tools/ceph_monstore_tool.cc
- Quay.io Ceph container images: https://quay.io/repository/ceph/ceph

## Issues Found

1. **Step 1 grep for "leveldb" incorrect for Reef**: The post correctly states monitors use RocksDB, but the grep command in Step 1 searched for "leveldb". LevelDB was removed entirely in Quincy (v17). Changed `leveldb` to `rocksdb` in the grep pattern.

2. **Missing critical `ceph-objectstore-tool` prerequisite in Step 4**: The post showed only `ceph-monstore-tool rebuild` but omitted the essential first step: running `ceph-objectstore-tool --op update-mon-db` on each OSD to extract cluster map data into the temporary store directory. Without this step, `ceph-monstore-tool rebuild` has no source data and the procedure would fail. Added the `ceph-objectstore-tool` command with explanation.

3. **monmaptool used legacy v1-only `--add` syntax**: The original command used `--add a <ip>:6789` which creates a v1-only monmap entry. Ceph Reef uses both msgr2 (port 3300) and msgr1 (port 6789) by default. Changed to `--addv` with both `[v2:<ip>:3300,v1:<ip>:6789]` protocol addresses.

4. **Step 4 presented commands in confusing order**: The monmap generation was shown after the rebuild command, with a note saying "Before running rebuild, generate a monmap." Reordered to present the steps sequentially: (1) extract OSD data, (2) generate monmap, (3) run rebuild.

5. **Summary incorrectly stated "from OSD keyrings"**: The rebuild reconstructs from OSD data stores (BlueStore databases containing cluster maps), not keyrings. Keyrings are authentication credentials, not the source of cluster map data. Corrected to "from OSD data stores" and mentioned both tools.

## Review Notes
- The container image `quay.io/ceph/ceph:v18.2.0` is valid but not the latest Reef patch release (v18.2.5 is newer). This is acceptable since the exact patch version is not critical to the procedure.
- The post could benefit from a warning about the `ceph-objectstore-tool` step needing all OSDs to be stopped before running, but this is implied by Step 2 which stops all Rook components.
- In a real Rook-Ceph deployment, accessing OSD data directories from a recovery pod requires mounting the OSD PVCs, similar to the approach shown in Step 5 for the monitor PVC. The post doesn't detail this but it would make a useful addition in a future update.
