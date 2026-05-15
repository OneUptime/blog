# Validation Summary: How to Monitor Cache Hit Ratios and Performance on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM cache / dm-cache
- device-mapper (`dmsetup`)
- sysstat `iostat`
- Bash scripting
- cron
- Linux logging with `logger`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring and managing logical volumes" - caching logical volumes with `dm-cache` and LVM report selection: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/configuring_and_managing_logical_volumes
- Linux kernel documentation, "Cache" device-mapper target status fields: https://docs.kernel.org/admin-guide/device-mapper/cache.html
- Red Hat Enterprise Linux 7 Logical Volume Manager Administration field reference for LVM cache report fields: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html-single/logical_volume_manager_administration/index
- LVM2 report field definitions for cache counters: https://fossies.org/linux/LVM2/lib/report/columns.h
- `dmsetup status --help` from the local system.
- `iostat -x` from the local system, and sysstat `iostat` manual references for `rareq-sz`, `wareq-sz`, and `areq-sz`: https://manpages.debian.org/unstable/sysstat/iostat.1.en.html

## Issues Found
- The `cache-report.sh` example used a second `lvs --select "lv_dm_path=$cached_lv"` lookup to recover the LV name. This is fragile because it depends on selection parsing of a device-mapper path. Changed the script to request both `lv_name` and `lv_dm_path` in the initial `lvs` command.
- The sequential workload note referenced only `areq-sz`. On current extended `iostat` output, request-size columns may be split into `rareq-sz` and `wareq-sz`. Updated the text to mention `rareq-sz` and `wareq-sz`, with `areq-sz` as a summary-output variant.
- The thrashing section described high promotion and demotion numbers as sufficient evidence. dm-cache reports cumulative counters, so totals alone do not prove current thrashing. Updated the wording to refer to high, similar promotion and demotion rates over time.
- The sequential workload claim was too absolute. Updated it from "do not benefit" to "usually benefit less" to reflect that caching benefit depends on reuse and workload behavior.

## Review Notes
The hit-ratio thresholds in the post are practical rules of thumb, not RHEL-defined pass/fail values. They are reasonable as guidance, but future revisions could clarify that acceptable ratios depend on workload, latency goals, cache mode, and cache size.
