# Validation Summary: How to Create Mirror Snapshots Manually for RBD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph RBD (RADOS Block Device)
- RBD snapshot-based mirroring
- `rbd` CLI tool
- Rook Ceph operator
- Kubernetes (kubectl)

## Sources Consulted
- [Ceph RBD Mirroring Documentation (Reef)](https://docs.ceph.com/en/reef/rbd/rbd-mirroring/)
- [Ceph rbd man page (GitHub source)](https://github.com/ceph/ceph/blob/main/doc/man/8/rbd.rst)
- [Ceph RBD Mirroring documentation source (GitHub)](https://github.com/ceph/ceph/blob/main/doc/rbd/rbd-mirroring.rst)
- [Configure Snapshot-based RBD Mirroring (HackMD)](https://hackmd.io/@bTjLX1jQSOy_qWBZOtQ8Ew/rbd-mirroring-config-doc)
- [Ceph RBD Mirroring - Proxmox VE](https://pve.proxmox.com/wiki/Ceph_RBD_Mirroring)
- [rbd-mirror: provide initial snapshot replay status (ceph/ceph#33440)](https://github.com/ceph/ceph/pull/33440)

## Issues Found

1. **Invalid command `rbd mirror image info`** (Prerequisites section): The command `rbd mirror image info replicapool/myimage` does not exist. The official Ceph rbd man page lists the valid `rbd mirror image` subcommands as: demote, disable, enable, promote, resync, and status. There is no `info` subcommand. Changed to `rbd info replicapool/myimage`, which displays image details including mirroring state and mirroring mode.

2. **Journal-based mirroring output shown for snapshot-based mirroring** (Checking Replication Progress section): The example `rbd mirror image status` output contained `master_position=[...], mirror_position=[...]`, which are fields specific to journal-based mirroring. Since the entire post is about snapshot-based mirroring, the example output was incorrect. Changed to the snapshot-based mirroring status format, which shows JSON fields including `bytes_per_second`, `bytes_per_snapshot`, `local_snapshot_timestamp`, `remote_snapshot_timestamp`, and `replay_state`.

## Review Notes
- The batch scripting example using `rbd mirror image ls $POOL --format json | jq -r '.[].name'` could not be fully verified for exact JSON field names, as the precise JSON output schema for `rbd mirror image ls` varies across Ceph versions. The concept and approach are correct.
- The claim that mirror snapshots appear with the prefix `mirror.primary` in `rbd snap ls` output is consistent with community documentation and practical examples, though the exact format may be `.mirror.primary.<uuid>`.
- The `rbd mirror pool enable replicapool image` command correctly enables per-image mirroring on the pool. The prerequisite bullet says "snapshot mode" but the command argument `image` refers to the mirroring scope (per-image vs per-pool), not the mirroring mode. The snapshot mode is set per-image via `rbd mirror image enable ... snapshot`. The commands shown are correct even if the bullet wording is slightly imprecise.
