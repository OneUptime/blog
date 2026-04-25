# Validation Summary: How to Plan DNS Changes for IPv6 Migration

## Status
validated

## Post Type
Guide

## Technologies Covered
- DNS
- IPv6
- BIND 9
- DNSSEC
- Python 3
- dnspython
- `dig`
- `host`

## Sources Consulted
- RFC 3596: DNS Extensions to Support IP Version 6 — https://www.rfc-editor.org/rfc/rfc3596
- RFC 3901: DNS IPv6 Transport Operational Guidelines — https://www.rfc-editor.org/rfc/rfc3901.html
- RFC 4472: Operational Considerations and Issues with IPv6 DNS — https://www.rfc-editor.org/rfc/rfc4472.html
- RFC 5321: Simple Mail Transfer Protocol — https://www.rfc-editor.org/rfc/rfc5321.html
- RFC 1035: Domain Names - Implementation and Specification — https://www.rfc-editor.org/rfc/rfc1035
- RFC 8767: Serving Stale Data to Improve DNS Resiliency — https://www.rfc-editor.org/rfc/rfc8767.html
- BIND 9 Configuration Reference — https://bind9.readthedocs.io/en/latest/reference.html
- BIND 9 DNSSEC Guide — https://bind9.readthedocs.io/en/stable/dnssec-guide.html
- BIND 9 Manual Pages (`host`) — https://bind9.readthedocs.io/en/v9.18.1/manpages.html
- dnspython stub resolver documentation — https://dnspython.readthedocs.io/en/stable/resolver.html
- Python `ipaddress` documentation — https://docs.python.org/3/library/ipaddress.html
- Local CLI help output for `dig`, `host`, and `grep`

## Issues Found
- The inventory script always printed `Yes` in the `Has A` column. I changed the format string to use `has_a`, so the output now matches the actual lookup result.
- The inventory script depended on `dnspython` but did not say so. I added a `# Requires: pip install dnspython` note so the example can actually run as shown.
- The introduction and resolver section implied that recursive resolvers need IPv6 transport to answer AAAA queries. I corrected that to match RFC 3901 and RFC 4472: AAAA lookups do not by themselves require IPv6 transport, but dual-stack recursive resolvers avoid reachability failures across mixed IPv4/IPv6 environments.
- The BIND resolver example implied `listen-on-v6` was required to enable IPv6 listeners. I clarified that this makes IPv6 listening explicit, and that current BIND listens on all IPv6 interfaces by default when `listen-on-v6` is omitted.
- The MX comment said the mail server needs both A and AAAA records. I corrected this to `A and/or AAAA`, matching RFC 5321, which requires at least one address record for the MX target.
- The PTR script output block showed only one generated line while being labeled as complete output. I relabeled it as `Example output`.
- The rollout verification command used an invalid resolver literal, `@2001:db8::resolver`. I replaced it with the valid documentation address `@2001:db8::53`.
- The live log monitoring pipeline used `grep` without line buffering, which can delay output when piped from `tail -f`. I added `--line-buffered` so it behaves as a real-time monitoring example.
- The rollback note said clients revert within 60 seconds. I softened that claim to reflect DNS TTL/cache behavior more accurately; TTLs shorten rollback time, but refresh timing depends on cache state and resolver behavior.
- The DNSSEC section implied that signing alone was sufficient. I clarified that publishing the resulting DS record at the parent zone is part of standard DNSSEC deployment and is needed to complete the chain of trust.

## Review Notes
- Manual DNSSEC signing with `dnssec-keygen` and `dnssec-signzone` remains valid, but current BIND guidance generally prefers `dnssec-policy` automation for new deployments.
- The post correctly uses documentation-only example addresses and domains such as `203.0.113.0/24`, `2001:db8::/32`, and `example.com`.
