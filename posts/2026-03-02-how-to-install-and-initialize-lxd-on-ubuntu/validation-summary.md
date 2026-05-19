# Validation Summary: How to Install and Initialize LXD on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Ubuntu
- LXD
- LXC client (`lxc`)
- Snap packages
- ZFS, Btrfs, LVM, directory, and Ceph storage backends
- LXD bridge networking
- LXD preseed YAML

## Sources Consulted
- Official LXD installation documentation: https://documentation.ubuntu.com/lxd/latest/installing/
- Official LXD initialization documentation: https://documentation.ubuntu.com/lxd/latest/howto/initialize/
- Official LXD storage drivers reference: https://documentation.ubuntu.com/lxd/latest/reference/storage_drivers/
- Official LXD ZFS storage driver reference: https://documentation.ubuntu.com/lxd/latest/reference/storage_zfs/
- Official LXD snap management documentation: https://documentation.ubuntu.com/lxd/latest/howto/snap/
- Official LXD `lxc launch` man page: https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/launch/
- Official LXD `lxc storage delete` man page: https://documentation.ubuntu.com/lxd/latest/reference/manpages/lxc/storage/delete/
- Official LXD 5.x deb-to-snap migration note: https://documentation.ubuntu.com/lxd/v5/installing/

## Issues Found
- The Docker comparison described Docker as "single-process per container." Docker containers can run multiple processes, even though the common pattern is one application or service per container. Updated the wording to avoid making this an absolute technical claim.
- The old apt/deb package upgrade instructions removed `lxd` and `lxd-client` without mentioning data migration. Added `sudo lxd.migrate` before package removal for systems with existing deb-package LXD data.
- The daemon troubleshooting command used the systemd unit directly. Replaced it with the official snap service inspection command, `snap services lxd`.
- The re-init troubleshooting suggested `lxd init --auto` or deleting the storage pool as a generic fix. Adjusted it to inspect storage pools, delete the conflicting pool only after dependent instances and volumes are removed, and then re-run `lxd init`.

## Review Notes
The post is technically relevant and current for LXD installed from the snap on Ubuntu. The preseed YAML format, storage pool fields, `lxc launch ubuntu:24.04`, bridge network settings, profile device syntax, and snap refresh commands match official LXD documentation. Loop-backed ZFS storage is fine for development, but the official documentation recommends a dedicated disk or partition for production.
