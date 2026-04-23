# Validation Summary: How to Configure Redis Sentinel for IPv4 High Availability

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis
- Redis Sentinel
- Redis replication
- redis-cli
- redis-py
- ioredis
- systemd

## Sources Consulted
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis security documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/
- Redis configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/config/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- redis-py Sentinel documentation: https://redis.readthedocs.io/en/latest/_modules/redis/sentinel.html
- ioredis Sentinel documentation: https://github.com/redis/ioredis
- Redis source code for config parsing (`loadServerConfigFromString`): https://raw.githubusercontent.com/redis/redis/unstable/src/config.c

## Issues Found
- The post said Redis Sentinel requires a minimum of three Sentinels for quorum-based decisions. I changed that wording to describe the production recommendation accurately: three Sentinels are the robust deployment pattern because quorum and majority decisions can still succeed after one Sentinel failure.
- The post used `redis-cli -p 26379 sentinel info`, but `SENTINEL INFO` is not a documented Sentinel subcommand. I replaced it with `redis-cli -p 26379 sentinel master mymaster`, which is a supported inspection command.
- The failover test command targeted a Redis primary configured with `requirepass` but did not authenticate first. I added `-a RedisPassword123` so the example can actually run against the password-protected instance shown earlier in the post.
- The `sentinel.conf` snippet used inline `# ...` comments on directive lines. Redis config parsing only skips comments when `#` starts the line, so those lines would be parsed incorrectly. I converted the inline annotations to valid full-line comments.
- The Sentinel config disabled protected mode with `protected-mode no`. Given the post already binds to explicit interfaces and uses authentication, that setting was unnecessary and weakened the security posture of the example, so I removed it.

## Review Notes
- The Redis authentication examples use the legacy password-only pattern (`requirepass`, `masterauth`, and `sentinel auth-pass`). This is still supported and valid for the post as written, but Redis 6+ deployments should generally prefer ACL-based authentication for finer-grained access control.
- `sudo systemctl start redis-sentinel` is package- and distro-specific. The included `redis-sentinel /etc/redis/sentinel.conf` command is the Redis-documented generic way to start Sentinel when the standalone executable is available.
