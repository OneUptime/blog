# Validation Summary: How to Troubleshoot DHCPv6 Issues

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- DHCPv6
- IPv6 Router Advertisements and Neighbor Discovery
- Linux networking tools (`ip`, `ping6`, `journalctl`, `tcpdump`, `ip6tables`, `sysctl`)
- ISC DHCP (`dhclient`, `dhcrelay`, `dhcpd`)
- ISC Kea DHCPv6
- Wireshark DHCPv6 display filters

## Sources Consulted
- RFC 9915, Dynamic Host Configuration Protocol for IPv6 (DHCPv6) — https://datatracker.ietf.org/doc/html/rfc9915
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6) — https://datatracker.ietf.org/doc/html/rfc4861
- ISC DHCP 4.4 Manual Pages: `dhclient` — https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclient
- ISC DHCP 4.4 Manual Pages: `dhclient.conf` — https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclientconf
- ISC DHCP 4.4 Manual Pages: `dhcp-options` — https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- ISC DHCP 4.4 Manual Pages: `dhcpd.conf` — https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.4 Manual Pages: `dhcpd.leases` — https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdleases
- ISC DHCP 4.4 Manual Pages: `dhcrelay` — https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcrelay
- ISC Knowledge Base: Sending Commands to Kea DHCP via HTTP — https://kb.isc.org/docs/sending-commands-to-kea-via-http
- ISC Knowledge Base: Kea API and Control Sockets — https://kb.isc.org/docs/kea-api-sockets
- Kea Administrator Reference Manual: The DHCPv6 Server — https://kea.readthedocs.io/en/stable/arm/dhcp6-srv.html
- Kea API Reference — https://kea.readthedocs.io/en/stable/api.html
- Wireshark Display Filter Reference: DHCPv6 — https://www.wireshark.org/docs/dfref/d/dhcpv6.html

## Issues Found
1. The multicast ping example overstated what was being checked and would run continuously. I changed it to a one-packet probe and clarified that `ff02::1:2` is the on-link DHCPv6 relay/server multicast group, not a specific server reachability check.

2. The RA diagnostic note used tool-specific wording and the client log example referenced `wide-dhcpv6-client`, which is not a generally valid systemd unit name. I changed the RA note to refer to the managed/stateful flag generically and replaced the second log command with a broader journal query for DHCPv6 messages.

3. The client fix implied `systemd-networkd` was the universal DHCPv6 client and stated that the router "must" set `M=1` without context. I changed this to a conditional `systemd-networkd` restart for users of that stack and aligned the RA wording with RFC 4861 semantics for hosts expected to use stateful DHCPv6.

4. The relay section used `dhcrelay6` service names that are not generally correct and suggested firewall `FORWARD` rules that do not match a local relay/server process. I changed relay detection to a process-based check, used a distro-qualified restart example, and corrected the firewall example to host-local `INPUT`/`OUTPUT` rules for UDP 547.

5. The DNS troubleshooting section pointed readers to `/etc/dhcp/dhclient6.conf`, but ISC `dhclient` reads `dhclient.conf`. I changed the path and noted that DHCPv6 DNS options are requested by default unless the request list has been overridden.

6. The Kea lease-inspection example was incomplete for HTTP JSON API usage and omitted an important dependency. I changed it to an explicit HTTP POST with `Content-Type: application/json` and documented that `lease6-get-all` requires the `lease_cmds` hook library.

7. The lease-maintenance commands were inconsistent about privileges. I added `sudo` to the `systemctl` and `sysctl` commands that require elevated permissions.

8. The duplicate-address diagnostics were inaccurate. `grep -c "ia-na"` does not detect duplicate IPv6 leases and uses the wrong token spelling for ISC lease syntax; `ip -6 neighbor show | sort | uniq -D` does not reveal duplicate IPv6 assignments. I replaced these with an `iaaddr` duplicate check based on the ISC lease file format and live neighbor monitoring to catch address-to-MAC flapping.

9. The pool-expansion example used a `/32` in a host-address allocation example, which is not a good representation of a typical IPv6 client subnet. I narrowed it to `/64`, which matches standard client-link practice.

## Review Notes
- The post mixes several Linux client/server stacks (`systemd-networkd`, ISC `dhclient`, ISC DHCP server, and Kea). That is acceptable for a troubleshooting guide, but readers still need to map the commands to the specific stack they actually run.
- The Kea API example is written in Kea Control Agent style (`http://localhost:8000/` with a `service` field). This remains valid, but Kea 3.0 introduced direct API listeners as the preferred approach and the Control Agent is deprecated and scheduled for removal in Kea 3.2.
- On many modern Linux systems, resolver state may be managed by `systemd-resolved` or NetworkManager rather than directly showing all effective DNS data in `/etc/resolv.conf`. The symptom is still useful, but it is not exhaustive.
