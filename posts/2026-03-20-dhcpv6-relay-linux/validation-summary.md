# Validation Summary: How to Configure DHCPv6 Relay on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- DHCPv6
- DHCPv6 relay agents
- Linux networking
- ISC Kea DHCPv6 server
- ISC DHCP `dhcrelay`
- `wide-dhcpv6-relay`
- `dibbler-relay`
- `ip6tables`
- `tcpdump`

## Sources Consulted
- RFC 9915, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc9915.html
- RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc8415.html
- ISC DHCP 4.4 `dhcrelay` manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcrelay
- ISC DHCP product page and EOL notice: https://www.isc.org/dhcp/
- Kea DHCPv6 server documentation: https://kea.readthedocs.io/en/kea-2.6.4/arm/dhcp6-srv.html
- Debian manpage for `dhcp6relay(8)` from `wide-dhcpv6-relay`: https://manpages.debian.org/trixie/wide-dhcpv6-relay/dhcp6relay.8.en.html
- Debian manpage for `dibbler-relay(8)`: https://manpages.debian.org/testing/dibbler-relay/dibbler-relay.8.en.html
- Ubuntu package listings for current Kea package names: https://packages.ubuntu.com/search?keywords=kea
- Current Ubuntu package metadata and bundled manpages/examples for `isc-dhcp-relay`, `wide-dhcpv6-relay`, and `dibbler-relay`, verified locally via `apt-cache` and extracted `.deb` contents

## Issues Found
- The Kea section incorrectly described Kea as a relay component and referenced `kea-dhcp-ddns`. I changed it to Kea DHCPv6 server installation with `kea-dhcp6-server`, because Kea provides the server side, not a relay agent, and the DDNS package is a separate component.
- The post used invalid IPv6 example literals such as `2001:db8::dhcp-server`. I replaced them with a valid documentation address, `2001:db8::53`, so the commands and configs are syntactically correct.
- The `wide-dhcpv6-relay` section used a non-existent `/etc/wide-dhcpv6/dhcp6relay.conf` file and unsupported config syntax. I replaced it with `/etc/default/wide-dhcpv6-relay` and the correct `dhcp6relay` command-line arguments used by the packaged init script.
- The Dibbler example used incorrect relay configuration syntax and implied the server-facing interface would be inferred automatically. I replaced it with explicit client-facing and server-facing `iface` blocks plus `interface-id`, matching the packaged `dibbler-relay` examples and manpage.
- The ISC DHCPv6 relay section used the wrong config file and wrong variable names. I changed it from `/etc/default/isc-dhcp-relay` with `SERVERS` and `INTERFACES` to `/etc/default/isc-dhcp-relay6` with `LOWER_INTERFACES`, `UPPER_INTERFACES`, and `OPTIONS`, which is how the current Ubuntu `isc-dhcp-relay6.service` is wired.
- The manual `dhcrelay -6` commands were invalid for DHCPv6 mode. I removed the broken inline comments and positional server argument, and used the correct `-u address%interface` form documented by `dhcrelay(8)`.
- The firewall rules treated relay traffic as forwarded traffic and omitted the client reply path on UDP destination port 546. I corrected the rules to reflect DHCPv6 client-to-relay, relay-to-server, server-to-relay, and relay-to-client traffic directions.
- The verification section decoded relay traffic on the wrong interface and included a broken network namespace example that would not work as written. I moved the relay capture example to the server-facing interface and replaced the invalid namespace test with a simpler downstream client test command.

## Review Notes
- RFC 9915, published in January 2026, now obsoletes RFC 8415. The post does not cite an RFC directly, but the corrected relay behavior, multicast address usage, and UDP port handling are consistent with the current standard.
- ISC DHCP relay is end-of-life according to ISC. The `dhcrelay` syntax used here is still correct for currently packaged releases, but the implementation is no longer maintained by ISC.
- `wide-dhcpv6-relay` and Dibbler are older implementations. The corrected examples match current package docs, but they are based on mature legacy software rather than actively evolving relay stacks.
- The rule persistence example `ip6tables-save > /etc/iptables/rules.v6` assumes a system using `iptables-persistent` or an equivalent restore mechanism.
