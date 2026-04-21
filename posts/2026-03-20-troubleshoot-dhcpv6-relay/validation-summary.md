# Validation Summary: How to Troubleshoot DHCPv6 Relay Problems

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- DHCPv6 relay agents and message flow
- Linux networking tools (`ss`, `ip`, `ip6tables`, `tcpdump`, `ping6`, `sysctl`)
- ISC DHCP `dhcrelay`
- ISC Kea DHCPv6 server configuration and logging
- IPv6 Router Advertisements and DHCPv6 M flag
- Cisco IOS DHCPv6 relay diagnostics

## Sources Consulted
- RFC 9915: Dynamic Host Configuration Protocol for IPv6 (DHCPv6), current Internet Standard replacing RFC 8415 - https://datatracker.ietf.org/doc/rfc9915/
- RFC 4861: Neighbor Discovery for IP version 6, Router Advertisement M/O flag definitions - https://datatracker.ietf.org/doc/html/rfc4861
- ISC DHCP 4.4 `dhcrelay` manual page - https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcrelay
- Red Hat Enterprise Linux 9 documentation: Setting up a DHCP relay agent - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_networking_infrastructure_services/providing-dhcp-services_networking-infrastructure-services
- Kea 3.1.8 DHCPv6 server documentation, relay subnet selection and `relay.ip-addresses` behavior - https://kea.readthedocs.io/en/latest/arm/dhcp6-srv.html
- Kea 3.1.8 installation documentation, service names - https://kea.readthedocs.io/en/latest/arm/install.html
- Kea 3.1.8 Messages Manual, `DHCP6_SUBNET_SELECTION_FAILED` log message - https://kea.readthedocs.io/en/latest/kea-messages.html
- tcpdump DHCPv6 printer source, relay output field naming - https://raw.githubusercontent.com/the-tcpdump-group/tcpdump/master/print-dhcp6.c
- Local command help/output checks for `ss`, `ip -6 route`, `tcpdump`, and `ping6`

## Issues Found
- **Non-standard client state and response wording**: Replaced `INIT-RECONF` and generic `REPLY` wording with IA_NA, `RELAY-REPL`, and `ADVERTISE/REPLY`, matching RFC 9915 DHCPv6 message types and normal Solicit response flow.
- **Invalid IPv6 placeholder**: Replaced `2001:db8::dhcp-server`, which is not a valid IPv6 address and fails in `ping6`/`ip route get`, with `2001:db8::10`.
- **Incorrect RA flag check**: The script described `net.ipv6.conf.eth0.forwarding` as an RA M-flag check. Replaced it with a `tcpdump` Router Advertisement capture instruction and clarified the quick script's forwarding check as relevant only when the relay is also the router.
- **Relay service name too narrow**: Broadened the relay daemon check from only `isc-dhcp-relay6` to include the common `dhcrelay6` service name used in documented Linux setups.
- **tcpdump field mismatch and relay link-address wording**: Changed the tcpdump grep from `link-address` to `linkaddr`, and corrected the `dhcrelay` explanation so it refers to the relay message link-address field rather than the packet source address.
- **Kea config parsing reliability**: Replaced strict Python `json.load()` parsing with `kea-dhcp6 -t` plus a targeted subnet search, because Kea configuration files can contain Kea-supported comments that strict JSON parsers reject.
- **Kea relay selector example**: Changed the example so a matching subnet is shown as the required part, and `relay.ip-addresses` is described as needed when the relay link-address does not belong to the served subnet.
- **Kea log search and service names**: Updated log checks to include `DHCP6_SUBNET_SELECTION_FAILED` and both common Kea DHCPv6 service names.
- **Multiple `dhcrelay` PID handling**: Replaced `cat /proc/$(pgrep dhcrelay)/limits`, which breaks when multiple PIDs are returned, with a loop over matching PIDs.
- **Lease loss cause wording**: Replaced "relay restart" with "renew/rebind path failure" because a relay restart alone does not revoke an existing DHCPv6 lease.

## Review Notes
- RFC 9915, published in January 2026, is the current DHCPv6 Internet Standard and obsoletes RFC 8415. The relay behavior used by the post remains consistent with the current RFC after the edits.
- The `ip6tables` firewall check is still useful on many systems, but nftables-native deployments may also need `nft list ruleset` checks.
- DHCPv6 relay service names vary by distribution and packaging; the post now covers common names but operators may still need to adapt commands locally.
