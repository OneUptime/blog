# Validation Summary: How to Configure an IPIP Tunnel with systemd-networkd

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- systemd-networkd (`.netdev` and `.network`)
- Linux IPIP tunnels
- `iproute2` (`ip tunnel`, `ip addr`, `ip route`)
- `networkctl`
- `iptables`
- `nftables`
- `tcpdump`

## Sources Consulted
- systemd.netdev: https://www.freedesktop.org/software/systemd/man/latest/systemd.netdev.html
- systemd.network: https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- networkctl: https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- systemd.syntax: https://www.freedesktop.org/software/systemd/man/latest/systemd.syntax.html
- RFC 2003, IP Encapsulation within IP: https://www.rfc-editor.org/rfc/rfc2003
- RFC 2784, Generic Routing Encapsulation: https://www.rfc-editor.org/rfc/rfc2784
- IANA Protocol Numbers: https://www.iana.org/assignments/protocol-numbers
- nftables chain configuration: https://wiki.nftables.org/wiki-nftables/index.php/Configuring_chains
- Local `ip-tunnel(8)`, `pcap-filter(7)`, `nft(8)`, and `iptables --help` from the installed system

## Issues Found
- The `.netdev` examples omitted `Independent=yes`. For tunnel netdevs, `Independent=` defaults to `false`, so a tunnel normally needs to be created from an underlying interface with `Tunnel=`. I added `Independent=yes` to both `ipip1.netdev` examples so the standalone `.netdev` + `.network` approach works as written.
- The primary `.netdev` example used inline trailing comments on `Local=` and `Remote=` lines. `systemd` configuration syntax only treats lines starting with `#` or `;` as comments, so those inline comments would be parsed as part of the value. I converted them to standalone comment lines.
- The `nftables` example was not a valid standalone ruleset because the base chain definitions were incomplete and only an input chain was shown. I replaced it with valid `input` and `output` base chains while keeping the intended IP protocol 4 accept rules.
- The `iptables` commands and `nftables` ruleset were mixed in one `bash` code block. I split them into separate `bash` and `nft` blocks so each example matches the syntax it uses.

## Review Notes
- `networkctl reload` is appropriate for first-time creation from new `.netdev` and `.network` files. On existing systems, some tunnel attribute changes may still require removing and recreating the netdev, depending on the setting and systemd/kernel version.
- The MTU example assumes a standard 1500-byte IPv4 underlay with no extra lower-layer encapsulation; that is the common case for IPIP and matches the post’s example.
