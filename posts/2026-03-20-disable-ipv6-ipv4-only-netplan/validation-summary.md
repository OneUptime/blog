# Validation Summary: How to Disable IPv6 and Keep IPv4 Only with Netplan

## Status
validated

## Post Type
Guide

## Technologies Covered
- Netplan
- Ubuntu
- Debian
- Linux networking
- IPv4
- IPv6
- GRUB
- sysctl

## Sources Consulted
- Netplan tutorial: https://netplan.readthedocs.io/en/stable/netplan-tutorial/
- Netplan YAML reference: https://canonical-netplan.readthedocs-hosted.com/en/stable/netplan-yaml/
- Linux kernel IPv6 documentation: https://docs.kernel.org/networking/ipv6.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.1/networking/ip-sysctl.html
- Linux kernel command-line parameters: https://docs.kernel.org/admin-guide/kernel-parameters.html
- `sysctl(8)` manual page: https://man7.org/linux/man-pages/man8/sysctl.8.html

## Issues Found
- The introduction incorrectly implied that `dhcp6: false` and `accept-ra: no` were sufficient to stop all IPv6 addressing. I corrected this to include `link-local: []`, because Netplan enables IPv6 link-local by default unless it is explicitly disabled.
- The DHCP example and the multi-interface example were missing `link-local: []`, which meant they could still retain IPv6 link-local addresses. I added `link-local: []` to those examples so they match the post’s stated outcome.
- The section titled "Disable IPv6 on All Interfaces" only configured two explicitly named interfaces and did not represent a global Netplan switch. I renamed it to "Disable IPv6 on Multiple Interfaces" to make the scope technically accurate.
- The verification section implied that `/proc/sys/net/ipv6/conf/eth0/disable_ipv6` would read `1` for Netplan-only configuration. I corrected that note to clarify it applies to the sysctl-based kernel disable method.
- The description was tightened from generic Debian wording to "Debian systems that use Netplan" so it does not imply Netplan is the default networking stack everywhere on Debian.

## Review Notes
- Netplan backend behavior can differ between `systemd-networkd` and `NetworkManager`. The corrected post now aligns with the official Netplan documentation for preventing IPv6 address configuration, but the exact runtime result should still be tested on the target image and renderer.
