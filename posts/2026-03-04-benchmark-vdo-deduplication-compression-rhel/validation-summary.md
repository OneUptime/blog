# Validation Summary: How to Benchmark VDO Deduplication and Compression on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- VDO (Virtual Data Optimizer)
- XFS
- fio
- Linux block devices
- vdostats

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: Deduplicating and compressing storage, including VDO installation, volume creation, mounting, monitoring, space-savings tests, and performance testing: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/deduplicating_and_compressing_storage/index
- Red Hat Enterprise Linux 9 documentation: Deduplicating and compressing logical volumes on RHEL, including current LVM-VDO workflow and monitoring notes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deduplicating_and_compressing_logical_volumes_on_rhel/index
- Red Hat Enterprise Linux 7 Storage Administration Guide: VDO commands and vdostats reference: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/storage_administration_guide/vdo-ig-commands
- fio official documentation: command options, direct I/O, filename, ioengine, and JSON output format: https://fio.readthedocs.io/en/master/fio_doc.html

## Issues Found
- The install command omitted `lvm2`, which Red Hat includes in the documented VDO installation command. Updated the install command to include `lvm2`.
- The VDO creation example used `/dev/sdb` directly. Red Hat recommends persistent block-device names because non-persistent device names can change across boots. Updated the example to use a `/dev/disk/by-id/...` path.
- The setup mounted the XFS filesystem but then ran the data-generation examples as an unprivileged user. Added `chmod a+rwx` after mounting, matching Red Hat's test-volume examples, so the non-root `dd`, `cp`, and shell redirection examples can write to the mount point.
- The setup did not wait for device-node creation after creating the VDO volume. Added `udevadm settle` before formatting the mapped device.
- The compression benchmark wrote repeated single-character data while deduplication was still enabled, which does not isolate compression savings. Updated the example to disable deduplication, ensure compression is enabled, write compressible text data, synchronize unfinished compression with `dmsetup message ... sync-dedupe`, and re-enable deduplication afterward.
- The raw-device fio comparison could silently overwrite data on `/dev/sdc`. Added an explicit warning that the command must use a spare unused test device.
- The final paragraph claimed VDO write overhead is typically 10-20% and read overhead is minimal. Red Hat's performance guidance emphasizes workload, hardware, and configuration dependency, so the fixed claim was replaced with workload-dependent wording.

## Review Notes
- The standalone `vdo create` workflow is documented for RHEL 8. RHEL 9 documentation primarily presents VDO as LVM-VDO managed with `lvcreate --type vdo`; a future revision could add an explicit RHEL-version caveat or an LVM-VDO example.
