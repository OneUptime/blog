# Validation Summary: How to Monitor and Manage DHCP Leases on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- ISC DHCP / dhcpd
- DHCP lease database management
- Bash, awk, grep, cron, systemd, logger
- OMAPI and omshell

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "The lease database of the dhcpd service": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_networking_infrastructure_services/providing-dhcp-services_networking-infrastructure-services
- ISC DHCP 4.4 dhcpd.leases manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdleases
- ISC DHCP 4.4 dhcpd.conf manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.4 omshell manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-omshell
- ISC Knowledge Base, "Securing dhcpd against unauthorized OMAPI control connections": https://kb.isc.org/docs/aa-01355

## Issues Found
- The original active-lease grep command searched forward from `binding state active`, so it missed earlier fields such as the `lease` line and `ends` timestamp. Replaced it with an awk parser that records each lease block and prints current active leases.
- Several examples counted raw `binding state active` strings. ISC documents that the lease file is append-only and the last declaration for a lease is current, so raw grep counts can overcount historical states. Replaced those examples with state-aware awk parsing keyed by IP address.
- The summary script counted `binding state free` with an unanchored grep, which could also match `next binding state free` and `rewind binding state free`. Replaced the status counts with anchored current-state parsing.
- The post described DHCPv4 binding states as including `expired`. ISC documents active, free, and abandoned for DHCPv4 without failover, while DHCPv6 commonly uses active or expired. Updated the field description.
- The post omitted that lease-file timestamps are UTC. Added that detail from the Red Hat documentation.
- The abandoned-lease section said abandoned leases do not get reassigned automatically. ISC documents that they remain unavailable for at least `abandon-lease-time` and can be reclaimed when no free leases are available. Updated the explanation.
- The abandoned-lease listing command used `grep -B 1`, which often would not include the lease IP. Replaced it with current-state awk output.
- The manual abandoned-lease cleanup awk command could drop non-lease declarations while rewriting the file. Replaced it with a block-preserving awk command that removes only abandoned lease blocks.
- The maintenance section implied that a restart forces lease-file compaction. Red Hat and ISC document periodic rewrite behavior, not restart-as-compaction. Updated the wording.
- The OMAPI example used HMAC-SHA256 in `dhcpd.conf` but did not tell `omshell` to use that algorithm; `omshell` defaults to HMAC-MD5. Added `key-algorithm HMAC-SHA256`.
- The CSV export example exported historical active entries. Updated it to export only the current active entry for each lease.

## Review Notes
- Red Hat warns that manually updating dhcpd lease database files can corrupt them. The post now frames manual cleanup as a careful fallback, but future revisions could prefer OMAPI-based automation where appropriate.
- ISC DHCP is end-of-life upstream, but RHEL 9 still documents and packages the `dhcpd` service for DHCP server use. Future posts could mention Kea DHCP for new deployments.
