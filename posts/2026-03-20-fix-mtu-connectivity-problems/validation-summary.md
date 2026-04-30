# Validation Summary: How to Fix MTU-Related Connectivity Problems

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- MTU and PMTUD
- ICMP / ICMPv6
- `ping`, `tracepath`, `ip`, `tcpdump`, and `iptables`
- NetworkManager
- systemd-networkd
- ifupdown (`/etc/network/interfaces`)
- WireGuard
- Windows `netsh`

## Sources Consulted
- `ping(8)` (iputils): https://man7.org/linux/man-pages/man8/ping.8.html
- `tracepath(8)` (iputils): https://man7.org/linux/man-pages/man8/tracepath.8.html
- `ip-link(8)` (iproute2): https://man7.org/linux/man-pages/man8/ip-link.8.html
- `iptables-extensions(8)` TCPMSS target: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `pcap-filter(7)` filter syntax and ICMPv6 named values: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- NetworkManager `nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager MTU setting reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- `systemd.network(5)` `MTUBytes=`: https://www.freedesktop.org/software/systemd/man/247/systemd.network.html
- `interfaces(5)` for `/etc/network/interfaces` MTU syntax: https://manpages.debian.org/unstable/ifupdown/interfaces.5.en.html
- `wg-quick(8)` WireGuard `MTU` key: https://man7.org/linux/man-pages/man8/wg-quick.8.html
- Microsoft Learn `netsh interface`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- RFC 1191, Path MTU Discovery (IPv4): https://www.rfc-editor.org/rfc/rfc1191
- RFC 8201, Path MTU Discovery for IPv6: https://www.rfc-editor.org/rfc/rfc8201
- RFC 8899, PLPMTUD terminology for PTB messages: https://www.rfc-editor.org/rfc/rfc8899.html
- Debian `netfilter-persistent(8)`: https://manpages.debian.org/bookworm/netfilter-persistent/netfilter-persistent.8.en.html

## Issues Found
- The post described packet fragmentation in a way that only fit IPv4, but the article also used IPv6 PMTUD terminology. I corrected the explanation to distinguish IPv4 DF/fragmentation behavior from IPv6 Packet Too Big behavior, and updated the related PMTUD wording.
- The NetworkManager example used `eth0` as though `nmcli connection modify` operated on a device name. I changed it to `<connection-name>` and added a note, because the command modifies a connection profile.
- The TCP MSS clamping section said the sample `FORWARD` rule applied to all outgoing TCP traffic. I corrected the wording to say it applies to forwarded traffic through a Linux router/firewall, which matches the documented `TCPMSS` example.
- The explicit MSS example used `--set-mss 1400`, which confused MSS with MTU. I changed it to `1360` and documented that this corresponds to a 1400-byte IPv4 path MTU, consistent with TCPMSS behavior (`PMTU - 40` for IPv4).
- The ICMP verification section only showed the IPv4 fragmentation-needed case while using the IPv6-style "Packet Too Big" label. I renamed the section and added an IPv6 `tcpdump` example for ICMPv6 Packet Too Big messages.
- The persistence note for `iptables-save > /etc/iptables/rules.v4` was too universal. I qualified it as a Debian/Ubuntu `iptables-persistent` example path.

## Review Notes
- The VPN tunnel overhead table is usable as a quick rule of thumb, but several values are only approximate. In a future revision, it would be worth noting more explicitly that usable MTU varies with tunnel mode, outer IP version, and encapsulation/authentication options.
