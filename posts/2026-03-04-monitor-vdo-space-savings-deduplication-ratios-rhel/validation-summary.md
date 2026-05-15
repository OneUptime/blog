# Validation Summary: How to Monitor VDO Space Savings and Deduplication Ratios on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- VDO (Virtual Data Optimizer)
- vdostats
- Bash scripting
- cron
- syslog logger

## Sources Consulted
- Red Hat Enterprise Linux 7 Storage Administration Guide, VDO commands and vdostats reference: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/storage_administration_guide/vdo-ig-commands
- Red Hat Enterprise Linux 8 Deduplicating and compressing storage, Maintaining VDO: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/deduplicating_and_compressing_storage/maintaining-vdo_deduplicating-and-compressing-storage
- Red Hat Enterprise Linux 9 Deduplicating and compressing logical volumes on RHEL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/deduplicating_and_compressing_logical_volumes_on_rhel/
- vdostats(8) manual page, VDO 8.3.1.1: https://manpages.debian.org/testing/vdo/vdostats.8.en.html

## Issues Found
- The alert script parsed field `$4` from default `vdostats` output. In the documented column order, `$4` is `Available` when the device path is included; `Use%` is `$5`. Changed the script to parse `$5` so the 80% threshold checks physical usage.
- The section heading and ratio comment implied separate deduplication and compression ratios. The command divides logical blocks used by data blocks used, which gives an overall data reduction ratio. Updated the heading and comment to describe the calculation accurately.

## Review Notes
The `vdostats --verbose` fields used in the examples are documented, but the manual warns that management tools should not rely on verbose statistic ordering. The post's use of `grep` by field name avoids relying on ordering.
