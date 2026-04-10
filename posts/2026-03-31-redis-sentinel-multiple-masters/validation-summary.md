# Validation Summary: How to Configure Redis Sentinel for Multiple Masters

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Redis Sentinel (monitoring, failover)
- Redis CLI (`redis-cli` commands for Sentinel)
- Python redis-py library (`redis.sentinel.Sentinel`)

## Sources Consulted
- Redis Sentinel official documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis SENTINEL command reference: https://redis.io/docs/latest/commands/sentinel/
- redis-py source code (`redis/sentinel.py`): https://github.com/redis/redis-py

## Issues Found
1. **Inaccurate `SENTINEL masters` output fields**: The example output used non-existent fields `status` and `address`. Redis Sentinel actually returns separate `ip`, `port`, and `flags` fields (among others). Fixed the output to use `ip`, `port`, and `flags -> master` to match the real response format.

## Review Notes
- The `SENTINEL REPLICAS` subcommand used in the post requires Redis >= 5.0. The legacy equivalent `SENTINEL SLAVES` still works for older versions.
- The runtime `SENTINEL MONITOR` command requires an IP address (IPv4 or IPv6), not a hostname, unlike the config file directive. The post uses IP addresses so this is fine, but readers should be aware of the distinction.
- In redis-py, the method for connecting to replicas is `slave_for()` (not `replica_for()`), which is a naming inconsistency with the server-side `SENTINEL REPLICAS` command.
- Starting with Redis 6.2, `SENTINEL SET` configuration changes propagate automatically between Sentinel instances via the gossip protocol. For older versions, you would need to run `SENTINEL SET` on each Sentinel instance individually. The post's advice to run commands on all instances is the safe/universal approach.
