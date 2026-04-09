# Validation Summary: How to Deploy Rook-Ceph on NixOS Kubernetes Nodes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (v1.15.0)
- Ceph (v18.2.4 Reef)
- Kubernetes
- NixOS (configuration.nix, boot.kernelModules, systemd.tmpfiles, environment.systemPackages)
- LVM2
- CephCluster CRD (ceph.rook.io/v1)

## Sources Consulted
- Rook GitHub releases and tags: https://github.com/rook/rook (confirmed v1.15.0 through v1.15.7 exist)
- Rook v1.15.0 upstream cluster.yaml example: https://github.com/rook/rook/blob/v1.15.0/deploy/examples/cluster.yaml (verified CephCluster CRD fields and recommended Ceph version)
- Quay.io Ceph image registry: https://quay.io/repository/ceph/ceph (confirmed v18.2.4 tag exists)
- NixOS options documentation for boot.kernelModules, boot.extraModulePackages, systemd.tmpfiles.rules, environment.systemPackages, systemd.services
- Linux kernel module names: rbd (RADOS Block Device), ceph (CephFS client), libceph (loaded as dependency)

## Issues Found
- **Ceph image version incompatible with Rook v1.15**: The post used `quay.io/ceph/ceph:v19.2.0` (Ceph Squid) but Rook v1.15 officially supports Ceph v18 (Reef). Using Ceph v19 with Rook v1.15 requires setting `allowUnsupported: true` in the CephCluster spec, which the post did not include. Changed the image to `quay.io/ceph/ceph:v18.2.4`, which is the upstream-recommended Ceph version for Rook v1.15.

## Review Notes
- The systemd service in Step 8 (`rook-ceph-prep`) is partially redundant with `boot.kernelModules` in Step 1, since NixOS will load declared kernel modules at boot. The service acts as a belt-and-suspenders approach, which is fine but could be noted.
- NixOS filesystem description says `/usr`, `/bin`, `/lib` are "read-only" — more precisely, on NixOS these paths are minimal (e.g., `/bin/sh` symlink, `/usr/bin/env` symlink) and managed by Nix, not traditional read-only mounts. The spirit of the statement is correct for the post's purpose.
- `mgr.count: 1` is valid but less HA than the Rook upstream default of 2. Acceptable for a tutorial/small deployment scenario.
- All NixOS Nix expressions are syntactically correct and use valid NixOS module options.
- All kubectl commands use correct syntax and flag names.
