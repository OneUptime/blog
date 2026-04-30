# Validation Summary: How to Set Up a Guest WiFi Network with Isolated IPv4 Addressing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux networking with `iproute2`
- IPv4 subnetting and VLANs
- `iptables`/Netfilter firewalling and NAT
- ISC DHCP server (`dhcpd`)
- OpenWrt wireless and network UCI configuration
- Linux traffic control with `tc`/HTB
- Client isolation with AP isolation or `ebtables`

## Sources Consulted
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- ISC DHCP 4.4 `dhcpd.conf` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- Netfilter / iptables documentation index: https://www.iptables.org/documentation/
- `iptables-extensions(8)` reference: https://man.he.net/man8/iptables-extensions
- OpenWrt network configuration reference: https://openwrt.org/docs/guide-user/network/network_configuration
- OpenWrt guest Wi-Fi guide: https://openwrt.org/docs/guide-user/network/wifi/guestwifi/guest-wlan
- OpenWrt wireless configuration reference: https://openwrt.org/docs/guide-user/network/wifi/basic
- `tc-htb(8)` reference: https://manpages.debian.org/trixie/iproute2/tc-htb.8.en.html
- `tc-fw(8)` reference: https://manpages.debian.org/unstable/iproute2/tc-fw.8.en.html
- Red Hat VLAN configuration example for `ip link`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/networking_guide/sec-configure_802_1q_vlan_tagging_using_the_command_line
- Local CLI help used to verify command syntax: `ip link help`, `iptables -m conntrack -h`, `tc filter add fw help`

## Issues Found
- The firewall example used `-m state --state ESTABLISHED,RELATED`. I changed it to `-m conntrack --ctstate ESTABLISHED,RELATED` because current iptables documentation describes `state` as a subset of the `conntrack` match, and `conntrack` is the current interface to document.
- The OpenWrt `/etc/config/network` snippet used legacy interface syntax with `option ifname` and put the bridge definition directly in the `config interface` block. I replaced it with a current `config device` bridge plus `config interface` using `option device`, which matches current OpenWrt documentation.
- The bandwidth-limiting section claimed `20 Mbps down, 10 Mbps up`, but the commands only created one HTB egress policy on `eth1`, so they did not implement both directions. I corrected the text to describe an upload-only example, added an explicit default class, and made the packet marking/filtering target the WAN egress path consistently.
- The HTB qdisc originally used `default 30` without defining a `1:30` class. I added a real default class so unclassified traffic maps to an existing class, which is required by `tc-htb(8)`.

## Review Notes
- The `iptables` examples are valid on systems using legacy `iptables` or the common `iptables-nft` compatibility layer, but many modern distributions prefer native `nftables` for new deployments.
- Service names and interface names are environment-specific. For example, `isc-dhcp-server`, `eth0`, `eth1`, and `wlan0` may differ across distributions and hardware.
