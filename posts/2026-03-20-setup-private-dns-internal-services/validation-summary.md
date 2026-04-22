# Validation Summary: How to Set Up Private DNS for Internal Network Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- DNS
- Private/internal DNS zones
- dnsmasq
- Unbound
- DHCP and DHCP options
- ISC DHCP server configuration
- BIND nsupdate dynamic DNS updates
- Linux systemd service management
- dig and nslookup DNS testing

## Sources Consulted
- dnsmasq man page: https://dnsmasq.org/docs/dnsmasq-man.html
- Unbound `unbound.conf(5)` documentation: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- ISC DHCP 4.4 `dhcp-options` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcp-options
- ISC DHCP 4.4 `dhcpd.conf` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- BIND 9 `nsupdate(1)` manual: https://bind9.readthedocs.io/en/v9.20.16/manpages.html#nsupdate-dynamic-dns-update-utility
- RFC 6762, Multicast DNS: https://datatracker.ietf.org/doc/html/rfc6762
- ICANN Board preliminary report reserving `.INTERNAL`: https://www.icann.org/en/board-activities-and-meetings/materials/preliminary-report-special-meeting-of-the-icann-board-29-07-2024-en
- IANA Special-Use Domain Names registry: https://www.iana.org/assignments/special-use-domain-names/special-use-domain-names.xhtml

## Issues Found
- The post used `api.company.local` and `local=/company.local./` as private unicast DNS examples. `.local` has special mDNS semantics under RFC 6762, so using it for private unicast DNS can create resolver conflicts. Changed these examples to `api.company.internal` and `local=/company.internal./`.
- The dnsmasq dynamic DNS snippet labeled `dhcp-option=option:dns-server,10.20.0.1` as a dynamic PTR-record setting. That option only advertises the DNS server to DHCP clients; dnsmasq publishes DNS data for DHCP leases separately. Updated the comment to describe the option accurately.
- The BIND `nsupdate` example said it added A and PTR records but only added the A record. Updated the example to send separate forward-zone and reverse-zone updates, because BIND dynamic update requests must operate within one zone at a time.

## Review Notes
- dnsmasq configuration syntax was checked locally with `dnsmasq --test` using dnsmasq 2.90, and the `address=/internal.company.com/10.20.0.100` behavior was verified with local `dig` queries against a temporary dnsmasq instance.
- Unbound was reviewed against the official `unbound.conf(5)` documentation. `unbound-checkconf` was not installed in this workspace, so the Unbound snippet was not executed locally.
- The examples are still intentionally minimal. In production, operators should account for local service conflicts on port 53, systemd-resolved behavior, DNSSEC trust-anchor configuration, and authenticated BIND dynamic updates with TSIG or an equivalent policy.
