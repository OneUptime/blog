# Validation Summary: Redis Sentinel Configuration Best Practices

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis Sentinel (monitoring and automatic failover)
- Redis TLS (Redis 6+)
- Python redis-py client library (Sentinel integration)
- redis-cli (Sentinel health monitoring commands)

## Sources Consulted
- Official Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis TLS documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/encryption/
- Redis sentinel.conf reference (default values for down-after-milliseconds, failover-timeout, parallel-syncs)
- redis-py source code (redis/sentinel.py) for Sentinel client API verification

## Issues Found
- **`SENTINEL SLAVES` command is deprecated**: The blog used `SENTINEL slaves mymaster` in the monitoring section. Since Redis 5.0, the recommended command is `SENTINEL REPLICAS <master-name>`. The `SLAVES` variant still works as a deprecated alias, but official documentation only documents `REPLICAS`. Changed to `SENTINEL replicas mymaster`.

## Review Notes
- The quorum values shown (2 for 3 Sentinels, 3 for 5 Sentinels) are reasonable defaults, but readers should understand that quorum is configurable and separate from the majority requirement needed to authorize a failover. The post's comment "majority required" is accurate.
- The `down-after-milliseconds` default of 30000ms (30 seconds) is confirmed in the sentinel.conf reference.
- The `failover-timeout` default of 180000ms (3 minutes) is confirmed in the sentinel.conf reference.
- The notification script timeout of 60 seconds is correct. The post simplifies exit code behavior (only mentions exit code 0 for success). In reality: exit code 1 triggers retry (up to 10 times), exit code 2+ prevents retry. This simplification is acceptable for a best practices guide.
- The TLS section uses `tls-port 26380` instead of the standard 26379. This is a valid configuration choice when running both TLS and non-TLS listeners simultaneously, though the post does not explicitly explain why a non-standard port is used.
- The Python redis-py `slave_for()` method is still a valid and functional API, though newer code may prefer terminology-neutral alternatives.
