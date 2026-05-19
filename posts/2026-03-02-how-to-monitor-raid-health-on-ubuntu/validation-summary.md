# Validation Summary: How to Monitor RAID Health on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux software RAID (mdadm / md driver)
- `/proc/mdstat` and `/sys/block/mdN/md/` sysfs interface
- mdadm monitor daemon (mdmonitor.service)
- smartmontools (smartd, smartctl)
- Prometheus node_exporter (mdadm collector)
- Prometheus alerting rules
- systemd, cron, bash scripting on Ubuntu

## Sources Consulted
- mdadm.conf(5) — https://man7.org/linux/man-pages/man5/mdadm.conf.5.html
- mdadm(8) — https://man7.org/linux/man-pages/man8/mdadm.8.html
- smartd(8) and smartd.conf(5) — https://manpages.debian.org/testing/smartmontools/smartd.8.en.html, https://man.archlinux.org/man/extra/smartmontools/smartd.conf.5.en
- node_exporter mdadm collector source — https://github.com/prometheus/node_exporter/blob/master/collector/mdadm_linux.go
- Debian/Ubuntu mdadm package documentation and the `mdmonitor.service` unit file
- Ubuntu Discourse / Launchpad threads on `mdmonitor` service behavior

## Issues Found
1. **`ARRAY <ignore>` comment was incorrect.** The post said "use ARRAY <ignore> to monitor all", but per mdadm.conf(5) the `<ignore>` keyword means an array will NOT be auto-assembled/monitored. mdadm --monitor already watches all active arrays found in /proc/mdstat by default; ARRAY lines control assembly, not monitoring opt-in. Rewrote the comment to reflect this.
2. **Prometheus metric `node_md_disks_total` does not exist.** Per node_exporter's `collector/mdadm_linux.go`, the correct metric is `node_md_disks_required`. Updated the metric reference in the "Key metrics" comment and corrected the `RaidArrayDegraded` alert expression to use `node_md_disks_required`. Also fixed the `{{ $labels.total }}` template reference (there is no `total` label) to a description that does not depend on a non-existent label.
3. **smartd default polling interval mis-stated.** The smartd.conf example header said "check hourly". smartd(8) documents the default `-i` interval as 30 seconds × default factor → effectively 30 minutes between polls. Reworded the comment to "smartd polls every 30 minutes by default".

## Review Notes
- The `systemctl enable --now mdmonitor` command works on current Debian/Ubuntu releases where `mdmonitor.service` ships with an `[Install]` section (`WantedBy=basic.target`). On very old Ubuntu releases (pre-18.04) the unit was static and required setting `START_DAEMON=true` in `/etc/default/mdadm`; for a 2026 post targeting modern Ubuntu this is no longer a concern, so the command was left as-is.
- The smartd schedule `-s (S/../.././02|L/../../6/03)` is correct: short self-test daily during the 02:00 hour; long self-test on day-of-week 6 (Saturday) during the 03:00 hour.
- The `mdadm --detail` output parser in the custom script relies on stable field ordering; on a degraded array the `State :` line reads `clean, degraded`, which `awk '{print $3}'` returns as `clean,` (with comma). This still triggers the CRITICAL branch correctly because the string is neither `clean` nor `active`, so behavior is fine, but the script is slightly fragile by design — fine for a blog post.
- The `Active Devices`, `Raid Devices`, and `Failed Devices` mdadm --detail field labels and their position-4 values are correct.
- The four highlighted SMART attribute names (`Reallocated_Sector_Ct`, `Current_Pending_Sector`, `Offline_Uncorrectable`, `UDMA_CRC_Error_Count`) match standard SMART attribute IDs 5/197/198/199.
- node_exporter v1.7.0 is a real released version with the correct download URL pattern, though newer versions exist; the post pins to a specific version which is acceptable.
