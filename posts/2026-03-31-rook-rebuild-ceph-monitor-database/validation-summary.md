# Validation Summary: How to Rebuild a Ceph Monitor Database

## Status
validated

## Post Type
Tutorial / Disaster Recovery Guide

## Technologies Covered
- Ceph (monitor database, OSD, BlueStore)
- ceph-monstore-tool
- ceph-objectstore-tool
- ceph-volume
- Rook (Ceph operator for Kubernetes)
- systemctl (systemd service management)
- kubectl (Kubernetes CLI)

## Sources Consulted
- Ceph official documentation: Troubleshooting Monitors — https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-mon/
- ceph-monstore-tool man page — https://docs.ceph.com/en/latest/man/8/ceph-monstore-tool/
- ceph-objectstore-tool man page — https://docs.ceph.com/en/latest/man/8/ceph-objectstore-tool/
- Ceph source code (ceph_monstore_tool.cc) — https://github.com/ceph/ceph/blob/main/src/tools/ceph_monstore_tool.cc
- Recovering CephFS after monitor store loss — https://docs.ceph.com/en/reef/cephfs/recover-fs-after-mon-store-loss/

## Issues Found

### Issue 1: Incorrect use of `store-copy` in Step 4
**What was wrong:** The post used `ceph-monstore-tool /tmp/mon-recovery store-copy` and described it as extracting cluster state from OSD data. The `store-copy` subcommand copies an *existing* monitor store to a new location — it does not extract data from OSDs. Additionally, the command was missing a destination argument.
**What was changed:** Replaced Step 4 with the correct procedure: using `ceph-objectstore-tool --op update-mon-db --mon-store-path` on each OSD to extract cluster maps into the recovery store. Added both local and multi-node variants.
**Why:** This is the documented Ceph procedure for collecting OSD metadata into a new monitor store prior to rebuilding.

### Issue 2: Invalid `--osd-ids` flag in Step 5
**What was wrong:** The `ceph-monstore-tool rebuild` command was called with `--osd-ids 0,1,2,3,4,5,6,7,8`. This flag does not exist. The valid flags for `rebuild` are `--keyring`, `--mon-ids`, and `--monmap`.
**What was changed:** Replaced `--osd-ids` with `--keyring /etc/ceph/ceph.client.admin.keyring --mon-ids $(hostname)`.
**Why:** Per the Ceph source code and official documentation, the rebuild subcommand accepts only `--keyring`, `--mon-ids`, and `--monmap`.

### Issue 3: Missing critical OSD data extraction step
**What was wrong:** The post jumped from creating the recovery directory (Step 3) directly to rebuilding without first extracting OSD data using `ceph-objectstore-tool --op update-mon-db`. This is the core step that collects cluster maps from surviving OSDs.
**What was changed:** Added the correct `ceph-objectstore-tool --op update-mon-db` loop in Step 4, which must run before `ceph-monstore-tool rebuild`.
**Why:** Without this step, the rebuild command has no OSD data to work with and the procedure would fail.

### Issue 4: Incorrect `--op info` usage in Step 5
**What was wrong:** The post used `ceph-objectstore-tool --op info` to "extract the OSD superblock." The `info` operation retrieves information about a specific object (requires `--pgid`), not the OSD superblock.
**What was changed:** Replaced `--op info` with `--op dump-super`, which correctly dumps the OSD superblock information.
**Why:** `dump-super` is the correct operation for inspecting OSD superblock metadata.

### Issue 5: Incorrect copy path in Step 6
**What was wrong:** The command `cp -r /tmp/mon-recovery /var/lib/ceph/mon/ceph-$(hostname)/` would create a `mon-recovery` subdirectory inside the monitor data path, rather than placing `store.db` where the monitor expects it.
**What was changed:** Changed to `cp -r /tmp/mon-recovery/store.db /var/lib/ceph/mon/ceph-$(hostname)/store.db`.
**Why:** The Ceph monitor expects `store.db` directly inside its data directory. The rebuild process creates `store.db` inside the recovery path.

## Review Notes
- The Prevention section's use of `ceph-monstore-tool store-copy` for backup is correct — `store-copy` is designed to copy an existing working monitor store.
- The Rook recovery section is high-level but accurate. In practice, Rook monitor recovery may also require editing the Rook ConfigMap and mon Deployments/PVCs.
- The `ceph-volume lvm activate $i <fsid>` command in Step 7 uses `<fsid>` as a placeholder — readers need to substitute their actual OSD FSID. This is clear from context.
- The keyring path `/etc/ceph/ceph.client.admin.keyring` used in the fix is the standard default location, but users may need to adjust based on their deployment.
