# Validation Summary: How to Set Postfix inet_interfaces to Listen on Specific IPv4 Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- Postfix
- SMTP
- IPv4
- Linux networking tools (`ss`, `telnet`)

## Sources Consulted
- Postfix `postconf(5)`: https://www.postfix.org/postconf.5.html
- Postfix `master(5)`: https://www.postfix.org/master.5.html
- Postfix `postfix(1)`: https://www.postfix.org/postfix.1.html
- Local `ss --help` output to verify `ss -tlnp` flag usage

## Issues Found
- The post used `inet_interfaces = localhost, 127.0.0.1` as a documented loopback-only example. Postfix documents `loopback-only` or explicit IP literals, so this was changed to `inet_interfaces = loopback-only`.
- The post said to use `postfix reload` after changing `inet_interfaces`. Postfix `postconf(5)` documents that `inet_interfaces` changes require a stop/start, and `inet_protocols` changes also require a stop/start, so the commands and conclusion were corrected.
- The multi-listener example did not actually bind port 25 only to the public IP, because `smtp inet ...` listens on all interfaces configured by `inet_interfaces`. It also used `smtpd_client_restrictions=permit_all`, which is not a documented generic SMTP restriction. The example was corrected to use explicit `host:port` listener bindings in `master.cf` and an empty `inet_interfaces` value, which Postfix documents for this case.
- The post stated that `inet_protocols = ipv4` should always be paired with specific IPv4 listeners on dual-stack systems. This was narrowed to the accurate case: use `inet_protocols = ipv4` when you want to disable IPv6 support entirely.

## Review Notes
- Postfix documents that constraining `inet_interfaces` to a single non-loopback IPv4 address can also constrain the outbound SMTP client source address when `smtp_bind_address` is not set. On some multi-homed firewall layouts, explicit source binding can cause reachability problems, so this is worth keeping in mind for future revisions.
