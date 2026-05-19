# Validation Summary: How to Configure Power Saving for Servers on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux CPUFreq governors and cpupower
- cpufrequtils
- hdparm disk power management
- NVMe APST
- ethtool, iwconfig, and Wake-on-LAN
- PCIe ASPM
- TuneD profiles
- powertop
- IPMI / ipmitool
- systemd services and cron

## Sources Consulted
- Linux kernel CPUFreq documentation: https://docs.kernel.org/admin-guide/pm/cpufreq.html
- Linux kernel PCIe ASPM kernel parameter documentation: https://docs.kernel.org/admin-guide/kernel-parameters.html
- Linux kernel PCI power management documentation: https://docs.kernel.org/power/pci.html
- Ubuntu cpupower-frequency-set man page: https://manpages.ubuntu.com/manpages/stonking/man1/cpupower-frequency-set.1.html
- Ubuntu hdparm.conf man page: https://manpages.ubuntu.com/manpages/bionic/man5/hdparm.conf.5.html
- Local hdparm(8), ethtool(8), cpupower-frequency-set(1), modinfo, and sysfs output for installed command/parameter validation
- Ubuntu TuneD profiles man page: https://manpages.ubuntu.com/manpages/stonking/man7/tuned-profiles.7.html
- Ubuntu tuned-adm man page: https://manpages.ubuntu.com/manpages/noble/man8/tuned-adm.8.html
- Ubuntu powertop man page: https://manpages.ubuntu.com/manpages/bionic/man8/powertop.8.html
- Ubuntu ipmitool man page: https://manpages.ubuntu.com/manpages/jammy/man1/ipmitool.1.html

## Issues Found
- The `schedutil` rate-limit comment incorrectly implied a larger `rate_limit_us` makes idle frequency reduction more aggressive. Changed it to describe the actual behavior: increasing the minimum time between governor updates, and noted that the tunable may be global or per-policy.
- The persistence section referred to a `cpupower` service and `/etc/default/cpupower`, which are not generally provided by Ubuntu's `linux-tools-common` package. Replaced it with a small explicit systemd oneshot service that runs `cpupower frequency-set -g schedutil`.
- The NVMe section used `/sys/module/nvme/parameters/max_power_saving`, which is not the Linux NVMe driver parameter. Replaced it with `/sys/module/nvme_core/parameters/default_ps_max_latency_us` and described it as APST latency control rather than ASPM.
- The network section used `sudo ethtool -s eth0` as a check command, but `-s` is the change/settings form and needs options. Replaced it with `sudo ethtool eth0` and `sudo ethtool --show-eee eth0`.
- The PCIe ASPM GRUB example recommended `pcie_aspm=force` without warning. Added a caution that forcing ASPM can cause hardware problems and should be tested carefully.
- The TuneD performance-profile comment said it disables all power saving. Adjusted it to the narrower TuneD behavior of disabling TuneD's additional power-saving tunings.
- The scheduled cron examples only changed CPU0. Updated them to loop over all CPU governor sysfs files.
- Removed unsourced fixed percentage savings claims for BIOS settings and the quick baseline, replacing them with hardware-dependent measurement guidance.

## Review Notes
The commands remain hardware-dependent: CPU governor names, NVMe APST behavior, EEE support, ASPM policy availability, IPMI sensors, and disk APM support vary by kernel, firmware, and device. The post is technically correct after the edits, but readers should test changes on their own hardware before applying them broadly.
