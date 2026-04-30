# Validation Summary: How to Fix MTU-Related Connectivity Problems (Packet Too Large)

## Status
validated

## Post Type
Guide

## Technologies Covered
- MTU
- Path MTU Discovery (PMTUD)
- ICMP and ICMPv6
- Linux networking tools (`ping`, `tracepath`, `ip`, `iptables`, `nmcli`)
- Netplan
- Windows networking tools (`ping`, `netsh`)
- macOS `networksetup`

## Sources Consulted
- RFC 1191, Path MTU Discovery: https://www.rfc-editor.org/rfc/rfc1191.html
- RFC 8201, Path MTU Discovery for IP version 6: https://www.rfc-editor.org/rfc/rfc8201
- `ping(8)` local help/man page from iputils (`ping -h`, `man ping`)
- `tracepath(8)` local man page from iputils (`tracepath -h`, `man tracepath`)
- `ip(8)` local help output (`ip link help`)
- `iptables-extensions(8)` local help/man page (`iptables -j TCPMSS -h`, `iptables -p icmp -h`, `man iptables-extensions`)
- NetworkManager Reference Manual (`nm-settings-nmcli`): https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- Netplan documentation: https://netplan.readthedocs.io/_/downloads/en/0.105/pdf/
- Microsoft Learn, `ping`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping
- Microsoft Learn, `netsh interface`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Apple Support, `networksetup` overview: https://support.apple.com/guide/remote-desktop/about-networksetup-apdd0c5a2d5/mac
- `networksetup(8)` man page mirror of Apple command syntax: https://keith.github.io/xcode-man-pages/networksetup.8.html

## Issues Found
- The post incorrectly called IPv4 ICMP type 3 code 4 "Packet Too Big". I changed this to the correct IPv4 name, "Fragmentation Needed", and clarified that "Packet Too Big" is the ICMPv6 message name.
- The PMTU binary-search script used `HIGH=1500` while `ping -s` expects payload bytes, not total packet size, and it assumed `LOW=576` was a known-good payload. I changed the search range to use payload bytes directly, with an upper bound of `1472` for a 1500-byte IPv4 packet (`1472` payload + `28` bytes of IPv4 and ICMP headers) and a safe lower bound of `0`.
- The `tracepath` description said it discovers PMTU "at each hop". I corrected that to say it discovers the path MTU and shows where it changes, which matches `tracepath(8)` behavior.
- The Linux `ifconfig` example was presented as a normal equivalent. I marked it as a legacy alternative because modern Linux systems typically use `ip`, and `ifconfig` may not be installed.
- The persistent `iptables-save` example used `sudo iptables-save > /etc/iptables/rules.v4`, which does not elevate the shell redirection. I changed it to `sudo sh -c 'iptables-save > /etc/iptables/rules.v4'` and noted that this persistence path is for systems using `iptables-persistent` or `netfilter-persistent`.

## Review Notes
- The post is now technically accurate for the commands and protocol behavior it describes, but most hands-on examples are IPv4-centric even though the title mentions "Packet Too Large". For IPv6-specific troubleshooting, the relevant control message is ICMPv6 Packet Too Big and the minimum IPv6 link MTU rules from RFC 8201 apply.
- The `iptables` examples are valid, but some current Linux systems prefer `nftables` operationally. This is not incorrect for the post as written.
