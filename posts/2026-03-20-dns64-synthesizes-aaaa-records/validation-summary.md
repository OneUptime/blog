# Validation Summary: How to Understand DNS64 and How It Synthesizes AAAA Records

## Status
validated

## Post Type
Guide

## Technologies Covered
- DNS64
- NAT64
- DNS
- DNSSEC
- IPv6
- IPv4

## Sources Consulted
- RFC 6147, "DNS64: DNS Extensions for Network Address Translation from IPv6 Clients to IPv4 Servers" - https://www.rfc-editor.org/rfc/rfc6147
- RFC 6052, "IPv6 Addressing of IPv4/IPv6 Translators" - https://www.rfc-editor.org/rfc/rfc6052
- GitHub profile URL check for the author link - https://github.com/nawazdhandala
- Live DNS verification on 2026-05-01 using `dig` showed `example.com` currently publishes AAAA records.

## Issues Found
- The flow diagram implied that an upstream AAAA query could directly return an A record. I corrected it to the RFC 6147 sequence: AAAA lookup first, then a separate A lookup when the AAAA answer is empty.
- The post used `example.com` as an IPv4-only example. A live DNS lookup on 2026-05-01 showed `example.com` has AAAA records, so I replaced it with a documentation-safe hypothetical `ipv4only.example` example and the documentation IPv4 address `192.0.2.33`.
- The PTR statement said reverse DNS synthesis is not performed. I corrected it to match RFC 6147, which allows DNS64 to answer PTR lookups for its synthesis prefix space using local PTR data or a synthesized `CNAME` to `IN-ADDR.ARPA`.
- The TTL note claimed DNS64 typically uses a fixed 60-second TTL. I corrected it to RFC 6147's actual TTL rule: the minimum of the A record TTL and the SOA TTL from the negative AAAA response, or the shorter of the A TTL and 600 seconds if no SOA TTL is available.
- The custom-prefix section omitted `/56` and did not clearly state the valid RFC 6052 prefix lengths. I updated it to the allowed set: `/32`, `/40`, `/48`, `/56`, `/64`, and `/96`.
- The DNSSEC section incorrectly said validation should happen upstream of DNS64 and that the DNS64 resolver itself does not validate. I corrected it to RFC 6147 validating-resolver behavior, including the `DO` and `CD` case where synthesis must not occur.
- The synthesis conditions overstated how existing AAAA records are handled. I adjusted the wording to account for RFC 6147 exclusion policy, which can treat some AAAA answers as unusable.

## Review Notes
- The sample synthetic AAAA TTL of `60` seconds is now clearly illustrative rather than normative.
- The post now uses documentation-only addresses, which avoids future drift caused by live DNS changes.
