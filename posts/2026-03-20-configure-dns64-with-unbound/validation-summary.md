# Validation Summary: How to Configure DNS64 with Unbound

## Status
validated

## Post Type
Guide

## Technologies Covered
- Unbound
- DNS64
- NAT64
- DNSSEC
- `dig`
- `unbound-checkconf`
- `unbound-control`

## Sources Consulted
- NLnet Labs Unbound configuration reference: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- NLnet Labs Unbound remote control and statistics reference: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound-control.html
- NLnet Labs Unbound release history and download page: https://nlnetlabs.nl/projects/unbound/download/
- RFC 6147, DNS64: https://www.rfc-editor.org/rfc/rfc6147
- RFC 7050, Discovery of the IPv6 Prefix Used for IPv6 Address Synthesis: https://www.rfc-editor.org/rfc/rfc7050
- RFC 8880, Special Use Domain Name 'ipv4only.arpa': https://www.rfc-editor.org/rfc/rfc8880.html

## Issues Found
- The post said DNS64 support was added in Unbound 1.5.4. I corrected this to Unbound 1.5.0 based on NLnet Labs release history.
- The Unbound configuration used a `dns64:` block with `prefix:`. Unbound configures DNS64 with `dns64-prefix:` and related options in the global `server:` section, so I rewrote the configuration snippets accordingly.
- The sample config implied IPv4-range exclusion settings that were not actually configured and did not match the documented Unbound DNS64 options shown here. I removed those misleading comments.
- The post said views could be used for per-client DNS64 control. The DNS64 options are global `server:` settings in Unbound, so I corrected the text to recommend separate instances or separate listener addresses instead.
- The `dig` example used `example.com` as an A-only test domain. I replaced it with `ipv4only.arpa`, the standardized special-use A-only name for NAT64/DNS64 discovery and testing, and updated the expected synthesized addresses for the `64:ff9b::/96` prefix.
- The monitoring section suggested `unbound-control` exposes DNS64-specific counters via `grep -i dns64`. Unbound's documented statistics do not include dedicated DNS64 counters, so I changed the example to inspect related AAAA and answer counters instead and noted the remote-control prerequisite.
- The DNSSEC troubleshooting note incorrectly said Unbound avoids synthesizing signed responses when validation is enabled. I corrected this to match RFC 6147: validating DNS64 resolvers validate the negative AAAA and A responses before synthesis, while client-side end-to-end DNSSEC validation of synthesized AAAA data remains incompatible.
- The summary and crash guidance still referenced a `dns64` section and 1.5.4 version floor. I updated both to the documented `dns64-prefix` server option and 1.5.0 support floor.

## Review Notes
- `example.com` was verified on 2026-05-06 to return AAAA records in live DNS, so it is not a stable A-only DNS64 test target.
- `unbound-control` examples require remote control to be enabled and control keys or certificates to be set up first.
- The `auto-trust-anchor-file` path in the example is distribution-specific; the post uses a plausible Linux package path, but operators should confirm the correct path for their distro package.
