# Validation Summary: How to Configure Redis to Bind to IPv6 Addresses

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Redis (6.x and 7.x)
- IPv6 networking
- redis.conf configuration
- redis-cli
- systemd (systemctl)
- ss (socket statistics)
- ip6tables (IPv6 firewall)
- Redis TLS
- Python `redis` client
- Node.js `redis` client

## Sources Consulted
- Redis configuration reference: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Default `redis.conf` (Redis 7.x): https://raw.githubusercontent.com/redis/redis/7.0/redis.conf
- Redis security / protected mode: https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- Redis TLS encryption: https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/
- Redis 6.2 release notes (introduction of `-` optional bind prefix)
- RFC 3849 (IPv6 Documentation Address Prefix `2001:db8::/32`)
- RFC 4291 (IPv6 Addressing Architecture — hex digit grammar)

## Issues Found

1. **Invalid IPv6 prefix in firewall example.** The `ip6tables` snippet used `2001:db8:app::/48`, which is not a valid IPv6 address — `p` is not a hex digit (only `0-9` and `a-f` are permitted). Confirmed invalid by Python's `ipaddress.IPv6Network` parser. Replaced with `2001:db8:abcd::/48`, which uses only valid hex characters and remains within the RFC 3849 documentation prefix.

## Review Notes

- The default `bind 127.0.0.1 -::1` and the `-` "optional bind" prefix described in the post are accurate for Redis 6.2+ and were verified against the upstream `redis.conf`.
- TLS directive names (`tls-port`, `tls-cert-file`, `tls-key-file`, `tls-ca-cert-file`, `tls-auth-clients`) are correct for Redis 6+.
- `protected-mode` behavior is described correctly — it restricts non-loopback access when no password and no `bind` configuration are set.
- `redis-cli -h ::1 ping` and `ss -6 -tlnp | grep redis` are valid and produce the documented output on systems where Redis listens on IPv6.
- The post does not mention Redis ACLs (Redis 6+), which are a more granular alternative to `requirepass`. This is a possible future enhancement but not a technical error.
- The Debian/Ubuntu service unit is `redis-server` rather than `redis` on some distributions; `systemctl restart redis` works on RHEL-family distros and on systems where the unit alias `redis.service` exists. Not changed since both forms are common in practice.
