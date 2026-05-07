# Validation Summary: How to Configure 6rd on Customer Premises Equipment

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- 6rd
- DHCPv4 option 212
- OpenWrt
- Linux `iproute2`
- `iptables` / `ip6tables`
- `radvd`

## Sources Consulted
- RFC 5969, "IPv6 Rapid Deployment on IPv4 Infrastructures (6rd) -- Protocol Specification": https://www.rfc-editor.org/rfc/rfc5969
- OpenWrt UCI networking options cheatsheet: https://openwrt.org/docs/guide-user/network/ucicheatsheet
- OpenWrt 6rd protocol implementation (`6rd.sh`): https://raw.githubusercontent.com/openwrt/openwrt/master/package/network/ipv6/6rd/files/6rd.sh
- OpenWrt 6rd package metadata: https://raw.githubusercontent.com/openwrt/openwrt/master/package/network/ipv6/6rd/Makefile
- OpenWrt package index (release 24.10.6 base packages): https://downloads.openwrt.org/releases/24.10.6/packages/x86_64/base/Packages.gz
- ISC DHCP `dhclient.conf` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclientconf
- ISC DHCP `dhcp-options` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- iproute2 tunnel source (`iptunnel.c`): https://raw.githubusercontent.com/iproute2/iproute2/main/ip/iptunnel.c
- Local CLI help/manpages used to confirm syntax: `ip tunnel help`, `ip -6 route help`, `man ip-tunnel`, `iptables --help`, `ip6tables --help`, `man ping`

## Issues Found
- The DHCPv4 section requested `option 212` directly and described the option payload incorrectly. I changed it to ISC DHCP's `option-6rd` name and corrected the RFC 5969 layout: `IPv4MaskLen`, `6rdPrefixLen`, a fixed 16-byte IPv6 prefix field, and one or more BR IPv4 addresses.
- The post described `IPv4MaskLen` as "bits of IPv4 to embed", which is backwards. RFC 5969 defines it as the count of shared high-order IPv4 bits omitted before embedding. I corrected that explanation in both the DHCP section and the Linux example.
- The OpenWrt section said 6rd support came from `ds-lite` or `relay6rd`, which does not match current OpenWrt packaging. I corrected this to the `6rd` package and adjusted the `ip4prefixlen` comment to match OpenWrt's semantics.
- The Linux script used invalid `iproute2` 6rd syntax (`relay prefix` / `mappedlen`). I changed it to the actual `ip tunnel 6rd` arguments, `6rd-prefix` and `6rd-relay_prefix`, based on current `iproute2`.
- The Linux script set the tunnel IPv6 address with `/128`, which does not match how OpenWrt's 6rd implementation configures the tunnel-facing address. I changed it to use the 6rd prefix length on the tunnel address and changed the default route command to explicit IPv6 route syntax.
- The Linux example implied it handled arbitrary 6rd parameters, but its prefix calculation only works for a /32 6rd prefix with `IPv4MaskLen` 0. I kept the author's simple hex-based example and made that assumption explicit with a guard so the example is technically correct as written.
- The verification section used `ping6 ::198.51.100.1` as a BR test. That is misleading because the BR's IPv4 address is transport information for the tunnel, not a generally useful inner IPv6 echo target. I changed the check to IPv4 reachability to the BR and updated the IPv6 ping examples to `ping -6`.
- The firewall example inserted both rules with `iptables -I`, which placed the blanket protocol 41 DROP ahead of the ACCEPT rule and broke the intended policy. I fixed the insert order with explicit rule numbers and updated the IPv6 stateful return rule to `conntrack`.

## Review Notes
- The manual Linux example is now explicitly scoped to the common case of a `/32` 6rd prefix with `IPv4MaskLen` `0`. Other 6rd deployments need generalized prefix math or provider-specific automation.
- RFC 5969 says a 6rd tunnel MTU of 1480 is appropriate when the IPv4 MTU is known to be 1500, but the default SHOULD be 1280 when the path MTU is not otherwise known. The post's 1480 examples are acceptable, but deployment-specific.
