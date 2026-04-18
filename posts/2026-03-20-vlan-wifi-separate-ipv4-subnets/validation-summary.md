# Validation Summary: How to Configure VLAN-Based WiFi with Separate IPv4 Subnets

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- 802.1Q VLAN tagging
- Linux `iproute2` (ip link VLAN sub-interfaces)
- ISC DHCP Server (dhcpd)
- Cisco IOS (VLAN and trunk port configuration)
- OpenWrt (UCI / `/etc/config/wireless`, `/etc/config/network`)
- iptables (FORWARD filtering and NAT/MASQUERADE)
- WiFi / SSID segmentation

## Sources Consulted
- IEEE 802.1Q standard (VLAN tagging) — https://standards.ieee.org/ieee/802.1Q/6844/
- iproute2 `ip-link` man page — https://man7.org/linux/man-pages/man8/ip-link.8.html
- ISC DHCP Server dhcpd.conf documentation — https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- Cisco IOS VLAN Configuration Guide — https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst2960/software/release/15-0_2_se/configuration/guide/scg_2960/swvlan.html
- OpenWrt Wireless configuration — https://openwrt.org/docs/guide-user/network/wifi/basic
- OpenWrt Network configuration — https://openwrt.org/docs/guide-user/base-system/basic-networking
- iptables man page — https://man7.org/linux/man-pages/man8/iptables.8.html

## Issues Found
No technical issues found.

- Linux `ip link add link eth0 name eth0.10 type vlan id 10` syntax is correct per iproute2.
- ISC dhcpd.conf `subnet`, `range`, `option routers`, `option domain-name-servers`, `default-lease-time` directives are valid.
- Cisco IOS `switchport mode trunk` and `switchport trunk allowed vlan` commands are correct for a trunk uplink.
- OpenWrt `config wifi-iface` options (`device`, `mode`, `ssid`, `key`, `encryption 'psk2'`, `network`) are valid; `psk2` maps to WPA2-PSK.
- iptables FORWARD and `nat POSTROUTING MASQUERADE` rules are syntactically correct and match the stated access policy (corporate full access, guest internet-only, IoT fully isolated — no MASQUERADE rule for VLAN 30, consistent with "no internet").

## Review Notes
- The OpenWrt `/etc/config/network` snippet uses the legacy `option type 'bridge'` + `option ifname 'eth0.X'` style. This still works on many devices but has been superseded by the DSA-based bridge/device syntax in OpenWrt 21.02+. Readers on newer OpenWrt releases may need to use `config device` + `list ports` with a bridge device definition.
- ISC dhcp-server is in legacy/maintenance status; Kea DHCP is its ISC-recommended successor. The provided `dhcpd.conf` syntax is still correct for isc-dhcp-server, which remains packaged in most mainstream distros.
- `iptables` is increasingly replaced by `nftables`/`nft` on modern distros. The shown commands still work via the `iptables-nft` compatibility layer, but readers on newer systems may prefer native `nft` rules.
- The post does not set `max-lease-time` in the DHCP scopes and does not include `authoritative;`. These are recommended but optional; defaults are sensible.
- The iptables FORWARD ruleset assumes a permissive default policy or an implicit INPUT/OUTPUT policy handled elsewhere. A production setup would typically include a default DROP FORWARD policy with explicit ACCEPTs, but that is outside the stated scope of "inter-VLAN firewall rules".
