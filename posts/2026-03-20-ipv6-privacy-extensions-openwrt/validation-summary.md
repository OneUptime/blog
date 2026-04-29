# Validation Summary: How to Configure IPv6 Privacy Extensions on OpenWrt

## Status
validated

## Post Type
Configuration Guide / Tutorial

## Technologies Covered
- OpenWrt network configuration (`/etc/config/network`, UCI, `wan6`)
- OpenWrt IPv6 client stack (`odhcp6c`)
- OpenWrt Router Advertisement service (`odhcpd`)
- Linux IPv6 sysctls (`use_tempaddr`, `addr_gen_mode`, `stable_secret`)
- IPv6 SLAAC temporary addresses and stable privacy addresses
- LuCI network interface configuration

## Sources Consulted
- [OpenWrt Wiki: IPv6 configuration](https://openwrt.org/docs/guide-user/network/ipv6/configuration)
- [OpenWrt Wiki: odhcpd technical reference](https://openwrt.org/docs/techref/odhcpd)
- [OpenWrt `odhcp6c` client script (`dhcpv6.sh`)](https://raw.githubusercontent.com/openwrt/openwrt/master/package/network/ipv6/odhcp6c/files/dhcpv6.sh)
- [OpenWrt `odhcpd` defaults](https://raw.githubusercontent.com/openwrt/openwrt/master/package/network/services/odhcpd/files/odhcpd.defaults)
- [OpenWrt `/etc/sysctl.conf` base file](https://raw.githubusercontent.com/openwrt/openwrt/master/package/base-files/files/etc/sysctl.conf)
- [OpenWrt `sysctl` init script](https://raw.githubusercontent.com/openwrt/openwrt/master/package/base-files/files/etc/init.d/sysctl)
- [OpenWrt network hotplug sysctl handler](https://raw.githubusercontent.com/openwrt/openwrt/master/package/base-files/files/etc/hotplug.d/net/00-sysctl)
- [LuCI DHCPv6 protocol UI (`dhcpv6.js`)](https://raw.githubusercontent.com/openwrt/luci/master/protocols/luci-proto-ipv6/htdocs/luci-static/resources/protocol/dhcpv6.js)
- [LuCI network interfaces UI (`interfaces.js`)](https://raw.githubusercontent.com/openwrt/luci/master/modules/luci-mod-network/htdocs/luci-static/resources/view/network/interfaces.js)
- [Linux kernel IP sysctl documentation](https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html)
- [ip-link(8) manual page](https://man7.org/linux/man-pages/man8/ip-link.8.html)
- [RFC 7217: Stable and Opaque IIDs with SLAAC](https://www.rfc-editor.org/rfc/rfc7217)
- [RFC 8981: Temporary Address Extensions for SLAAC in IPv6](https://www.rfc-editor.org/rfc/rfc8981)

## Issues Found
1. The post claimed OpenWrt exposes a `privext` UCI option on `network.wan` / `network.wan6` to enable privacy extensions. Current OpenWrt documentation, `odhcp6c` source, and LuCI sources do not expose such an option. I removed the incorrect `privext` examples and replaced them with accurate `wan6` configuration plus the correct Linux `use_tempaddr` sysctl instructions.
2. The original UCI example targeted `network.wan` and implied `reqaddress` enabled privacy extensions. In OpenWrt, the DHCPv6 client is configured on `wan6`, and `reqaddress` only controls DHCPv6 IA_NA address requests. I corrected the examples to use `wan6` and explicitly separated DHCPv6 address requests from temporary SLAAC address generation.
3. The `/etc/config/network` example used `option ifname 'eth1'`, which is outdated for the OpenWrt 21.02+ context used by the post. OpenWrt's current documentation uses `option device` for the `wan6` interface. I updated the snippet to `option device '@wan'`.
4. The verification and explanation sections conflated `addr_gen_mode` with temporary-address privacy. Linux documents `use_tempaddr` as the control for temporary addresses and `addr_gen_mode` as the control for stable/autoconfigured address generation. I corrected the checking and enablement steps so `use_tempaddr` is used for temporary addresses and `addr_gen_mode` is described as a separate stable-address setting.
5. The LAN-client section incorrectly said OpenWrt uses `radvd` and instructed readers to edit `/etc/radvd.conf`. Current OpenWrt defaults use `odhcpd` for Router Advertisements and SLAAC. I replaced the `radvd` example with an `odhcpd` `/etc/config/dhcp` example and clarified that client operating systems, not the router, decide whether to create temporary addresses.
6. The LuCI section claimed there is a web UI control labeled "Privacy Extensions" or "Use temporary addresses" for `wan6`. Current LuCI sources expose DHCPv6 options such as `reqaddress` and `reqprefix`, but not a dedicated privacy-extension toggle. I rewrote the LuCI guidance to match the actual UI and noted that router-side privacy is still configured through sysctls.
7. The verification step used `curl -6 https://ifconfig.me`, which is not a safe assumption on a stock OpenWrt image. I replaced it with `ip -6 route get ...`, which verifies the preferred IPv6 source address using tooling that is standard in OpenWrt.

## Review Notes
- `use_tempaddr` only affects autoconfigured IPv6 addresses. If the upstream provides only DHCPv6 IA_NA addresses and no SLAAC-derived address on the WAN interface, enabling `use_tempaddr` alone will not create temporary addresses.
- On PPP-based uplinks, OpenWrt's IPv6 documentation notes that the parent `wan` interface may also need `option ipv6 '1'`. The post does not cover PPP-specific setup beyond using `@wan` for `wan6`.
- RFC 8981 obsoletes RFC 4941 for temporary SLAAC addresses. The post still uses the older RFC4941 tag, which is understandable because Linux and OpenWrt documentation commonly discuss the feature generically as privacy extensions, but future metadata cleanup could add RFC 8981 as well.
- Local checks: `validation.json` was validated with `jq`. Runtime validation on a live OpenWrt system was not possible in this workspace, so the review relied on official OpenWrt documentation, current LuCI/OpenWrt source, Linux kernel documentation, and the relevant RFCs.
