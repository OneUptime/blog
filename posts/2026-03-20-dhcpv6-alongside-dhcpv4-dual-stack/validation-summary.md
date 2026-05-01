# Validation Summary: How to Run DHCPv6 Alongside DHCPv4 for Dual-Stack Networks

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- ISC DHCP (`dhcpd`, `dhclient`, `dhcpd.conf`, `dhcpd6.conf`)
- DHCPv4
- DHCPv6
- SLAAC
- Router Advertisements
- `radvd`
- systemd service management on Debian/Ubuntu

## Sources Consulted
- ISC DHCP 4.4 `dhcpd` man page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpd
- ISC DHCP 4.4 `dhcpd.conf` man page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.4 `dhcp-options` man page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- ISC DHCP 4.4 `dhclient` man page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclient
- Debian source for `isc-dhcp-server` init script (`INTERFACESv4` / `INTERFACESv6`, separate `-4` and `-6` instances): https://sources.debian.org/src/isc-dhcp/4.3.5-3%2Bdeb9u1/debian/isc-dhcp-server.init.d/
- Debian package file list for `isc-dhcp-server`: https://packages.debian.org/bookworm/amd64/isc-dhcp-server/filelist
- Debian man page for `dhcp-lease-list(8)`: https://manpages.debian.org/bookworm/isc-dhcp-server/dhcp-lease-list.8.en.html
- Debian man page for `radvd.conf(5)`: https://manpages.debian.org/unstable/radvd/radvd.conf.5.en.html
- Debian man page for `rdisc6(8)`: https://manpages.debian.org/testing/ndisc6/rdisc6.8.en.html
- RFC 9915 (DHCPv6): https://datatracker.ietf.org/doc/html/rfc9915
- RFC 4862 (SLAAC): https://datatracker.ietf.org/doc/html/rfc4862

## Issues Found
- The post referred to a separate `isc-dhcp-server6` systemd unit and said ISC DHCP 4.4+ could run DHCPv4 and DHCPv6 "in the same process". I corrected this to Debian/Ubuntu's actual model: one `isc-dhcp-server` service can launch separate `dhcpd -4` and `dhcpd -6` processes, configured with `INTERFACESv4` and `INTERFACESv6`.
- The post used `INTERFACES_V4` and `INTERFACES_V6`, which are not the Debian/Ubuntu variable names. I changed them to `INTERFACESv4` and `INTERFACESv6`.
- The DHCPv6 configuration block included `authoritative;`, which is a DHCPv4-oriented setting and not needed for the DHCPv6 example. I removed it.
- The DHCPv6 lifetime comment said "Preferred and valid lifetimes" while the snippet only set `default-lease-time` and `max-lease-time`. I corrected the comment to match the actual settings.
- The `radvd` example set `AdvRouterAddr on`, which is for Mobile IPv6 behavior and not part of a normal SLAAC setup. I removed it.
- The post suggested `dhcp-lease-list --v6`, but `dhcp-lease-list(8)` documents only DHCPv4 lease-file reporting. I removed the invalid DHCPv6 command and kept DHCPv6 lease-file inspection.
- The restart command referenced `isc-dhcp-server6`. I corrected it to `sudo systemctl restart isc-dhcp-server` for the Debian/Ubuntu packaging model.
- The testing section used only `dhclient -6` and did not distinguish stateful from stateless DHCPv6 verification. I relabeled the stateful test and added `dhclient -6 -S` for the stateless DHCPv6 + SLAAC path.

## Review Notes
- ISC DHCP 4.4 is end-of-life/deprecated according to ISC. The post is still technically valid for existing ISC DHCP deployments, but new deployments should generally evaluate Kea instead.
