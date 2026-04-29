# Validation Summary: How to Configure IPv6 Router Advertisements on OpenWrt

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenWrt
- odhcpd
- UCI
- LuCI
- IPv6 Router Advertisements
- SLAAC
- DHCPv6
- RDNSS/DNSSL

## Sources Consulted
- OpenWrt `odhcpd` upstream README: https://github.com/openwrt/odhcpd/blob/master/README.md
- OpenWrt `odhcpd` CLI source: https://github.com/openwrt/odhcpd/blob/master/src/odhcpd.c
- OpenWrt `odhcpd` RA/DNS implementation: https://github.com/openwrt/odhcpd/blob/master/src/router.c
- OpenWrt default `odhcpd` UCI setup: https://github.com/openwrt/openwrt/blob/master/package/network/services/odhcpd/files/odhcpd.defaults
- LuCI network interface settings UI: https://github.com/openwrt/luci/blob/master/modules/luci-mod-network/htdocs/luci-static/resources/view/network/interfaces.js
- OpenWrt package manager docs: https://openwrt.org/docs/guide-user/additional-software/managing_packages
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861.html
- RFC 8106, IPv6 Router Advertisement Options for DNS Configuration: https://www.rfc-editor.org/rfc/rfc8106
- RFC 9096, Improving the Reaction of Customer Edge Routers to IPv6 Renumbering Events: https://www.rfc-editor.org/rfc/rfc9096.html

## Issues Found
- The post used `odhcpd --version`, but upstream `odhcpd` does not document a `--version` flag. I replaced it with a package query that works across current OpenWrt package-manager generations: `opkg ... || apk ...`.
- The post used `ra_management` for M/O flag behavior. Current `odhcpd` documents `ra_flags` with `managed-config` and `other-config` instead. I updated the DHCPv6 integration section and conclusion accordingly, and set `dhcpv6=server` in the example so the snippet matches the described behavior.
- The `hybrid` mode explanation was too loose. I corrected it to match current LuCI/OpenWrt behavior: relay when a designated master interface is active, otherwise fall back to server mode.
- The DNS-over-RA section title said only `RDNSS`, but the example also configured DNS search domains, which are carried by `DNSSL`. I corrected the heading to `RDNSS/DNSSL`.
- The LuCI navigation text did not match current labels exactly. I updated it to the current `IPv6 Settings` tab and `Announce IPv4/6 DNS servers` field.
- The debugging section set the system log level and used `odhcpd -v`, which is not a valid debug invocation. I changed it to set `dhcp.odhcpd.loglevel=7` and to use `odhcpd -f -l 7`, which matches upstream CLI handling.
- The client verification section used `systemd-resolve --status`, which has been superseded by `resolvectl status` on current systemd-based clients. I updated the command.

## Review Notes
- The post remains technically valid after correction, but `ra_default=1` is still a policy choice rather than a requirement for basic SLAAC. The default `ra_default=0` automatic behavior may be more appropriate on some networks.
- OpenWrt package-manager commands are version-sensitive now: OpenWrt 24.10 and older use `opkg`, while OpenWrt 25.12 and newer use `apk`.
