# Validation Summary: How to Configure DNS Round-Robin for Simple Load Balancing

## Status
validated

## Post Type
Guide

## Technologies Covered
- DNS
- BIND 9
- `rndc`
- `nsupdate`
- `dig`
- dnsmasq
- Linux shell scripting

## Sources Consulted
- ISC BIND 9 Configuration Reference, `rrset-order`: https://bind9.readthedocs.io/en/v9.20.2/reference.html
- ISC BIND 9 Configuration Reference, current 9.21 branch `rrset-order` behavior/deprecation notes: https://bind9.readthedocs.io/en/v9.21.14/reference.html
- ISC BIND 9 manual pages, `rndc reload`: https://bind9.readthedocs.io/en/v9.20.3/manpages.html
- ISC BIND 9 manual pages, `nsupdate`: https://bind9.readthedocs.io/en/v9.18.30/manpages.html
- dnsmasq(8) man page, `--address`, `--host-record`, `--local-ttl`, `--no-round-robin`: https://manpages.ubuntu.com/manpages/jammy/man8/dnsmasq.8.html
- RFC 1035, TTL semantics including TTL 0: https://datatracker.ietf.org/doc/html/rfc1035
- RFC 2181, RRset semantics and equal TTL requirements within an RRset: https://datatracker.ietf.org/doc/rfc2181/

## Issues Found
- The section title incorrectly referred to `rndc`, but `rrset-order` is a BIND `named` configuration directive. I renamed the section to refer to BIND RRset ordering.
- The BIND ordering example used `order random` as the primary recommendation and mentioned `order fixed`. Current BIND branches differ here, and `fixed` is deprecated or unavailable in many builds. I changed the example to use explicit `rrset-order { order cyclic; };` and noted that leaving the directive unset uses the branch-specific default.
- The verification commands used plain `dig`, which may query a caching resolver instead of the authoritative BIND instance being configured. I changed the example to query `@127.0.0.1` directly.
- The dnsmasq section used repeated `address=` rules plus incorrect TTL guidance saying to use `min-cache-ttl`. That option affects cache retention, not the TTL of locally configured answers. I replaced the example with repeated `host-record=` entries that set an explicit 60-second TTL and kept the round-robin note aligned with dnsmasq's documented default behavior.
- The TTL explanation described caching as if clients cache a single IP and said long TTL only affects "new connection" distribution. DNS TTL applies to the RRset seen through a client or recursive resolver. I corrected the wording to describe RRset caching and softened the TTL=0 statement to match RFC semantics.
- The limitations section claimed clients would specifically get `ECONNREFUSED`, that synchronized TTL expiry means everyone gets the same first IP, and that `A vs AAAA` can be used for geographic distribution. Those claims were too absolute or incorrect. I replaced them with technically accurate descriptions.
- The `nsupdate` example did not mention the prerequisite that the zone must permit dynamic updates from the client or key. I added that prerequisite note and quoted the `curl` URL safely.

## Review Notes
- The post now reflects the main branch difference that matters here: BIND 9.20 documents `random` as the implicit default when `rrset-order` is unset, while newer 9.21 docs document `cyclic` behavior and deprecate `random`. The edited post avoids locking the reader to a branch-specific default.
- Manual edits to a BIND zone file still require normal zone-management hygiene, especially incrementing the SOA serial when appropriate so secondaries can pick up the change.
