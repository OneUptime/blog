# Validation Summary: How to Monitor VDO Space Savings and Deduplication Ratios on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM-VDO
- VDO deduplication and compression
- `vdostats`
- LVM reporting commands such as `lvs` and `lvchange`
- Bash monitoring scripts and cron
- Linux storage monitoring with `iostat`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Deduplicating and compressing logical volumes on RHEL": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deduplicating_and_compressing_logical_volumes_on_rhel/
- Red Hat Enterprise Linux 7 Storage Administration Guide, `vdostats` command reference: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/storage_administration_guide/vdo-ig-commands
- Linux kernel documentation for `dm-vdo`, including VDO status fields and index states: https://www.kernel.org/doc/html/v6.9/admin-guide/device-mapper/vdo.html
- `lvchange(8)` man page reference for supported options: https://www.mankier.com/8/lvchange
- `vdostats(8)` / VDO statistics field reference: https://www.mankier.com/8/vdostats

## Issues Found
- The prerequisites omitted the `vdo` package. Red Hat's RHEL 9 VDO installation procedure installs `lvm2`, `kmod-kvdo`, and `vdo`, so the prerequisite list was updated.
- The "Deduplication Ratio" calculation used logical blocks divided by data blocks, which reflects an overall data reduction ratio from deduplication and compression rather than deduplication alone. The heading and output text were changed to "Data Reduction Ratio", and a guard was added for volumes with zero data blocks.
- The logging script wrote physical available space into a CSV column named `logical_used`. The header was corrected to `physical_available`.
- The alert script enumerated devices with `vdostats --all` and expected table rows beginning with `/`. `--all` is equivalent to verbose output, so the script was changed to enumerate devices from default `vdostats` table output.
- The UDS index state list was incomplete. The `closed` and `unknown` states were added to match the VDO status states documented by the kernel.
- The recovery command `lvchange --rebuild-full` is not a valid `lvchange` option. It was replaced with commands to inspect kernel VDO logs and LVM VDO state, plus a note to follow the supported recovery path for the specific failure mode.

## Review Notes
The core explanation of LVM-VDO, `vdostats --human-readable`, default `vdostats` output fields, verbose statistics, and LVM VDO status reporting is consistent with Red Hat and VDO documentation. The post now avoids prescribing an unsupported one-line recovery command for index errors.
