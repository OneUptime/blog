# Validation Summary: How to Configure a Bond with systemd-networkd

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- `systemd-networkd`
- `systemd.netdev`
- `systemd.network`
- Linux bonding driver
- LACP / `802.3ad`

## Sources Consulted
- systemd `systemd.netdev(5)` official man page: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- systemd `systemd.network(5)` official man page: https://www.freedesktop.org/software/systemd/man/257/systemd.network.html
- systemd `networkctl(1)` official man page: https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- Linux kernel bonding documentation: https://docs.kernel.org/6.17/networking/bonding.html
- Local manual pages in the review environment: `man systemd.netdev`, `man systemd.network`, `man networkctl`, `man ip-address`

## Issues Found
- The `802.3ad` example was syntactically correct, but it omitted the required switch-side prerequisite. I added a sentence clarifying that LACP requires the connected switch ports to be configured for `802.3ad`/LACP, matching the kernel bonding documentation.
- The `balance-rr` example omitted the usual switch-side requirement. I added a sentence clarifying that this mode generally requires the connected switch ports to be grouped into the same logical link.
- The bond mode table described `balance-alb` as generic "Adaptive RX+TX". I corrected it to `Adaptive TX + IPv4 RX` to reflect the kernel documentation more precisely: adaptive load balancing includes transmit load balancing plus receive load balancing for IPv4 traffic.

## Review Notes
- The `.netdev` and `.network` snippets are valid `systemd-networkd` syntax: `Kind=bond`, `Bond=`, `DHCP=ipv4`, `Address=`, `Gateway=`, `DNS=`, `MIIMonitorSec=`, `UpDelaySec=`, `DownDelaySec=`, `LACPTransmitRate=`, and `TransmitHashPolicy=` all match current documentation.
- `cat /proc/net/bonding/bond0`, `ip addr show bond0`, and `networkctl status bond0` are all valid verification commands for this workflow.
- `DNS=` in a `.network` file is valid per-link DNS configuration. On typical `systemd` systems, host name resolution behavior depends on the resolver stack in use, commonly `systemd-resolved`.
