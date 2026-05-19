# Validation Summary: How to Configure DHCPv6 Server on Ubuntu

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ubuntu
- ISC DHCP Server / DHCPv6
- Kea DHCPv6 Server
- IPv6 SLAAC and Router Advertisements
- radvd
- DHCPv6 prefix delegation
- dhclient, wide-dhcpv6-client, tcpdump, systemd

## Sources Consulted
- ISC DHCP 4.4 `dhcpd.conf` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.4 `dhcpd` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpd
- ISC DHCP EOL notice: https://kb.isc.org/docs/isc-dhcp-eol-dates
- ISC Kea DHCP page: https://www.isc.org/kea/
- Kea DHCPv6 Administrator Reference Manual: https://kea.readthedocs.io/en/kea-2.5.2/arm/dhcp6-srv.html
- Debian/Ubuntu package metadata and packaged systemd units for `isc-dhcp-server`, `kea-dhcp6-server`, and `radvd`
- Debian `radvd.conf(5)` man page: https://manpages.debian.org/unstable/radvd/radvd.conf.5.en.html
- RFC 8415, Dynamic Host Configuration Protocol for IPv6: https://www.rfc-editor.org/rfc/rfc8415
- RFC 4861, Neighbor Discovery for IP version 6: https://www.rfc-editor.org/rfc/rfc4861

## Issues Found
- The ISC DHCPv6 start, status, and journal commands used the IPv4 `isc-dhcp-server` unit. Changed them to `isc-dhcp-server6`, matching the Ubuntu packaged IPv6 systemd unit and `/etc/dhcp/dhcpd6.conf`.
- The ISC installation comment described ISC DHCP only as older. Updated it to note that ISC DHCP is legacy/EOL upstream while still packaged by Ubuntu.
- The fixed-address example said to get the client DUID with `ip -6 address show`, which does not show the DHCPv6 DUID. Changed the comment to point to the client's DHCPv6 lease file.
- The Kea subnet example omitted an explicit subnet `id`. Added `"id": 1` because Kea 2.4 and later warn about auto-generated subnet IDs and the feature is deprecated.
- The Kea prefix delegation example used `prefix-len: 48` with a non-/48-aligned prefix. Changed the prefix to `2001:db8:1234::` so it matches the declared `/48`.
- The radvd stateful example included `AdvRouterAddr on`, which is for Mobile IPv6 behavior and is not needed for a normal DHCPv6/RA setup. Removed it.
- The testing section used `dhclient` without installing the ISC DHCP client package. Added `sudo apt install isc-dhcp-client -y` before the `dhclient -6` command.

## Review Notes
- Kea is the better recommendation for new deployments because ISC DHCP is no longer maintained upstream, although Ubuntu still packages ISC DHCP.
- Some client operating systems vary in how they honor DHCPv6 RA flags, especially for stateful addressing, so real client behavior should still be tested on the target network.
