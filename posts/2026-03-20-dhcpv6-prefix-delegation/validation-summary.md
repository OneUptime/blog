# Validation Summary: How to Configure DHCPv6 Prefix Delegation (IA_PD)

## Status
validated

## Post Type
Guide / configuration tutorial

## Technologies Covered
- DHCPv6 Prefix Delegation (IA_PD)
- IPv6
- SLAAC and Router Advertisements
- ISC Kea DHCPv6
- ISC DHCP `dhcpd`
- `dhcpcd`
- `wide-dhcpv6-client` (`dhcp6c`)
- `radvd`

## Sources Consulted
- RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://datatracker.ietf.org/doc/html/rfc8415
- RFC 6603, Prefix Exclude Option for DHCPv6-based Prefix Delegation: https://datatracker.ietf.org/doc/html/rfc6603
- Kea DHCPv6 Server documentation: https://kea.readthedocs.io/en/kea-2.6.4/arm/dhcp6-srv.html
- Kea configuration syntax and comment handling: https://kea.readthedocs.io/en/stable/arm/config.html
- ISC DHCP 4.4 `dhcpd.conf` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC KB, DHCPv6 and link-local IPv6 interface addresses: https://kb.isc.org/docs/aa-00368
- ISC KB, Declaring the subnets in ISC DHCP: https://kb.isc.org/docs/aa-00274
- `dhcpcd.conf(5)` manual: https://manpages.opensuse.org/Leap-16.0/dhcpcd/dhcpcd.conf.5.en.html
- `dhcpcd(8)` manual: https://manpages.ubuntu.com/manpages/questing/man8/dhcpcd.8.html
- `dhcp6c.conf(5)` manual: https://manpages.debian.org/unstable/wide-dhcpv6-client/dhcp6c.conf.5.en.html
- `dhcp6c(8)` manual: https://manpages.debian.org/trixie/wide-dhcpv6-client/dhcp6c.8.en.html
- `radvd.conf(5)` manual: https://manpages.debian.org/unstable/radvd/radvd.conf.5.en.html

## Issues Found
- The introduction cited RFC 3633 only. I updated it to note that RFC 3633 introduced DHCPv6-PD and RFC 8415 incorporated it, which better reflects the current DHCPv6 specification.
- The IA_PD exchange labeled the REQUEST step as `IA_PD:confirm`, which was inaccurate. I changed it to show the client requesting the selected advertised prefix.
- The ISC `dhcpd` example used `/etc/dhcp/dhcpd6.conf` and omitted the `subnet6` declaration ISC DHCP needs in order to listen on an IPv6 interface. I changed the example to `/etc/dhcp/dhcpd.conf` and added a minimal `subnet6` block.
- The `dhcpcd` example described `ipv6rs` incorrectly and omitted the recommended global `noipv6rs` plus per-interface `ipv6rs` pattern used for prefix delegation. I corrected the comments and configuration.
- The `wide-dhcpv6-client` prefix-hint line used invalid syntax (`infinity/infinity`). I corrected it to valid `dhcp6c.conf` syntax and replaced the distro-specific service start command with the upstream `dhcp6c` invocation documented in `dhcp6c(8)`.
- The `radvd` example mixed `Base6Interface` and `Base6to4Interface`, which was incorrect for this DHCPv6-PD case. I changed it to advertise the delegated `/64` already assigned to `eth1` and aligned the advertised lifetimes with the sample delegated lifetimes.
- The verification section referenced an incorrect `dhcpcd` lease path and an ISC DHCPv6 lease path that did not match the documented default. I replaced the client-side lease check with `dhcpcd -U eth0` and corrected the ISC DHCP lease file path to `/var/lib/dhcp/dhcpd6.leases`.

## Review Notes
- `wide-dhcpv6-client` is still documented in distro man pages and the corrected configuration syntax is valid, but the current `dhcp6c(8)` man page notes that the implementation is incomplete and violates parts of the DHCPv6 protocol. If this post is expanded later, it would be worth adding a short caveat that this client is mainly relevant for older or package-specific environments.
