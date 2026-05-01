# Validation Summary: How to Configure DNS64 with Unbound for NAT64

## Status
validated

## Post Type
Guide

## Technologies Covered
- Unbound
- DNS64
- NAT64
- TAYGA
- IPv6
- DNSSEC
- `dig`
- `host`

## Sources Consulted
- Unbound `unbound.conf(5)` documentation: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- Unbound release history/download notes: https://nlnetlabs.nl/projects/unbound/download/
- RFC 6147, DNS64: DNS Extensions for Network Address Translation from IPv6 Clients to IPv4 Servers: https://www.rfc-editor.org/rfc/rfc6147
- RFC 6052, IPv6 Addressing of IPv4/IPv6 Translators: https://www.rfc-editor.org/rfc/rfc6052
- RFC 7050, Discovery of the IPv6 Prefix Used for IPv6 Address Synthesis: https://www.rfc-editor.org/rfc/rfc7050
- RFC 8880, Special Use Domain Name `ipv4only.arpa`: https://www.rfc-editor.org/rfc/rfc8880.html
- Local CLI help for `dig`, `host`, and `ss`

## Issues Found
- The post said DNS64 requires Unbound `1.4.9+`. I changed this to `1.5.0+` because Unbound's official release notes show DNS64 was introduced in Unbound 1.5.0.
- The Unbound configuration included `do-recursion: yes`, which is not a valid `unbound.conf` directive. I removed it.
- The DNSSEC note implied disabling validation or using `val-permissive-mode` if DNS64 synthesis fails. I replaced it with a technically correct note: resolver-side DNSSEC validation can remain enabled, while downstream validating clients need a trusted path to the DNS64 resolver or local DNS64 handling.
- The `ipv4only.arpa.` test expected `64:ff9b::c000:200` synthesized from `192.0.2.0`, which is incorrect. Per RFC 7050 and RFC 8880, `ipv4only.arpa.` uses `192.0.0.170` and `192.0.0.171`, so the synthesized `/96` addresses are `64:ff9b::c000:aa` and `64:ff9b::c000:ab`.
- The example using `example.com` as a domain with only A records was inaccurate. I replaced it with `ipv4only.arpa.`, which is the standards-defined A-only name for NAT64/DNS64 discovery.
- The end-to-end `curl` example used `ipv4only.example.com`, which is a placeholder name and not a real working test target. I replaced it with an explicit placeholder indicating the reader must use a real hostname that only has A records.

## Review Notes
- `module-config: "dns64 validator iterator"` and `dns64-prefix: 64:ff9b::/96` are correct according to current Unbound documentation.
- The post is intentionally using the well-known NAT64 prefix `64:ff9b::/96`. In environments that need a network-specific prefix instead, the examples would need corresponding changes.
- The `google.com` AAAA example is acceptable as a dual-stack example today, but any third-party hostname used for demonstrations can change over time.
