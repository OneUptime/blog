# Validation Summary: How to Add and Remove Sentinels in a Running Setup

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Redis Sentinel
- Redis CLI (`redis-cli`)
- Redis Sentinel configuration files

## Sources Consulted
- Official Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis SHUTDOWN command reference: https://redis.io/docs/latest/commands/shutdown/
- Redis example sentinel.conf: https://download.redis.io/redis-stable/sentinel.conf

## Issues Found

### 1. Invalid `SENTINEL SHUTDOWN` command (line 71)
**What was wrong:** The post listed `SENTINEL SHUTDOWN` as a valid command to stop a Sentinel process, with plain `SHUTDOWN` as an alternative. `SENTINEL SHUTDOWN` is not a valid Redis subcommand — `SHUTDOWN` is a top-level command, not a `SENTINEL` subcommand.
**What was changed:** Removed the `SENTINEL SHUTDOWN` line and kept only the correct `SHUTDOWN` command.
**Why:** The official Redis command reference lists `SHUTDOWN` as a connection management command, not as a subcommand of `SENTINEL`. Running `SENTINEL SHUTDOWN` would return an error.

### 2. Incorrect "30 days" retention claim (line 78)
**What was wrong:** The post stated "Other Sentinels remember the removed Sentinel for 30 days by default." This is factually incorrect.
**What was changed:** Replaced with "Other Sentinels never automatically forget a Sentinel they have seen, even if it becomes unreachable."
**Why:** The official Redis Sentinel documentation explicitly states: "Sentinels never forget already seen Sentinels, even if they are not reachable for a long time." There is no 30-day timeout. The only way to remove a stale Sentinel entry is via `SENTINEL RESET`.

## Review Notes
- All configuration directives (`sentinel monitor`, `sentinel down-after-milliseconds`, `sentinel failover-timeout`, `sentinel parallel-syncs`) are valid and current.
- The auto-discovery mechanism description (via Pub/Sub on the `__sentinel__:hello` channel) is accurate.
- The `SENTINEL SET mymaster quorum N` syntax is correct per official documentation.
- The `SENTINEL RESET` behavior description is accurate — it clears all previously discovered replicas and Sentinels and forces re-discovery.
- The `SENTINEL sentinels` and `SENTINEL masters` commands and their output fields (`num-other-sentinels`, `quorum`) are correctly referenced.
- The quorum value of 3 for a 5-Sentinel setup is a sound recommendation (majority = 3).
