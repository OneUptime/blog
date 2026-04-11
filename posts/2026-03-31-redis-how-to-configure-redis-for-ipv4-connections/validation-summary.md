# Validation Summary: How to Configure Redis for IPv4 Connections

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis (server configuration, `redis.conf`, `redis-cli`)
- Linux networking (`ip addr`, `hostname -I`, `ss`, `netstat`)
- UFW (Uncomplicated Firewall)
- iptables
- Docker and Docker Compose
- Python `redis` client library

## Sources Consulted
- Redis official documentation on configuration: https://redis.io/docs/latest/operate/oss_and_bss/management/config/
- Redis `bind` directive documentation: https://redis.io/docs/latest/operate/oss_and_bss/management/security/
- Redis CONFIG SET documentation: https://redis.io/docs/latest/commands/config-set/
- Redis protected-mode documentation
- Docker Hub Redis image documentation: https://hub.docker.com/_/redis

## Issues Found

### 1. Incorrect claim that `CONFIG SET bind` works at runtime
- **What was wrong:** The post suggested using `redis-cli CONFIG SET bind "127.0.0.1 192.168.1.10"` to change the bind address without restarting, with a note saying it "may not work in all Redis versions." In reality, `bind` is an immutable parameter in Redis — `CONFIG SET bind` returns an error in all versions. It has never been dynamically configurable.
- **What was changed:** Removed the `CONFIG SET bind` command example and replaced the section with a clear note stating that `bind` is immutable at runtime and requires editing `redis.conf` followed by a restart.
- **Why:** Presenting a non-functional command as a viable approach is misleading and would cause confusion when users encounter the error.

## Review Notes
- The default Redis bind in Redis 7.x is actually `bind 127.0.0.1 -::1` (both IPv4 and IPv6 loopback). The post simplifies this to just `127.0.0.1`, which is acceptable given the IPv4 focus but worth noting.
- The `systemctl restart redis` service name may vary by distribution. On Ubuntu/Debian with `apt install redis-server`, the service is typically `redis-server` (i.e., `systemctl restart redis-server`). The post uses `redis` which works on some distributions but not all.
- All other technical content — bind directive syntax, protected-mode behavior, firewall rules (UFW and iptables), Docker configuration, Python client code, and verification commands — is accurate and correct.
