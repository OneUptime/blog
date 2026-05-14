# Validation Summary: How to Size and Provision VDO Volumes for Object Storage on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- VDO (Virtual Data Optimizer)
- LVM
- XFS
- systemd mount options
- cron

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: Deduplicating and compressing storage - Installing VDO, creating VDO volumes, mounting, and monitoring with vdostats: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/deduplicating_and_compressing_storage/index
- Red Hat Enterprise Linux 9 documentation: Deduplicating and compressing logical volumes on RHEL - LVM-VDO installation, creation, mounting, and monitoring: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deduplicating_and_compressing_logical_volumes_on_rhel
- Red Hat Enterprise Linux 7 documentation: VDO commands reference for vdo and vdostats: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/storage_administration_guide/vdo-ig-commands

## Issues Found
- The install command omitted `lvm2`, which Red Hat includes in the documented VDO package installation set. Updated the command to install `lvm2 vdo kmod-kvdo`.
- The VDO creation example used `/dev/sdb`, but Red Hat recommends using a persistent block-device name because non-persistent device names can change across boots. Updated the example to use a `/dev/disk/by-id/...` path.
- The VDO creation example explicitly set `--vdoSlabSize=2G` for a 100 GB device. Red Hat documents the default 2 GiB slab size as sufficient below 16 TiB and calls out increasing slab size only for larger devices, so the unnecessary option was removed.
- The `vdostats --human-readable` sample header used `Size`, but Red Hat's documented output uses `1K-blocks`. Updated the sample output header.
- The final capacity warning said that running out of physical space "causes I/O errors." Red Hat documents VDO as thin-provisioned and emphasizes active monitoring; the wording was adjusted to state that file systems and applications can unexpectedly run out of space and recently written, unacknowledged data can be at risk.

## Review Notes
- The standalone `vdo create` workflow is documented for RHEL 8. RHEL 9 documentation primarily presents VDO as LVM-VDO managed with `lvcreate --type vdo`; future revisions could add an explicit RHEL-version caveat or an LVM-VDO variant.
