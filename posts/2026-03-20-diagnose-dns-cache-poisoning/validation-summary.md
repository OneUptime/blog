# Validation Summary: How to Diagnose DNS Cache Poisoning Attacks

## Status
validated

## Post Type
Guide

## Technologies Covered
- DNS
- DNSSEC
- Unbound
- BIND 9
- `dig`
- `whois`
- `tcpdump`
- Linux shell scripting

## Sources Consulted
- Unbound `unbound.conf(5)`: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- Unbound `unbound-anchor(8)`: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound-anchor.html
- BIND 9 DNSSEC Guide: https://bind9.readthedocs.io/en/v9.16.25/dnssec-guide.html
- BIND 9 manual pages (`dig`, `named-checkconf`, `rndc`): https://bind9.readthedocs.io/en/v9.21.16/manpages.html
- BIND 9 Administrator Reference (`query-source` behavior): https://bind9.readthedocs.io/_/downloads/en/v9.21.1/pdf/
- RFC 4035, DNSSEC protocol modifications: https://www.rfc-editor.org/rfc/rfc4035
- RFC 5452, DNS resilience against forged answers: https://www.rfc-editor.org/rfc/rfc5452
- RFC 2181, DNS clarifications and RRset trustworthiness: https://www.rfc-editor.org/rfc/rfc2181
- RFC 1035, DNS implementation and caching basics: https://www.rfc-editor.org/rfc/rfc1035

## Issues Found
- The resolver-versus-authoritative comparison only compared the first returned IP, which can misdiagnose normal multi-record answers. I changed it to compare the full A RRset and to query the authoritative server with `+norecurse`.
- The TTL example implied recursive and authoritative TTLs should match directly. I changed it to compare cached TTLs against authoritative TTLs and noted that recursive TTLs normally count down from the authoritative TTL.
- The multiple-resolver section made an absolute claim that poisoning affects one resolver and used `banking.example.com`, which is only a placeholder. I softened the claim and switched the runnable example to `example.com`.
- The Unbound logging example did not focus on validation failures and treated `NXDOMAIN` as an anomaly. I changed it to enable `log-servfail: yes` and to filter for `SERVFAIL`, `bogus`, and validation-related log messages.
- The BIND logging snippet used `severity dynamic`, which does not match the DNSSEC debug logging guidance in BIND's DNSSEC documentation. I updated it to the documented `severity debug 3` form and included `print-category yes`.
- The DNSSEC enablement example omitted trust-anchor bootstrapping before configuring `auto-trust-anchor-file`. I added `unbound-anchor` so the example reflects the documented Unbound workflow.
- The DNSSEC failure test used `bogus.dnssec-tools.org`, which is not the documented validation-failure test and does not demonstrate the intended behavior. I replaced it with `www.dnssec-failed.org` and added the `+cd` confirmation step from the BIND DNSSEC guide.
- The BIND source-port verification command used `rndc status | grep "query source"`, which is not a reliable documented check for this purpose. I replaced it with `named-checkconf -p` guidance consistent with BIND's configuration documentation.
- The post claimed Unbound enables 0x20 case randomization by default. Unbound documents this as the experimental `use-caps-for-id` option with a default of `no`, so I corrected the statement.
- The NAT inspection pipeline parsed the wrong `tcpdump` field and would not extract the source port correctly. I fixed the pipeline and clarified that the capture must be taken on the NAT's WAN side to see post-NAT source ports.
- The conclusion said authoritative and recursive answers should always match. I corrected this because caching, CDNs, and GeoDNS can legitimately produce differences, and I narrowed the DNSSEC claim to signed zones.

## Review Notes
- The post is now technically sound, but the direct authoritative-comparison example is still best suited to zone-apex A records. Investigating subdomains, split-horizon DNS, or CDN-backed names may require more targeted checks.
- `unbound-control reload` is valid, but it requires `unbound-control` to be configured. The post now notes that operators may need to use their service manager instead.
