# Validation Summary: How to Configure Redis bind Directive for IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis Open Source configuration (`redis.conf`)
- Redis networking and security (`bind`, `protected-mode`, `requirepass`, ACLs)
- `redis-cli`
- Linux networking inspection tools (`ss`, `netstat`)
- Linux firewall rules with `iptables`
- SSH local port forwarding

## Sources Consulted
- Redis security documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- Redis ACL documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Redis `CONFIG GET` command reference: https://redis.io/docs/latest/commands/config-get/
- Redis `INFO` command reference: https://redis.io/docs/latest/commands/info/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Redis installation on Linux documentation: https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/install-redis-on-linux/
- Official sample `redis.conf` from the Redis repository: https://github.com/redis/redis/blob/unstable/redis.conf
- `iptables(8)` Linux manual page: https://man7.org/linux/man-pages/man8/iptables.8.html
- Local CLI help output: `ss --help`
- Local CLI help output: `netstat --help`
- Local CLI help output: `iptables --help`
- Local CLI usage output: `ssh`

## Issues Found
- The introduction incorrectly stated that Redis itself defaults to binding only to `127.0.0.1` since Redis 3.2. I corrected this to distinguish between the sample `redis.conf` shipped with Redis, which binds loopback interfaces by default, and Redis started without a `bind` directive, which listens on all interfaces and relies on protected mode.
- The `bind 0.0.0.0` example suggested using it with "protected-mode and AUTH" without emphasizing firewalling. I updated the note to say it should only be used with authentication and firewall rules, which matches Redis security guidance.
- The verification command used `systemctl restart redis`, which is inconsistent with the Debian/Ubuntu-style `/etc/redis/redis.conf` path used in the post. I changed it to `redis-server` to match that packaging layout.
- The security section instructed readers to disable protected mode after setting `bind` and `requirepass`. Redis documentation says protected mode is enabled by default and should only be disabled when you knowingly want remote access without authentication. I changed this to keep `protected-mode yes`.
- The command-renaming note implied it as a standard hardening step. Redis now documents command renaming as deprecated in favor of ACL rules, so I kept the example but corrected the comment to reflect current guidance.
- The section heading "Redis ACL for IP-Based Access" was technically misleading because Redis ACLs do not filter by source IP. I renamed the section to describe firewall-based source-IP restriction instead.
- The local connectivity test used `redis-cli ping` even though the post had already enabled `requirepass`. That command would fail with `NOAUTH` in the documented configuration, so I changed it to authenticate before sending `PING`.
- The blocked-client example claimed an `iptables ... -j DROP` rule would produce `Connection refused`. A `DROP` target silently discards packets, so the connection attempt times out instead. I corrected the expected result.
- The final test command tried to extract `bind` from `INFO server`, but Redis `INFO` does not expose a `bind` field. I changed the example to query valid `INFO server` fields only.
- The conclusion was too narrow in recommending only `requirepass`. Redis recommends ACLs for Redis 6+, so I broadened the wording to "authentication (`requirepass` or ACLs)".

## Review Notes
- The post is now technically correct as a Redis networking and security guide focused on IPv4 binding.
- Redis 6+ recommends ACL-based authentication over the legacy shared-password `requirepass` setting.
- Redis documents command renaming as deprecated and subject to future removal; ACL rules are the preferred control for limiting commands.
- The service name for Redis differs by platform (`redis-server` on Debian/Ubuntu, `redis` on Red Hat/Rocky). The post now matches the Debian/Ubuntu-style filesystem layout it already used.
