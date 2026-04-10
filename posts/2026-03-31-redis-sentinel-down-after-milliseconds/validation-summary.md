# Validation Summary: How to Configure down-after-milliseconds in Redis Sentinel

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis Sentinel
- Redis CLI (`redis-cli`)
- Sentinel configuration (`sentinel.conf`)

## Sources Consulted
- Official Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis Sentinel specification: https://redis-doc-test.readthedocs.io/en/latest/topics/sentinel-spec/
- Redis Sentinel client specification: https://redis.io/docs/latest/develop/reference/sentinel-clients/

## Issues Found
No technical issues found.

All verified claims:
- Default value of 30000ms (30 seconds) is correct.
- S-DOWN (Subjectively Down) and O-DOWN (Objectively Down) terminology and behavior are accurate.
- Sentinel PING mechanism description is correct (Sentinels send periodic PINGs to monitored instances).
- Runtime configuration syntax `SENTINEL SET mymaster down-after-milliseconds 3000` is correct.
- `down-after-milliseconds` does apply to replicas and affects promotion eligibility during failover.
- `SENTINEL masters` command correctly shows the configured `down-after-milliseconds` value.
- `SENTINEL replicas mymaster` is the correct modern command (replaces deprecated `SENTINEL slaves`).
- Config file syntax `sentinel down-after-milliseconds mymaster 5000` is correct.
- Default Sentinel port 26379 is correct.

## Review Notes
- The `SENTINEL replicas` command is the modern form available in Redis 5.0+. Older versions use `SENTINEL slaves`. The post does not mention version requirements, which is fine since Redis 5.0+ is the current mainstream.
- The tuning advice (3-5x P99 PING latency) is sound practical guidance, though it is the author's recommendation rather than official Redis documentation.
- The `redis-cli -p 6379 PING` command in the Tuning Strategy section measures round-trip time from the CLI client, not the Sentinel's perspective. This is a reasonable approximation but not exact. This is not an error, just a practical simplification.
