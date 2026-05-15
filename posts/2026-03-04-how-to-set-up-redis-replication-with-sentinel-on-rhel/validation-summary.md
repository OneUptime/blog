# Validation Summary: How to Set Up Redis Replication with Sentinel on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- Redis replication
- Redis Sentinel
- systemd
- firewalld
- Redis CLI (`redis-cli`)

## Sources Consulted
- Redis Sentinel official documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis replication official documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- Redis REPLICAOF command documentation: https://redis.io/docs/latest/commands/replicaof/
- Red Hat Enterprise Linux 9.0 Release Notes, Redis 6.2 configuration paths: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.0_release_notes/New-features
- Red Hat Enterprise Linux 7 systemd service management documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/chap-managing_services_with_systemd

## Issues Found
- **Sentinel was configured with `daemonize yes` while the custom systemd unit used the default simple service type**: With `ExecStart=/usr/bin/redis-sentinel /etc/redis/sentinel.conf` and no `Type=forking`, Sentinel should stay in the foreground for systemd. Changed `daemonize yes` to `daemonize no`.
- **Sentinel configuration file ownership was missing**: Redis Sentinel requires a writable configuration file because it persists discovered state and failover updates to the config file. Added `sudo chown redis:redis /etc/redis/sentinel.conf`.
- **Sentinel log directory creation was missing**: The config writes logs to `/var/log/redis/sentinel.log` while the service runs as `redis`. Added `sudo install -o redis -g redis -d /var/log/redis` so the service can create/write the log file.
- **Quorum explanation omitted the majority-authorization requirement**: Redis Sentinel uses quorum to mark a master as objectively down, but the failover still requires authorization from a majority of Sentinel processes. Updated the final explanation to include both requirements.

## Review Notes
- The Redis replication directives (`replicaof`, `requirepass`, and `masterauth`) are valid for the Redis versions shipped with current RHEL releases. Keeping `masterauth` on every node is useful because a former master can become a replica after a Sentinel failover.
- The Sentinel directives (`sentinel monitor`, `sentinel auth-pass`, `sentinel down-after-milliseconds`, `sentinel failover-timeout`, and `sentinel parallel-syncs`) are current and match Redis documentation.
- The three-Sentinel, quorum-two example satisfies Redis Sentinel's majority-authorization requirement for failover.
- RHEL version differences matter: RHEL 9 uses `/etc/redis/redis.conf` and `/etc/redis/sentinel.conf`; RHEL 8 used `/etc/redis.conf` and `/etc/redis-sentinel.conf`.
