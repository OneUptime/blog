# Validation Summary: How to Monitor RAID Array Health and Set Up Email Alerts on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux mdraid
- mdadm and mdmonitor
- systemd services and timers
- Postfix and mailx
- cron
- Linux md sysfs scrub controls
- smartmontools and smartd
- systemd journal

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing storage devices, "Managing RAID" and "Setting up email notifications to monitor a RAID": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/managing-raid_managing-storage-devices
- mdadm(8) Linux manual page, monitor mode and mdmonitor.service behavior: https://man7.org/linux/man-pages/man8/mdadm.8.html
- mdadm.conf(5) Linux manual page, MAILADDR and configuration file syntax: https://man7.org/linux/man-pages/man5/mdadm.conf.5.html
- Linux kernel md documentation, sync_action and mismatch_cnt behavior: https://docs.kernel.org/admin-guide/md.html
- Red Hat Enterprise Linux 10 Managing storage devices, RAID services reference for raid-check.timer and raid-check.service behavior: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_storage_devices/managing-raid
- Red Hat Customer Portal solution on RHEL 9 raid-check scheduling behavior: https://access.redhat.com/solutions/7101837
- smartd.conf(5) manual page for DEVICESCAN, -H, -l error, -l selftest, -f, -m, and -M daily directives: https://man.archlinux.org/man/smartd.conf.5.en

## Issues Found
- The mdadm monitor setup only appended `MAILADDR` to `/etc/mdadm.conf`. Red Hat's RHEL 9 RAID monitoring procedure states that `ARRAY` and `MAILADDR` are mandatory variables, and creates the configuration by running `mdadm --detail --scan >> /etc/mdadm.conf`. I added `sudo mdadm --detail --scan | sudo tee -a /etc/mdadm.conf` before the `MAILADDR` line.
- The scheduled RAID scrub section used `mdcheck_start.timer`, which is not the RHEL-style timer documented for RAID consistency checks. I changed the commands to use `raid-check.timer` and enabled it with `sudo systemctl enable --now raid-check.timer`.

## Review Notes
- The SMART monitoring snippet is syntactically valid for smartd, but systems with RAID controllers, USB bridges, or NVMe devices might require device-specific smartctl/smartd options.
- The mail examples assume the local mail service can deliver to the configured destination. Postfix may still need relay or domain configuration in some environments.
- The custom cron script is reasonable for a simple alert, but production scripts should avoid duplicate alerts and may prefer checking `mdadm --detail` fields such as failed or degraded device counts.
