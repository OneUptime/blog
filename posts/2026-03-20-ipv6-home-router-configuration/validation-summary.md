# Validation Summary: How to Configure IPv6 on a Home Router

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- IPv6
- DHCPv6 Prefix Delegation (DHCPv6-PD)
- SLAAC
- Router Advertisements
- Linux networking
- `dhcpcd`
- NetworkManager / `nmcli`
- `radvd`
- `iproute2`
- `ip6tables`

## Sources Consulted
- `dhcpcd.conf(5)` man page: https://manpages.debian.org/bookworm/dhcpcd-base/dhcpcd.conf.5.en.html
- `dhcpcd-run-hooks(8)` man page: https://manpages.debian.org/testing/dhcpcd-base/dhcpcd-run-hooks.8.en.html
- NetworkManager `nm-settings-nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager D-Bus settings reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-dbus.html
- `radvd.conf(5)` man page source: https://sources.debian.org/src/radvd/1%3A2.18-3/radvd.conf.5.man
- Linux kernel `ip-sysctl` documentation: https://docs.kernel.org/6.1/networking/ip-sysctl.html
- `iptables-extensions(8)` man page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `ip-address(8)` man page: https://manpages.debian.org/bookworm/iproute2/ip-address.8.en.html
- RFC 8415, DHCP for IPv6: https://www.rfc-editor.org/rfc/rfc8415
- RFC 4861, Neighbor Discovery for IPv6: https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- RFC 8106, IPv6 Router Advertisement Options for DNS Configuration: https://www.rfc-editor.org/rfc/rfc8106
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://www.rfc-editor.org/rfc/rfc4890.html

## Issues Found
- The post stated that ISPs "typically" delegate `/56` or `/48` prefixes. That varies significantly by provider, so I changed the wording to the more generally correct statement that the ISP delegates a prefix via DHCPv6-PD.
- The DHCPv6-PD diagram implied the WAN interface "uses" the delegated prefix directly. I changed it to distinguish the WAN IA_NA address from the delegated prefix, which is the accurate model for DHCPv6-PD.
- The `dhcpcd` example comment said it was requesting a `/56`, but the shown `ia_pd` line did not actually request that exact size. I corrected the wording and added the documented `noipv6rs` global pattern with `ipv6rs` enabled only on the WAN interface, matching the `dhcpcd.conf(5)` guidance for PD setups.
- The NetworkManager path used `ipv6.method manual` with a hardcoded LAN prefix, which is not the correct way to distribute a delegated prefix that may change. I replaced it with `ipv6.method shared` on the LAN side and used `ipv6.dhcp-pd-hint` on the WAN side.
- The `radvd` example hardcoded `2001:db8:1:1::/64`, which does not adapt cleanly when the delegated prefix changes. I changed it to `prefix ::/64`, which `radvd` documents as advertising the non-link-local prefix currently assigned to the interface.
- The dynamic prefix section claimed `dhcpcd` with `ia_pd` handled `radvd` updates automatically, but the example hook did not actually update the configuration and used less specific trigger reasons. I corrected it to reload `radvd` on the documented `DELEGATED6` hook reason.
- The verification step told readers to verify the delegated prefix on `eth0`, which is misleading because the delegated /64 is typically assigned to the LAN side, not shown as the WAN interface prefix. I changed the checks to verify the WAN address/default route and the LAN global `/64`.
- The firewall snippet used the older `state` match and included a redundant forwarded ICMPv6 rule after the inbound drop rule. I updated the example to a cleaner `conntrack`-based forwarding baseline and removed the misleading extra rule.

## Review Notes
- The post remains a minimal home-router baseline, not a complete hardened firewall guide. If the router's `INPUT` policy is later restricted, router-local ICMPv6 still needs to be permitted for IPv6 to work correctly.
- The package installation commands assume a Debian/Ubuntu-style system (`apt-get`, `systemctl`).
- The example delegated prefix uses the documentation range `2001:db8::/32`, which is correct for examples but not routable on the public Internet.
