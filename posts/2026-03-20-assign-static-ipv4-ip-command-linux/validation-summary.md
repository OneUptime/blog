# Validation Summary: How to Assign a Static IPv4 Address Using the ip Command on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- `iproute2`
- IPv4 addressing
- Netplan
- Debian `ifupdown`

## Sources Consulted
- `ip-address(8)` Linux man page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- `ip-link(8)` Linux man page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `ip-route(8)` Linux man page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Netplan documentation, "How to use static IP addresses": https://netplan.readthedocs.io/en/1.1.1/using-static-ip-addresses/
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Debian `interfaces(5)` man page: https://manpages.debian.org/unstable/ifupdown/interfaces.5.en.html

## Issues Found
- The Debian `/etc/network/interfaces` example used the deprecated `netmask` directive. I changed the stanza from separate `address` and `netmask` lines to `address 192.168.1.100/24`, which matches the current `interfaces(5)` documentation.

## Review Notes
- The `ip` commands in the post are runtime changes only; the post correctly notes that they are not persistent across reboots.
- The example output from `ip addr show` is illustrative and can vary by kernel, distribution, qdisc, interface naming, and MAC address.
- The Debian persistence example is valid for systems using `ifupdown`; Debian systems managed by other network stacks use their own configuration methods.
- The author link resolves correctly to a GitHub profile: https://github.com/nawazdhandala
