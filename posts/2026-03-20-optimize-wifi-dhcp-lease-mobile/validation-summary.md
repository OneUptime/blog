# Validation Summary: How to Optimize WiFi DHCP Lease Times for Mobile Devices

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- DHCP (Dynamic Host Configuration Protocol)
- dnsmasq (DHCP/DNS server)
- ISC DHCP server (dhcpd)
- DHCP option 51 (IP Address Lease Time)
- Bash / Linux command line
- WiFi network management

## Sources Consulted
- dnsmasq man page (https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html) for `dhcp-range`, `dhcp-host`, `dhcp-option`, lease-file format, and `--no-ping` default behavior
- ISC DHCP `dhcpd.conf` man page for `default-lease-time`, `max-lease-time`, `ping-check`, `ping-timeout`, `subnet`/`range` syntax
- ISC DHCP `dhcpd` man page for the `-T` (test lease file) flag
- RFC 2132 (DHCP Options and BOOTP Vendor Extensions) for option 51 (IP Address Lease Time)
- RFC 2131 (DHCP) for general protocol behavior

## Issues Found
- **Incorrect statement about dnsmasq probing behavior**: The comment in Step 5 said `(dnsmasq does ARP probing by default)`. dnsmasq actually sends an ICMP echo request (ping) by default before allocating an address, not an ARP probe (per the `--no-ping` option in the dnsmasq man page). Fixed the comment to read `(dnsmasq sends an ICMP echo request by default; disable with --no-ping)`.

## Review Notes
- The `dnsmasq.leases` lease-file format (`<expiry> <mac> <ip> <hostname> <client-id>`) is correctly assumed by the awk field positions (`$1` for expiry, `$2` for MAC).
- DHCP option 51 = IP Address Lease Time is correct per RFC 2132.
- All time conversions check out: 1800s=30min, 3600s=1h, 86400s=24h, 604800s=7d.
- The IP pool size calculation (`.10` to `.254` = 245 IPs) is correct.
- `dhcpd -T` correctly tests the lease database file (lowercase `-t` would test the config file).
- The `dhcp-host=tag:iot,set:short_lease` line in Step 2 is unusual without a host identifier (MAC/IP/hostname), but valid as a tag-mapping rule in dnsmasq; it's presented as part of a conceptual sketch rather than a complete config, which is acceptable.
- ISC DHCP's `dhcpd.leases` file is append-only and contains historical lease records, so `grep "^lease " | wc -l` over-counts active leases — fine for trend monitoring as used here, but worth noting.
- `/var/lib/misc/dnsmasq.leases` is the standard path on Debian/Ubuntu; some distributions use `/var/lib/dnsmasq/dnsmasq.leases`.
