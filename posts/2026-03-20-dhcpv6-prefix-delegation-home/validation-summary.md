# Validation Summary: How to Configure DHCPv6 Prefix Delegation for Home Networks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- DHCPv6 Prefix Delegation (IA_PD)
- IPv6 Router Advertisements
- systemd-networkd
- OpenWrt networking (`odhcp6c` / UCI)
- ISC Kea DHCPv6
- Linux `iproute2`

## Sources Consulted
- RFC 8415: https://www.rfc-editor.org/rfc/rfc8415
- systemd.network(5): https://www.freedesktop.org/software/systemd/man/254/systemd.network.html
- networkctl(1): https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- OpenWrt IPv6 configuration: https://openwrt.org/docs/guide-user/network/ipv6/configuration
- OpenWrt network configuration: https://openwrt.org/docs/guide-user/network/network_configuration
- ISC DHCP product / EOL notice: https://www.isc.org/dhcp/
- ISC DHCP 4.4 `dhclient.conf` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclientconf
- ISC DHCP 4.4 `dhcp-options` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- Kea DHCPv6 server reference: https://kea.readthedocs.io/en/latest/arm/dhcp6-srv.html
- Kea API reference: https://kea.readthedocs.io/en/latest/api.html
- Kea Management API / control channel reference: https://kea.readthedocs.io/en/latest/arm/ctrl-channel.html

## Issues Found
- The original Linux example used ISC `dhclient`, which ISC marks as end-of-life and no longer maintained. I replaced that section with a current `systemd-networkd` DHCPv6-PD example from the official `systemd.network` documentation.
- The original `dhclient` example also used incorrect details for DHCPv6 PD, including manual `dhcp6.ia-pd` configuration, the wrong DNS option name, and a non-default config path. Removing the legacy example avoided publishing unsupported syntax.
- The overview said the router sub-delegates smaller prefixes to LAN devices. I corrected this to assigning /64s to LAN interfaces or delegating to downstream routers, which matches RFC 8415 behavior.
- The sequence diagram implied the client directly requests a `/56` or `/48`. I corrected this to an optional prefix-length hint, which is the standards-based behavior.
- The manual LAN distribution section implied that assigning an address and enabling forwarding was sufficient. I added the required Router Advertisement step with a minimal `radvd` configuration so LAN hosts can actually autoconfigure IPv6.
- The Kea example omitted a required subnet `id` and used a non-canonical pool prefix for a `/32` delegation pool. I added `"id": 1` and corrected the pool prefix to `2001:db8::`.
- The OpenWrt example used legacy `ifname` keys in `config interface` sections. I updated them to the current `device` syntax documented by OpenWrt.
- The verification commands were not accurate as written. I replaced the Linux/OpenWrt checks with documented `networkctl`, `ifstatus`, and `ip -6 addr show` usage, and corrected the Kea Control Agent request to include the JSON content type and the `lease_cmds` requirement.

## Review Notes
- `systemd-networkd` is a current Linux example, but it is not the only maintained way to do DHCPv6-PD on Linux.
- OpenWrt's documented `ip6assign '60'` setting is valid and common, even though some single-LAN home networks may prefer a `/64`.
- The Kea lease lookup command assumes the Control Agent is listening on `127.0.0.1:8000` and that the `lease_cmds` hook library is enabled.
