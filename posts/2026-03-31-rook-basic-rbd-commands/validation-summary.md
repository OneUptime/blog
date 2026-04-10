# Validation Summary: How to Use Basic RBD Commands in Ceph

## Status
validated

## Post Type
Tutorial / CLI Reference Guide

## Technologies Covered
- Ceph RADOS Block Device (RBD)
- Rook-Ceph (Kubernetes Ceph operator)
- Kubernetes (kubectl, toolbox pod)
- RBD CLI (`rbd` command-line tool)

## Sources Consulted
- [Ceph RBD man page (Reef)](https://docs.ceph.com/en/reef/man/8/rbd/) — verified all command syntax, flags, and aliases
- [Basic Block Device Commands](https://docs.ceph.com/en/reef/rbd/rados-rbd-cmds/) — verified create, resize, remove, info, and ls commands
- [Kernel Module Operations (rbd-ko)](https://docs.ceph.com/en/reef/rbd/rbd-ko/) — verified map/unmap kernel requirements
- [Ceph source: Trash.cc](https://github.com/ceph/ceph/blob/main/src/tools/rbd/action/Trash.cc) — confirmed `trash move` / `trash mv` aliases
- [Ceph source: Device.cc](https://github.com/ceph/ceph/blob/main/src/tools/rbd/action/Device.cc) — confirmed `showmapped` / `device list` aliases

## Issues Found

1. **Section title "Listing Features" was misleading.** The section content covers `rbd feature enable` and `rbd feature disable` commands, not listing features. Changed to "Managing Features" to accurately reflect the content.

2. **Mapping commands incorrectly implied they run from the toolbox pod.** The introduction states "All commands below are run via the Rook toolbox pod," but `rbd map`, `rbd showmapped`, and `rbd unmap` require the host kernel's RBD module (`krbd`) or `rbd-nbd` and cannot be executed from within a container. Added a clarifying note to the mapping section that these commands must be run on the host node, not from the toolbox pod.

## Review Notes
- All RBD command syntax is correct and current as of Ceph Reef.
- The `--size` flag correctly uses the `G` suffix (GiB). The object count math in the sample `rbd info` output is accurate: 10 GiB / 4 MiB (order 22) = 2,560 objects.
- `rbd trash move` is valid; the docs more commonly show `rbd trash mv`, but both are registered aliases and work identically.
- `rbd showmapped` is valid; the newer form is `rbd device list`, but `showmapped` remains a fully supported alias.
- The `rbd trash rm` command correctly uses `pool/<trash-id>` format where `<trash-id>` is the image ID shown by `rbd trash ls`, not the original image name. The placeholder notation in the post makes this clear.
