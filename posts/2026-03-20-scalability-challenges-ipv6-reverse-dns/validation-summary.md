# Validation Summary: How to Understand the Scalability Challenges of IPv6 Reverse DNS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IPv6 addressing
- IPv6 reverse DNS under ip6.arpa
- PTR records
- SLAAC and temporary IPv6 privacy addresses
- DHCPv6 dynamic DNS updates
- Kea DHCPv6 and kea-dhcp-ddns
- DNS zone transfers
- PowerDNS Authoritative Server backends
- BIND dig
- Linux iproute2 neighbor cache commands

## Sources Consulted
- RFC 4291: IP Version 6 Addressing Architecture - https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3596: DNS Extensions to Support IP Version 6 - https://www.rfc-editor.org/rfc/rfc3596
- RFC 6177: IPv6 Address Assignment to End Sites - https://www.rfc-editor.org/rfc/rfc6177.html
- RFC 8981: Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6 - https://datatracker.ietf.org/doc/html/rfc8981
- RFC 2317: Classless IN-ADDR.ARPA delegation - https://datatracker.ietf.org/doc/html/rfc2317
- RFC 4592: The Role of Wildcards in the Domain Name System - https://www.rfc-editor.org/rfc/rfc4592
- ISC DHCP end-of-life announcement - https://www.isc.org/blogs/isc-dhcp-eol/
- ISC Kea DHCPv6 DDNS documentation - https://kea.readthedocs.io/en/kea-2.5.2/arm/dhcp6-srv.html
- ISC Kea DHCP-DDNS documentation - https://kea.readthedocs.io/en/kea-2.6.3/arm/ddns.html
- BIND 9 dig manual page - https://bind9.readthedocs.io/en/v9.21.21/manpages.html
- PowerDNS Authoritative Pipe Backend documentation - https://doc.powerdns.com/authoritative/backends/pipe.html
- PowerDNS Authoritative Generic SQL Backend documentation - https://doc.powerdns.com/authoritative/backends/generic-sql.html
- PowerDNS Authoritative Lua Records documentation - https://doc.powerdns.com/authoritative/lua-records/

## Issues Found
- The comparison table described IPv6 reverse delegation as "/4 (nibble = every 16 addresses)", which could be misread as a 16-address delegation interval. Updated it to "/4-bit increments (nibble boundaries)".
- The table described IPv4 reverse delegation only as "/24 (octet)", while the post later discussed RFC 2317. Updated the table to mention classless RFC 2317 delegation.
- The /48 assignment wording implied a universal typical assignment. Adjusted it to an example /48 while preserving the scale comparison.
- The SLAAC example called the stable address "permanent" and the temporary address "changes daily". Updated these labels to "stable" and "changes periodically", matching RFC 8981's lifetime-based behavior.
- The DHCPv6 section stated addresses change on lease expiration. Updated it to say addresses can change when leases expire or are reassigned.
- The DHCPv6 DDNS snippet used ISC DHCP as the primary example. ISC DHCP server is end-of-life, so the example was replaced with current Kea DHCPv6 and kea-dhcp-ddns configuration fragments using documented DDNS parameters.
- The IPv6 delegation section said arbitrary boundaries are "not possible" without qualifying the type of delegation. Updated this to "Direct NS delegation" to match the nibble-label structure of ip6.arpa.
- The wildcard PTR strategy claimed one wildcard covers all un-PTR'd addresses in a subnet. DNS wildcard behavior depends on the closest encloser and can be affected by existing names, so the wording was narrowed to "otherwise-empty parts of a reverse zone".
- The monitoring script comment said it checks a percentage, but the script counts missing PTR records. Updated the comment accordingly.
- The monitoring script referred to "ARP/ND" for IPv6. Updated it to "ND neighbor cache".
- The monitoring loop now uses `read -r` and quotes the `dig -x` argument for shell robustness.

## Review Notes
The post is technically sound after these corrections. Future improvements could add a short caution that wildcard PTR records are often operationally undesirable for public reverse DNS because they can make every unused address appear named.
