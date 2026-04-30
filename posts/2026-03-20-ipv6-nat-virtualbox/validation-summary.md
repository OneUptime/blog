# Validation Summary: How to Configure IPv6 NAT Networking in VirtualBox

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- VirtualBox networking
- `VBoxManage`
- IPv6
- NAT and NAT Network
- NAT66
- nftables
- Linux host networking

## Sources Consulted
- Oracle VirtualBox User Manual, Chapter 6: Virtual Networking: https://www.virtualbox.org/manual/ch06.html
- Oracle VirtualBox User Manual, Chapter 8: `VBoxManage`: https://www.virtualbox.org/manual/ch08.html
- Oracle VirtualBox Changelog 6.1: https://www.virtualbox.org/wiki/Changelog-6.1
- Oracle VirtualBox Changelog 7.1: https://www.virtualbox.org/wiki/Changelog-7.1
- Oracle VirtualBox source, `VBoxManageNATNetwork.cpp`: https://github.com/VirtualBox/virtualbox/blob/main/src/VBox/Frontends/VBoxManage/VBoxManageNATNetwork.cpp
- Oracle VirtualBox source, `NATNetworkImpl.cpp`: https://github.com/VirtualBox/virtualbox/blob/main/src/VBox/Main/src-server/NATNetworkImpl.cpp
- Oracle VirtualBox source, `VBoxNetSlirpNAT.cpp`: https://github.com/VirtualBox/virtualbox/blob/main/src/VBox/NetworkServices/NAT/VBoxNetSlirpNAT.cpp
- Oracle VirtualBox source, `network_hostonly.dita`: https://github.com/VirtualBox/virtualbox/blob/main/doc/manual/en_US/dita/topics/network_hostonly.dita
- RFC 6296, IPv6-to-IPv6 Network Prefix Translation: https://www.rfc-editor.org/rfc/rfc6296
- nftables wiki, Performing Network Address Translation (NAT): https://wiki.nftables.org/wiki-nftables/index.php/Performing_Network_Address_Translation_%28NAT%29

## Issues Found
- The post claimed VirtualBox NAT mode uses NPTv6. I removed that claim because the current VirtualBox documentation and source describe IPv6-capable NAT, but not RFC 6296 NPTv6 behavior.
- The post claimed NAT Network provides DHCPv6. I corrected this to router advertisements and SLAAC after verifying in `VBoxNetSlirpNAT.cpp` that IPv6 configuration is advertised via RA and RDNSS.
- The NAT Network example used outdated or incorrect CLI options and syntax. I fixed `--ipv6prefix` to `--ipv6-prefix`, added `--ipv6-default on` so the example actually advertises a default IPv6 route, and corrected `natnetwork start` and `natnetwork modify` usage to include `--netname`.
- The post implied a deterministic guest IPv6 address such as `fd17:625c:f037:cafe::100`. I changed the verification language to describe an address from the configured `/64` and added comments that port-forward/NAT66 examples must use the guest's actual IPv6 address.
- The host-side translation section labeled nftables `snat`/`dnat` rules as NPTv6. I corrected the section to NAT66 because those rules are stateful NAT, not RFC 6296 prefix translation.
- The host-only IPv6 example used invalid IPv6 literals such as `fd00:vbox::1`. I replaced them with valid ULA addresses and added the documented `/etc/vbox/networks.conf` requirement for Linux, macOS, and Solaris hosts when using non-link-local IPv6 ranges on host-only adapters.
- The host-side test `ping6 fd17:625c:f037:cafe::1` from the host was misleading because the host is not attached to the NAT Network as a regular interface. I replaced that with a supported host-side inspection command.
- The DHCP lease lookup example was presented in an IPv6 context. I clarified that `VBoxManage dhcpserver findlease` is relevant to the NAT Network's IPv4 DHCP lease, not guest IPv6 SLAAC addressing.

## Review Notes
- Oracle's public manual lags the current source in a few NAT Network IPv6 details. The current source shows support for `--ipv6-prefix` and `--ipv6-default`, while the published manual pages still emphasize the older option set.
- The NAT mode section remains intentionally conservative because Oracle's public docs provide less detail for per-VM NAT IPv6 behavior than for NAT Network mode.
- Recent macOS releases use host-only networks instead of host-only adapters; the post's host-only adapter commands are primarily applicable to Linux and Windows, with the documented caveat noted above.
