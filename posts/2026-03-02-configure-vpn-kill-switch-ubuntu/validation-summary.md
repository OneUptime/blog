# Validation Summary: How to Configure VPN Kill Switch on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- iptables / ip6tables
- UFW
- WireGuard and wg-quick
- OpenVPN
- systemd services
- netfilter-persistent / iptables-persistent
- DNS leak prevention

## Sources Consulted
- WireGuard wg-quick manual: https://git.zx2c4.com/wireguard-tools/tree/src/man/wg-quick.8
- OpenVPN 2.6 manual: https://openvpn.net/community-docs/community-articles/openvpn-2-6-manual.html
- systemd network target documentation: https://systemd.io/NETWORK_ONLINE/
- Ubuntu ufw man page: https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- Ubuntu netfilter-persistent man page: https://manpages.ubuntu.com/manpages/focal/man8/netfilter-persistent.8.html
- iptables-extensions man page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Local command checks: `ufw --help`, `openvpn --help`, `iptables-translate`, `bash -n`, `systemd-analyze verify`

## Issues Found
- The OpenVPN section used `block-outside-dns` as a Linux DNS leak prevention option. OpenVPN documents this option as Windows-specific and unsupported on non-Windows platforms, so it was removed from the Ubuntu example.
- The OpenVPN section implied `dhcp-option DNS` directly enforces VPN DNS on Linux. OpenVPN stores those options in `foreign_option_*` environment variables on Linux unless a helper script or plugin applies them, so the text was corrected to state that requirement.
- The OpenVPN kill-switch script matched against `$(cat /proc/sys/net/ipv4/conf/tun0/rp_filter)` as an iptables packet mark. `rp_filter` is a reverse-path filtering sysctl value, not OpenVPN's packet mark. The example now uses OpenVPN's `mark 0x1` option and matches that mark in the iptables rules.
- The OpenVPN scripts hard-coded `tun0`. They now use OpenVPN's `$dev` script environment variable so the rules match the actual tunnel device.
- The systemd service used `Before=network.target` while claiming it applied the firewall before network traffic could flow. systemd documents `network-pre.target` as the ordering point intended for firewall setup before interface configuration, so the unit now uses `Before=network-pre.target` with `Wants=network-pre.target`, and the surrounding claim was narrowed accordingly.
- The DNS leak prevention iptables examples placed negation after the destination port match. While current `iptables-translate` accepted it, the rules were rewritten to the conventional documented form `! -o tun0` before the interface match.

## Review Notes
- The main iptables, UFW, WireGuard, persistence, and testing examples are technically plausible after the fixes.
- The iptables script intentionally flushes existing rules and sets restrictive default policies. That is technically valid for a tutorial example, but readers should adapt it carefully on hosts that already depend on firewall rules or remote management access.
- Ubuntu uses iptables-nft by default on modern releases, but the iptables compatibility commands remain valid.
