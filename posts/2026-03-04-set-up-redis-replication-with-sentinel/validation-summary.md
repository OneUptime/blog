# Validation Summary: How to Set Up Redis Replication with Sentinel on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Redis 6
- Redis replication
- Redis Sentinel
- systemd
- redis-cli
- redis-py

## Sources Consulted
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis Sentinel client specification: https://redis.io/docs/latest/develop/reference/sentinel-clients/
- redis-py guide: https://redis.io/docs/latest/develop/clients/redis-py/
- Red Hat Enterprise Linux 9 release notes for Redis 6.2 and configuration paths: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.0_release_notes/
- Red Hat Enterprise Linux 9 database server documentation for Redis availability: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/configuring_and_using_database_servers/

## Issues Found
- The explanation of the Sentinel quorum value said that two sentinels must agree before failover. Redis documentation distinguishes objective-down quorum from the separate majority authorization required for failover, so the sentence was updated to describe both parts accurately.
- The failover test described the `SENTINEL get-master-addr-by-name` command as watching logs. That command queries Sentinel for the current master address, so the wording was corrected.

## Review Notes
The Redis configuration directives (`requirepass`, `masterauth`, `replicaof`, and Sentinel monitor/auth/failover options) are valid for Redis 6 on RHEL 9. The RHEL 9 `/etc/redis/redis.conf` and `/etc/redis/sentinel.conf` paths are consistent with Red Hat release notes. The Python redis-py Sentinel example is syntactically valid for a deployment where Sentinel itself does not require client authentication.
