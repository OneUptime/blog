# Validation Summary: How to Enable and Disable VDO Compression on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Virtual Data Optimizer (VDO)
- LVM-VDO
- `vdo`
- `vdostats`
- `dmsetup`
- `fio`

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation, "Enabling or disabling compression in VDO": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/deduplicating_and_compressing_storage/maintaining-vdo_deduplicating-and-compressing-storage
- Red Hat Enterprise Linux 7 documentation, "VDO Commands": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/storage_administration_guide/vdo-ig-commands
- Red Hat Enterprise Linux 9 documentation, "Changing the compression settings on an LVM-VDO volume": https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/deduplicating_and_compressing_logical_volumes_on_rhel
- Red Hat blog, "How to configure disk compression in Red Hat Enterprise Linux 8": https://www.redhat.com/en/blog/disk-compression-RHEL8
- `vdostats(8)` man page reference: https://manpages.debian.org/testing/vdo/vdostats.8.en.html

## Issues Found
- The post used standalone `vdo` commands while the title referred to RHEL broadly. Red Hat documents standalone VDO tooling for RHEL 7/8, while RHEL 9 documentation manages VDO through LVM-VDO with `lvs` and `lvchange --compression y|n`. I added a short scope note and the RHEL 9 LVM-VDO command pattern.
- The introduction said deduplication is "almost always beneficial." Red Hat documents deduplication as useful for workloads such as VM environments and backup applications, but it can be disabled when deduplication rates are poor. I changed the wording to describe it as useful for repeated-block workloads.
- The closing sentence implied deduplication alone often provides significant savings generally. I narrowed this to workloads with repeated blocks.

## Review Notes
The standalone VDO compression commands, `vdo enableCompression --name=...`, `vdo disableCompression --name=...`, and `vdo create --compression=disabled`, match Red Hat documentation. The `vdostats --verbose` use of `saving percent` is consistent with documented VDO statistics output. The `fio` example is syntactically plausible as a simple workload comparison, but real benchmark results depend heavily on cache state, file reuse, storage device behavior, and filesystem state.
