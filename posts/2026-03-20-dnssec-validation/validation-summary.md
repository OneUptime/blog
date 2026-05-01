# Validation Summary: How to Enable and Test DNSSEC Validation

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- DNSSEC validation
- BIND 9
- Unbound
- `dig`, `rndc`, `unbound-anchor`, `unbound-checkconf`
- dnspython
- IPv4 and IPv6 resolver configuration

## Sources Consulted
- BIND 9 DNSSEC Guide: https://bind9.readthedocs.io/en/v9.21.16/dnssec-guide.html
- BIND 9 Configuration Reference (`trust-anchors`, logging categories): https://bind9.readthedocs.io/en/v9.20.5/reference.html
- BIND 9 manual pages (`dig`, `rndc managed-keys`): https://bind9.readthedocs.io/en/v9.18.42/manpages.html and https://bind9.readthedocs.io/en/v9.20.0/manpages.html
- Unbound Getting Started Configuration: https://unbound.docs.nlnetlabs.nl/en/latest/getting-started/configuration.html
- `unbound.conf(5)`: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- `unbound-checkconf(8)`: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound-checkconf.html
- `unbound-control(8)`: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound-control.html
- `unbound-host(1)`: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound-host.html
- dnspython resolver API: https://dnspython.readthedocs.io/en/latest/resolver-class.html
- dnspython message construction and DNSSEC request handling: https://dnspython.readthedocs.io/en/latest/message-make.html
- dnspython message flags and response structure: https://dnspython.readthedocs.io/en/latest/message-flags.html and https://dnspython.readthedocs.io/en/latest/message-class.html
- IANA DNSSEC Trust Anchors and Rollovers: https://www.iana.org/dnssec/files
- RFC 4035: https://datatracker.ietf.org/doc/html/rfc4035
- RFC 5011: https://datatracker.ietf.org/doc/html/rfc5011
- RFC 8198: https://datatracker.ietf.org/doc/html/rfc8198
- Live DNS checks on 2026-05-01 using `dig` against `1.1.1.1` and `a.root-servers.net`

## Issues Found
- The sample IPv6 ACL prefixes used `2001:db8:internal::/48`, which is not a valid IPv6 literal. I replaced it with the valid documentation prefix `2001:db8:100::/48`.
- The BIND manual trust-anchor guidance referenced `trusted-keys` and `managed-keys`. Those are deprecated in current BIND and removed in newer 9.21 releases, so I updated the article to use `trust-anchors` with `static-key`.
- The Unbound verification command used `unbound-control status | grep "DNSSEC"`. Per the official `unbound-control(8)` docs, `status` only reports whether the daemon is running, not DNSSEC validation state, and it also depends on remote-control being configured. I replaced it with `unbound-checkconf /etc/unbound/unbound.conf` for syntax verification and left functional validation to the later `dig` tests.
- The IPv6 DNSSEC test used `www.isc.org` and expected an `ad` flag. Live testing on 2026-05-01 showed that current answers for `www.isc.org` do not reliably return `ad` because of the current CNAME chain, so I replaced that example with `www.dnssec-deployment.org`, which does validate as described.
- The debugging section used `www.broken-example.com`, but live testing showed it is simply NXDOMAIN, not a deliberately broken DNSSEC zone. I replaced those commands with `sigfail.verteiltesysteme.net`, which currently behaves as the post describes when queried with and without `+cd`.
- The BIND logging example included `category dnssec-resolver`, which is not a documented BIND logging category. I removed it and kept the valid `dnssec` category.
- The Unbound logging example assumed validation details would appear in `/var/log/unbound.log` without enabling validation logging. I added `val-log-level: 1` and `logfile: "/var/log/unbound.log"` so the example matches documented behavior.
- The trust-anchor section hard-coded a single root KSK example. Live checks on 2026-05-01 showed multiple root KSK DNSKEY records are currently published, so I generalized the wording to refer to one or more matching trust anchors.
- The dnspython example used `Resolver.resolve(..., want_dnssec=True)`, but the documented `Resolver.resolve()` API does not accept `want_dnssec`. It also tried to detect `RRSIG` records inside `answer.rrset`, which only contains the requested RRset. I rewrote the example to use documented EDNS/DO settings, inspect the response `AD` flag, and scan `answer.response.answer` for `RRSIG` RRsets.
- The dnspython example pointed at `2001:db8::53`, which is only a documentation prefix and not a usable resolver address. I changed it to loopback resolver addresses.

## Review Notes
- The post is technically salvageable and now accurate after correction.
- Recent BIND releases often default to `dnssec-validation auto`; keeping it explicit in the post is still correct and helpful.
- I could not run `named-checkconf`, `rndc`, `unbound-checkconf`, or dnspython locally in this workspace because the relevant binaries and library are not installed here. Command syntax and API usage were verified against official documentation, and DNS behavior claims were checked with live `dig` queries instead.
