# Validation Summary: How to Configure Redis File Descriptor Limits

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (server configuration, maxclients, INFO command)
- Linux (file descriptors, /proc filesystem, ulimit)
- systemd (LimitNOFILE, unit overrides)
- /etc/security/limits.conf (PAM limits)
- sysctl (fs.file-max kernel parameter)

## Sources Consulted
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis CONFIG GET documentation: https://redis.io/docs/latest/commands/config-get/
- Redis server configuration (maxclients): https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Linux proc(5) man page (/proc/PID/limits, /proc/sys/fs/file-max)
- systemd.exec(5) man page (LimitNOFILE directive)
- limits.conf(5) man page (PAM nofile limits)

## Issues Found
- **Line 28: Incorrect INFO section for maxclients** — The command `redis-cli info server | grep maxclients` would return no output because `maxclients` is reported in the `INFO clients` section, not `INFO server`. The `server` section contains fields like `redis_version`, `process_id`, `tcp_port`, etc. The `maxclients` field was added to the `clients` section in Redis 7.0. Fixed to `redis-cli info clients | grep maxclients`.

## Review Notes
- The `maxclients + 32` formula is accurate — Redis reserves 32 file descriptors for internal use (persistence, replication, logging, cluster bus, etc.), matching the CONFIG_MIN_RESERVED_FDS constant in Redis source code.
- The example warning message at startup accurately reflects Redis's actual log output when the fd limit is too low to satisfy the configured maxclients.
- The note that `/etc/security/limits.conf` does not affect systemd-managed services is an important and correct caveat — systemd services get their limits from the unit file, not PAM.
- `systemctl edit redis` automatically runs `daemon-reload` after saving, so the explicit `daemon-reload` step is technically redundant but harmless and commonly included in guides for safety.
- The Redis service name may vary by distribution (e.g., `redis-server` on Debian/Ubuntu vs `redis` on RHEL/CentOS). The post uses `redis` throughout, which is reasonable but readers on Debian-based systems may need to substitute `redis-server`.
