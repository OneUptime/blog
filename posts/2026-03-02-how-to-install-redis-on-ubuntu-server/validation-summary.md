# Validation Summary: How to Install Redis on Ubuntu Server

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Redis (in-memory data store)
- Ubuntu Server (apt package management)
- systemd (service management, unit overrides)
- redis-cli (CLI usage, AUTH, CONFIG, INFO, SLOWLOG, MONITOR)
- redis-benchmark
- UFW (firewall configuration)
- Linux kernel tuning (transparent hugepages, sysctl: vm.overcommit_memory, net.core.somaxconn)
- Redis persistence (RDB snapshots, AOF)

## Sources Consulted
- Official Redis APT repository documentation: https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/install-redis-on-linux/
- Upstream Redis systemd unit template: https://github.com/redis/redis/blob/unstable/utils/systemd-redis_server.service
- Redis configuration reference (redis.conf directives: bind, port, timeout, tcp-keepalive, requirepass, rename-command, maxmemory, maxmemory-policy, maxmemory-samples, save, appendonly, appendfsync, auto-aof-rewrite-*)
- Redis administration docs on Linux kernel tuning (THP, vm.overcommit_memory, somaxconn)
- systemd.resource-control documentation (MemoryLimit vs MemoryMax)
- ufw man page (allow/deny syntax with `from ... to any port ... proto ...`)

## Issues Found

1. **Incorrect `systemctl reload redis-server` recommendation**
   - The post claimed `sudo systemctl reload redis-server` could be used to apply config changes "without interrupting connections."
   - Verified against the upstream Redis systemd unit and the Debian/Ubuntu `redis-server.service`: neither defines an `ExecReload` directive, so `systemctl reload` fails with "Job type reload is not applicable for unit redis-server.service." Redis also does not re-read its configuration on SIGHUP.
   - **Fix:** Replaced the reload example with the correct approach: `redis-cli CONFIG SET <param> <value>` for runtime changes, followed by `CONFIG REWRITE` to persist them to `redis.conf`.

2. **Deprecated systemd directive `MemoryLimit=`**
   - The systemd override snippet used `MemoryLimit=2G`. This is the legacy cgroup v1 directive and is deprecated in favor of `MemoryMax=` (cgroup v2), which is what modern Ubuntu releases (20.04+) use by default. While `MemoryLimit=` still works as a compatibility alias, the modern equivalent is preferable.
   - **Fix:** Changed `MemoryLimit=2G` to `MemoryMax=2G`.

## Review Notes
- The official Redis APT repo URLs (`https://packages.redis.io/gpg` and `https://packages.redis.io/deb`) and install steps match the current Redis documentation.
- The Ubuntu `redis-server` package's default `redis.conf` actually ships with `bind 127.0.0.1 -::1` (not all interfaces), so the comment "By default Redis listens on all interfaces" is more accurate of the upstream Redis binary defaults than of the Ubuntu package's shipped config. This is a minor stylistic nuance, not a technical error — left as-is.
- All listed `maxmemory-policy` values are valid. The post does not mention `allkeys-lfu` / `volatile-lfu` (Redis 4.0+), but the listed policies are correct and the comment that `noeviction` is the default is accurate.
- Redis 7.0+ changed AOF to a multi-part design (base + incremental files in `appenddirname`), but `appendfilename` is still accepted and works as the base name. The simplified example is fine for an intro guide.
- The `/etc/rc.local` approach for persisting THP settings still works if the user creates the file with the correct shebang and executable bit (the `rc-local.service` systemd unit ships disabled on modern Ubuntu but is triggered automatically once `/etc/rc.local` exists). A more modern alternative would be a dedicated systemd unit or the `transparent_hugepage=never` kernel boot parameter, but the post's approach is not incorrect.
- `redis-cli -a "password"` triggers a "Using a password with '-a' or '-u' option on the command line interface may not be safe" warning. The `REDISCLI_AUTH` environment variable or `--no-auth-warning` flag avoids this, but the command itself is functionally correct.
