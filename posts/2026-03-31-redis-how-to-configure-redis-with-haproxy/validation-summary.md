# Validation Summary: How to Configure Redis with HAProxy

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis (RESP protocol, AUTH, INFO replication, Sentinel)
- HAProxy 2.8.x (TCP mode, tcp-check, balance algorithms, stats)
- Linux systemd service management
- redis-cli

## Sources Consulted
- HAProxy Configuration Manual (tcp-check send, tcp-check expect, balance algorithms): https://docs.haproxy.org/2.8/configuration.html
- HAProxy tcp-check documentation for health check directives and escape sequence handling in send strings
- Redis protocol specification (RESP): https://redis.io/docs/reference/protocol-spec/
- Redis INFO command documentation (replication section output format): https://redis.io/commands/info/
- Redis AUTH command documentation: https://redis.io/commands/auth/
- Redis QUIT command documentation: https://redis.io/commands/quit/
- HAProxy balance algorithm reference (first, leastconn, roundrobin): https://docs.haproxy.org/2.8/configuration.html#4-balance

## Issues Found
No technical issues found.

## Review Notes
- The `AUTH password` syntax (single-argument) is used throughout. Redis 6.0+ also supports `AUTH username password` for ACL-based authentication. The single-argument form remains backward-compatible and correct, but readers using Redis 6.0+ ACLs with non-default users would need to adjust.
- The read replica backend does not verify `role:slave` — it only checks PING/PONG. This means a promoted replica (now master) would still receive read traffic. This is acceptable behavior (reads from a master work fine) but worth noting for readers who want strict separation.
- The `backup` keyword on redis-2 in the primary health-check section is somewhat redundant given the `role:master` check (only the actual master passes), but provides a useful additional preference layer and is not incorrect.
- Log viewing via `grep haproxy` on `/var/log/syslog` assumes rsyslog is configured to receive HAProxy's log output on the local0 facility. Some systems may require additional rsyslog configuration (`/etc/rsyslog.d/49-haproxy.conf`) to route HAProxy logs to syslog.
