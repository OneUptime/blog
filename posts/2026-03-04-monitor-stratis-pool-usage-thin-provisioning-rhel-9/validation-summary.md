# Validation Summary: How to Monitor Stratis Pool Usage and Thin Provisioning on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Stratis storage management
- Stratis thin provisioning and overprovisioning
- XFS filesystems managed by Stratis
- Linux shell scripting
- cron and systemd timers

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Setting up Stratis file systems": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_file_systems/setting-up-stratis-file-systems_managing-file-systems/
- Red Hat Enterprise Linux 9 documentation, "Monitoring Stratis file systems": https://docs.redhat.com/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/monitoring-stratis-file-systems
- stratis(8) man page for stratis-cli: https://www.mankier.com/8/stratis
- Stratis 3.0.0 release notes covering the Alerts column and `stratis pool explain`: https://stratis-storage.github.io/stratis-release-notes-3-0-0/

## Issues Found
- The post used `sudo stratis pool describe datapool`, but current `stratis-cli` does not document a `pool describe` subcommand. Changed it to `sudo stratis pool list --name datapool`, which is the documented way to show detailed information for a specific pool.
- The monitoring and logging scripts used `stratis pool list --no-headers`, but `--no-headers` is not a documented global or `pool list` option. Updated the scripts to call `stratis pool list` and skip the header with `awk 'NR > 1'`.
- The scripts parsed `stratis pool list` fields as if `Total`, `Used`, and `Free` were single whitespace-delimited fields. The documented output is `Total / Used / Free`, with size values and units separated by spaces. Updated the parsing to read the correct field positions and preserve values such as `100 GiB`, `45 GiB`, and `55 GiB`.
- The monitoring script assumed all sizes were GiB. Updated it to normalize KiB, MiB, GiB, TiB, and PiB values before calculating pool usage percentage.
- The post stated that all filesystems become read-only when a pool is full. Red Hat documents that if all available pool space is allocated, no additional space can be assigned to the filesystem and applications risk data loss. Reworded the claim to avoid overstating read-only behavior.

## Review Notes
The `stratis` CLI was not installed in the local review environment, so command syntax was validated against Red Hat documentation and the current `stratis(8)` CLI reference rather than local `--help` output.
