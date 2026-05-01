# Validation Summary: How to Understand DNS Transport over IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- DNS
- IPv6
- UDP
- TCP
- EDNS(0)
- `dig`
- BIND 9
- Unbound
- `tcpdump`
- `ping6`

## Sources Consulted
- RFC 1035, Domain Names - Implementation and Specification: https://www.rfc-editor.org/rfc/rfc1035
- RFC 7766, DNS Transport over TCP - Implementation Requirements: https://www.rfc-editor.org/rfc/rfc7766.html
- RFC 6891, Extension Mechanisms for DNS (EDNS(0)): https://www.rfc-editor.org/rfc/rfc6891
- RFC 1995, Incremental Zone Transfer in DNS: https://www.rfc-editor.org/rfc/rfc1995.html
- RFC 5936, DNS Zone Transfer Protocol (AXFR): https://www.rfc-editor.org/rfc/rfc5936.html
- RFC 7858, Specification for DNS over Transport Layer Security (TLS): https://www.rfc-editor.org/rfc/rfc7858.html
- RFC 8200, Internet Protocol, Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200.html
- RFC 6724, Default Address Selection for IPv6: https://www.rfc-editor.org/rfc/rfc6724.html
- BIND 9 manual pages (`dig` options such as `+tcp`, `+bufsize`, and `+ignore`): https://bind9.readthedocs.io/en/v9.21.14/manpages.html
- BIND 9 configuration reference (`listen-on-v6` and scoped IPv6 addresses): https://bind9.readthedocs.io/en/v9.18.4/reference.html
- Unbound `unbound.conf(5)` documentation (`edns-buffer-size`, `verbosity`): https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- Local CLI help/output checked for the installed tools: `dig -h`, `ping6 -h`, and live `dig` queries against an IPv6 resolver

## Issues Found
- The post incorrectly grouped DNS-over-TLS with TCP port 53. I corrected this to state that DoT uses TCP port 853, not port 53, per RFC 7858.
- The post described EDNS(0) as increasing UDP payload size from 512 to a fixed 4096 bytes. I corrected this to reflect how EDNS(0) actually works: the client advertises a supported UDP payload size, and 4096 is only a common starting value, not a protocol rule.
- The post stated that both AXFR and IXFR use TCP categorically. I corrected this to AXFR plus some IXFR transfers, because IXFR can also be attempted over UDP depending on size and server behavior.
- Two example IPv6 addresses were syntactically invalid (`2001:db8:client::1` and `2001:db8::recursive`). I replaced them with valid documentation-prefix addresses.
- Several `dig` examples queried `AAAA` records without actually ensuring IPv6 transport. I updated those commands to use an IPv6 resolver address so the transport matches the article’s subject.
- The TCP-detection example using `grep "MSG SIZE"` was inaccurate because message size does not prove whether the exchange used UDP or TCP. I replaced it with a packet-capture example that directly shows the transport in use.
- The truncation/TCP fallback example used `grep "flags.*TC"`, which was not a reliable way to demonstrate truncation. I replaced it with a `+ignore` example that shows the `tc` flag in a UDP response.
- The BIND link-local `listen-on-v6` example omitted the required scope zone. I corrected it to include `%eth0`, consistent with BIND's documented handling of scoped IPv6 addresses.
- The MTU diagnostic comment claimed to check for dropped IPv6 fragments directly. I corrected the wording to describe what the command actually tests: IPv6 path MTU discovery behavior.

## Review Notes
- `dig` defaults around advertised EDNS buffer size can vary by version/build, so explicitly setting `+bufsize` is more accurate than describing a universal default.
- The `tcpdump` examples assume the user has sufficient packet-capture privileges on the host.
