# Validation Summary: How to Configure WireGuard VPN with IPv6 on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- WireGuard
- IPv6
- firewalld
- wg-quick
- Linux sysctl networking

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Setting up a WireGuard VPN": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/index
- WireGuard official quick start: https://www.wireguard.com/quickstart/
- WireGuard `wg-quick(8)` Linux manual page: https://man7.org/linux/man-pages/man8/wg-quick.8.html
- firewalld `firewall-cmd(1)` manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld rich language manual page: https://firewalld.org/documentation/man-pages/firewalld.richlanguage
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://www.rfc-editor.org/rfc/rfc4193
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849

## Issues Found
- The example ULA addresses used `fd00:vpn::1` and `fd00:vpn::2`, which are invalid IPv6 literals because `vpn` is not hexadecimal. Replaced them with valid ULA examples under `fd42:42:42::/64`.
- The installation command included `epel-release`. Red Hat's RHEL 9 WireGuard documentation installs `wireguard-tools` directly, so the command was changed to `sudo dnf install -y wireguard-tools`.
- The ULA note described production use as coming from a user's `fd00::/8` allocation. RFC 4193 specifies a locally assigned ULA prefix with a pseudo-random Global ID, so the note now says to generate a proper ULA /48 from the `fd00::/8` locally assigned range.
- The IPv6 NAT section said firewalld's plain `--add-masquerade` handles both IPv4 and IPv6. firewalld documents that this option enables IPv4 masquerade and that IPv6 masquerading should use rich rules, so the commands now use `--add-rich-rule='rule family="ipv6" masquerade'`.
- The server `PostUp` and `PostDown` examples only added and removed IPv4 masquerading, which would not support the article's ULA-based IPv6 full-tunnel NAT example. Added the corresponding IPv6 rich-rule masquerade commands.
- The verification commands used `ping6`; changed them to `ping -6`, which is the current iputils form and works clearly for IPv6 tests.
- The post did not mention two RHEL 9-specific WireGuard caveats from Red Hat documentation: WireGuard is a Technology Preview and FIPS mode must be disabled. Added a prerequisite for FIPS mode and corrected the conclusion to avoid implying production-supported status on RHEL 9.

## Review Notes
The article uses `2001:db8::1` as an example endpoint, which is correct for documentation but must be replaced with a real server IPv6 address in a live deployment. The NAT66 example is technically valid when needed, but routing a provider-assigned IPv6 prefix to clients remains the cleaner operational design.
