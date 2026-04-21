# Validation Summary: How to Troubleshoot Network Bonding Failover Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Linux Ethernet bonding driver
- Network bonding modes, including active-backup, 802.3ad, balance-tlb, and balance-alb
- MII and ARP link monitoring
- Linux sysfs bonding parameters
- `/proc/net/bonding`
- `ip link`, `ping`, `dmesg`, `journalctl`, and `grep`

## Sources Consulted
- Linux kernel documentation: Linux Ethernet Bonding Driver HOWTO - https://docs.kernel.org/6.17/networking/bonding.html
- systemd `journalctl` manual - https://www.freedesktop.org/software/systemd/man/devel/journalctl.html
- Linux `ip-link(8)` manual - https://man7.org/linux/man-pages/man8/ip-link.8.html
- Local command help output for `ip link help`, `ip link help bond`, `journalctl --help`, `ping -h`, `dmesg --help`, and `grep --help`

## Issues Found
- The post stated that MII monitoring is what detects link failures and that without it the bond will not detect failures. The Linux bonding driver also supports ARP monitoring, and the kernel documentation says either MII monitoring or ARP monitoring with targets must be configured. Updated the text and command to check both MII and ARP polling.
- The post did not note that enabling MII monitoring disables ARP monitoring when ARP monitoring was previously enabled. Added that caveat to the MII enable command comment.
- The `updelay` and `downdelay` section implied those options apply generally. Kernel documentation says they are valid for the MII link monitor. Scoped the statement to MII monitoring.
- The manual failover test hardcoded `eth0` even though it described bringing down the active slave. Updated the example to read the current active slave into a shell variable and bring that interface down/up.
- The manual failover test said failover should happen within the `miimon` interval. With `downdelay` configured, the effective window includes both detection and delay. Updated the wording to `miimon/downdelay`.
- The active-slave test and `primary_reselect` guidance were not scoped to modes that support an active or primary slave. Added mode-scoping language based on the kernel documentation.
- The conclusion over-emphasized `miimon` as the only link-monitoring cause and made failback guidance sound unconditional. Updated it to refer to link monitoring generally and to primary failback only when a primary slave is configured.

## Review Notes
- The remaining commands and option flags were syntactically valid against local CLI help output.
- The post intentionally uses runtime sysfs writes. In production documentation, it may be useful to add distro-specific persistent configuration examples in a separate article or future revision.
