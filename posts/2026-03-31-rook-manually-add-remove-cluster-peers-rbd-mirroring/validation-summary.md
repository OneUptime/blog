# Validation Summary: How to Manually Add and Remove Cluster Peers for RBD Mirroring

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Ceph RBD (RADOS Block Device) Mirroring
- Rook Ceph Operator for Kubernetes
- Kubernetes (CRDs, Secrets)
- rbd CLI tool
- kubectl CLI

## Sources Consulted
- [Ceph RBD Mirroring Documentation (Reef)](https://docs.ceph.com/en/reef/rbd/rbd-mirroring/) - Official Ceph docs for RBD mirroring commands and workflow
- [Ceph rbd man page (latest)](https://docs.ceph.com/en/latest/man/8/rbd/) - CLI reference for rbd subcommands
- [Ceph MirrorPool.cc source code](https://github.com/ceph/ceph/blob/main/src/tools/rbd/action/MirrorPool.cc) - Verified registered peer subcommands and accepted flags for `peer add`
- [Ceph RBD Mirroring - Proxmox VE wiki](https://pve.proxmox.com/wiki/Ceph_RBD_Mirroring) - Cross-referenced peer listing and add commands
- [rbd(8) Debian man page](https://manpages.debian.org/unstable/ceph-common/rbd.8.en.html) - CLI syntax reference
- [Rook CephBlockPool CRD Documentation](https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/) - Verified mirroring.peers.secretNames CRD structure
- [Red Hat Ceph Storage Block Device Guide](https://access.redhat.com/documentation/en-us/red_hat_ceph_storage/4/html/block_device_guide/mirroring-ceph-block-devices) - Cross-referenced peer add syntax

## Issues Found

### 1. Invalid command: `rbd mirror pool peer ls` (two occurrences)
- **What was wrong:** The post used `rbd mirror pool peer ls replicapool` to list peers. This subcommand does not exist in the Ceph CLI. The Ceph source code (MirrorPool.cc) only registers `peer add`, `peer remove`, `peer set`, `peer bootstrap create`, and `peer bootstrap import` -- there is no `peer ls` or `peer list` subcommand.
- **What was changed:** Replaced both occurrences with `rbd mirror pool info replicapool`, which is the correct command to view peer information. Updated the sample output in the "Removing a Cluster Peer" section to reflect the actual output format of `rbd mirror pool info`.
- **Why:** Running `rbd mirror pool peer ls` would produce an unrecognized command error. The `rbd mirror pool info` command displays mirroring mode, site name, and peer details including UUIDs.

### 2. Redundant `--remote-cluster` flag in manual peer add command
- **What was wrong:** The command `rbd mirror pool peer add replicapool client.rbd-mirror@primary-cluster --remote-cluster primary-cluster --remote-mon-host "..."` specified the cluster name twice: once in the positional spec (`@primary-cluster`) and again via the `--remote-cluster` flag.
- **What was changed:** Removed the redundant `--remote-cluster primary-cluster` flag, keeping the positional spec and the `--remote-mon-host` flag which provides additional necessary information.
- **Why:** While technically the command would still work (the flag would just override with the same value), it is confusing and could mislead readers into thinking both are required. The positional spec format `client.name@cluster` is the standard documented approach.

## Review Notes
- The Rook CephBlockPool CRD spec is correct and matches current Rook documentation. Note that Rook currently only supports a single peer (one entry in `secretNames`).
- The `rbd mirror pool enable replicapool pool` command and the `image` vs `pool` mirroring modes are correctly described.
- The bootstrap token workflow (create on primary, import on secondary) is accurate and follows the official Ceph documentation.
- The `--direction rx-tx` flag for bidirectional mirroring is correct; `rx-only` for unidirectional is also valid but not mentioned (acceptable for a tutorial focused on bidirectional).
- The `kubectl create secret` command for creating the Rook peer secret with `--from-literal=token=...` is correct.
