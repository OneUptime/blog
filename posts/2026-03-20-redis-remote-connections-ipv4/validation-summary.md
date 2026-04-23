# Validation Summary: How to Enable Redis Remote Connections on IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis Open Source server configuration (`redis.conf`)
- Redis security features (`bind`, `requirepass`, `protected-mode`, `AUTH`)
- `redis-cli`
- Python with `redis-py`
- Node.js with `ioredis`
- Linux firewall management with UFW
- Linux firewall management with iptables
- systemd / `systemctl`
- Linux socket inspection with `ss`

## Sources Consulted
- Redis Security — https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- Redis Configuration — https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis sample `redis.conf` — https://github.com/redis/redis/blob/unstable/redis.conf
- Redis `AUTH` command reference — https://redis.io/docs/latest/commands/auth/
- Redis CLI documentation — https://redis.io/docs/latest/develop/tools/cli/
- Redis install guide for Linux — https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/install-redis-on-linux/
- redis-py connection guide — https://redis.io/docs/latest/develop/clients/redis-py/connect/
- ioredis README / connection examples — https://github.com/redis/ioredis
- Ubuntu `ufw(8)` man page — https://manpages.ubuntu.com/manpages/xenial/man8/ufw.8.html
- `iptables(8)` Linux man page — https://man7.org/linux/man-pages/man8/iptables.8.html
- Local CLI help: `ss --help`

## Issues Found
- The post incorrectly said `protected-mode` must be disabled for remote access. I changed this to keep `protected-mode` enabled, because Redis protected mode blocks remote access only in the unsafe default case described in the official docs; with an explicit `bind` and password configured, remote clients can still connect.
- The post used `systemctl restart redis` / `status redis`, which does not match the Debian/Ubuntu `redis-server` unit name implied by the `/etc/redis/redis.conf` path and Redis install docs. I changed both commands to `redis-server`.
- The UFW examples did not specify `tcp`, which would open or deny both TCP and UDP in UFW's simple syntax. I changed the rules to explicit `proto tcp` syntax because Redis listens on TCP.
- The SET/GET verification commands used a different placeholder password (`password`) than the configured `requirepass` value. I changed them to the same password so the examples work as written.
- The Redis URL example was made explicit as `redis://default:...` to align with Redis authentication documentation and the default-user model used by `requirepass`.
- The public-exposure guidance was too weak. I corrected it to say Redis should not be exposed to the public internet, and that remote access should remain behind firewall restrictions with TLS, SSH tunnels, or VPNs on untrusted networks.

## Review Notes
- Redis 6+ recommends ACLs for finer-grained authentication, but the legacy `requirepass` setting is still supported and remains valid for the default user.
- `redis-cli -a` is supported, but the official CLI docs recommend `REDISCLI_AUTH` when possible to avoid exposing passwords in shell history or process arguments.
- The `iptables` examples are technically correct for rule syntax and order, but they are runtime rules only unless persisted with distro-specific tooling.
