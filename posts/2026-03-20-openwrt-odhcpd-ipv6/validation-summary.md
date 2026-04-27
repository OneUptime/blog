# Validation Summary: How to Configure odhcpd for IPv6 on OpenWrt

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenWrt (21.02+, 22.03+)
- odhcpd (DHCPv6 server + RA daemon)
- odhcp6c (DHCPv6 client)
- UCI (Unified Configuration Interface)
- IPv6 / DHCPv6 / SLAAC / Router Advertisements
- fw4 / nftables (and legacy fw3 / iptables)
- dnsmasq (DNS resolver)

## Sources Consulted
- OpenWrt official docs — DHCP/odhcpd: https://openwrt.org/docs/guide-user/base-system/dhcp
- OpenWrt official docs — IPv6 configuration: https://openwrt.org/docs/guide-user/network/ipv6/configuration
- OpenWrt official docs — UCI firewall configuration: https://openwrt.org/docs/guide-user/firewall/firewall_configuration
- OpenWrt official docs — Network UCI configuration: https://openwrt.org/docs/guide-user/base-system/uci
- OpenWrt 22.03 release notes (fw4/nftables introduction): https://openwrt.org/releases/22.03/notes-22.03.0
- Default OpenWrt /etc/config/firewall (Allow-ICMPv6-Input rule)

## Issues Found
1. **Incorrect UCI syntax for multi-valued `icmp_type` field**: The original used `uci set firewall.@rule[-1].icmp_type='echo-request destination-unreachable'`, which assigns a single space-separated string to a single-valued option. The OpenWrt firewall expects `icmp_type` to be a list. Fixed by replacing with `uci add_list firewall.@rule[-1].icmp_type='...'` for each type.

2. **Insufficient ICMPv6 types for working IPv6**: The original rule allowed only `echo-request` and `destination-unreachable`, which would break NDP (neighbour discovery), router advertisements, and PMTUD — IPv6 cannot function correctly with such a restrictive rule. Expanded to match OpenWrt's default `Allow-ICMPv6-Input` ruleset, including `neighbour-solicitation`, `neighbour-advertisement`, `router-solicitation`, `router-advertisement`, `packet-too-big`, `time-exceeded`, `bad-header`, `unknown-header-type`, and `echo-reply`.

3. **Inaccurate prerequisite about fw4/nftables in OpenWrt 21.02+**: The original prerequisite read "OpenWrt 21.02+ (for improved IPv6 support with fw4/nftables)" — but fw4/nftables was introduced as the default firewall in OpenWrt 22.03, not 21.02 (which still uses fw3/iptables). Reworded to "OpenWrt 21.02+ recommended (22.03+ for fw4/nftables firewall)" to remove the conflation.

## Review Notes
- The `proto='icmp'` with `family='ipv6'` combination is correct and matches the OpenWrt default firewall convention for ICMPv6 rules.
- `option ip6assign '60'` on the LAN interface is the standard way to delegate a /60 portion of the WAN-delegated prefix; common values are 60, 62, or 64.
- `option ra_management '1'` correctly sets the M-flag (managed) for stateful DHCPv6 in the Router Advertisements, consistent with the `dhcpv6 'server'` setting.
- `ping6` is a valid BusyBox/iputils binary in current OpenWrt; modern Linux distributions sometimes prefer `ping -6`, but `ping6` continues to work on OpenWrt.
- The example LAN configuration uses `option device 'br-lan'` and `option proto 'static'`, which matches OpenWrt's default LAN interface configuration.
- The DHCP rule's `start '100'` and `limit '150'` are IPv4 lease parameters; they have no effect on the IPv6 (DHCPv6/RA) behavior controlled by `dhcpv6` and `ra` options on the same section. This is correct OpenWrt behaviour but might confuse readers — not corrected since the post is intentionally a combined IPv4+IPv6 LAN config.
- The post does not mention disabling SLAAC if a stateful-only DHCPv6 deployment is desired (would require `ra_flags 'managed-config' 'other-config'` and not advertising the on-link prefix). This is out of scope for an introductory configuration guide.
