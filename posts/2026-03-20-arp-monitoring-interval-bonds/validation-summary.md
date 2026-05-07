# Validation Summary: How to Set the ARP Monitoring Interval for Network Bonds

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux bonding driver
- Debian bond configuration via `/etc/network/interfaces`
- `systemd-networkd` bond configuration
- NetworkManager / `nmcli` bond configuration
- IPv4 ARP-based link monitoring

## Sources Consulted
- Linux kernel bonding documentation: https://www.kernel.org/doc/html/latest/networking/bonding.html
- `systemd.netdev` manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- `systemd.syntax` manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.syntax.html
- NetworkManager `nm-settings-nmcli` reference: https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- NetworkManager `NMSettingBond` reference: https://networkmanager.dev/docs/libnm/latest/NMSettingBond.html
- Debian `ifenslave` `README.Debian`: https://sources.debian.org/data/main/i/ifenslave/2.13/debian/README.Debian
- Debian `interfaces-bond(5)` for `ifupdown-ng`: https://manpages.debian.org/bookworm/ifupdown-ng/interfaces-bond.5.en.html
- Debian `interfaces(5)` manual: https://manpages.debian.org/bookworm/ifupdown/interfaces.5.en.html

## Issues Found
- The comparison table said ARP monitoring works with "Most" modes under the feature "Works with all modes". This was corrected to `No` because the kernel bonding documentation explicitly states that ARP monitoring is unavailable in `802.3ad` mode and unsupported in some advanced load-balancing modes.
- The Debian `/etc/network/interfaces` snippet and the `systemd-networkd` snippet used end-of-line comments on configuration lines. Both `interfaces(5)` and `systemd.syntax(7)` document comments as separate lines, so the comments were moved to standalone lines to keep the examples valid.
- The `systemd-networkd` example used `ARPAllSlavesActive=false`, which is not a documented bond key. This was corrected to `AllSlavesActive=false`, which is the valid `systemd.netdev` option.
- The `arp_validate` section described `filter` incorrectly. It now matches the kernel documentation, and the supported `filter_active` and `filter_backup` modes were added for completeness.
- The failover simulation claimed the backup slave should become active within a single `arp_interval`. This was corrected to reflect the documented missed-poll behavior; ARP failover depends on multiple missed checks, with `arp_missed_max=2` by default.
- The multiple-target example in the takeaways used `arp_ip_target=10.0.0.1 10.0.0.2`. This was corrected to the documented comma-separated kernel option syntax and clarified so the default `arp_all_targets=any` behavior is accurately described.

## Review Notes
- The `systemd-networkd` snippet shows only the `.netdev` portion of the setup. A working configuration also needs `.network` files to enslave the physical interfaces and assign addressing.
- ARP monitoring is IPv4-only. For IPv6 neighbor-based monitoring, the bonding driver provides `ns_ip6_target`.
