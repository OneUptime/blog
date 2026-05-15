# Validation Summary: How to Configure Forward and Reverse DNS Zones with BIND on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- BIND 9 / named
- DNS forward zones
- DNS reverse zones
- IPv4 in-addr.arpa
- IPv6 ip6.arpa
- DNS resource records: SOA, NS, A, AAAA, MX, CNAME, TXT, SRV, PTR
- dig, named-checkconf, named-checkzone, firewall-cmd, systemctl

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Setting up and configuring a BIND DNS server: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_networking_infrastructure_services/assembly_setting-up-and-configuring-a-bind-dns-server_networking-infrastructure-services
- ISC BIND 9 Administrator Reference Manual, configuration reference: https://bind9.readthedocs.io/en/v9.21.9/reference.html
- RFC 3596, DNS Extensions to Support IP Version 6: https://www.rfc-editor.org/rfc/rfc3596
- RFC 1034, Domain Names - Concepts and Facilities: https://www.rfc-editor.org/rfc/rfc1034
- RFC 1035, Domain Names - Implementation and Specification: https://www.rfc-editor.org/rfc/rfc1035

## Issues Found
- The IPv6 reverse zone example said it was for `2001:db8::/48`, but the zone name `8.b.d.0.1.0.0.2.ip6.arpa` and relative PTR owner names match a `/32` delegation. Changed the text to `2001:db8::/32` so the prefix, zone name, and PTR names are consistent with RFC 3596 nibble-reversal rules.
- The quick AXFR consistency check queried `@localhost`, but the forward and IPv4 reverse zones only allowed transfer to `192.168.1.11`. Added `localhost` to those `allow-transfer` ACLs so the local `dig ... AXFR` examples can work as written while still limiting transfers.
- The validation section created an IPv6 reverse zone file but did not run `named-checkzone` for it. Added a `named-checkzone` command for `8.b.d.0.1.0.0.2.ip6.arpa`.
- The consistency guidance said every A record should have a corresponding PTR record. That is too absolute because multiple names can share one address and a PTR usually identifies one canonical name. Updated the wording to require forward/reverse consistency for host addresses that should resolve backward and to mention choosing one canonical PTR name for shared IP addresses.
- The A-record audit used `grep "IN\sA\s"`, which is not portable basic grep syntax. Replaced it with a POSIX character-class expression using `grep -E`.

## Review Notes
The examples are suitable for a lab or private authoritative DNS setup. For production zone transfers, Red Hat recommends TSIG-based transfer authentication instead of relying only on source IP ACLs. The post's file ownership example is functional, but stricter permissions such as `root:named` ownership with group-readable zone files are commonly used on RHEL systems.
