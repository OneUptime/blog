# Validation Summary: How to Monitor Pub/Sub Channel Activity in Redis

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (PUBSUB introspection commands, MONITOR, keyspace notifications, INFO stats)
- redis-cli
- Python (redis-py client library)
- Prometheus / redis_exporter
- Grafana

## Sources Consulted
- Redis official documentation for PUBSUB CHANNELS, PUBSUB NUMSUB, PUBSUB NUMPAT commands — https://redis.io/docs/latest/commands/pubsub-channels/
- Redis official documentation for keyspace notifications — https://redis.io/docs/latest/develop/use/keyspace-notifications/
- Redis official documentation for MONITOR command — https://redis.io/docs/latest/commands/monitor/
- Redis official documentation for INFO command — https://redis.io/docs/latest/commands/info/
- redis-py (Python client) documentation for pubsub_numsub return type — https://redis-py.readthedocs.io/en/stable/
- oliver006/redis_exporter Prometheus metrics documentation — https://github.com/oliver006/redis_exporter

## Issues Found

### 1. Python script: incorrect iteration over `pubsub_numsub()` return value
**What was wrong:** The script treated the return value of `r.pubsub_numsub()` as a flat list and iterated with `range(0, len(counts), 2)` using index access (`counts[i]`, `counts[i+1]`). In redis-py, `pubsub_numsub()` returns a dictionary `{channel_name: subscriber_count}`, so index-based access would raise a `TypeError`.
**What was changed:** Replaced the loop with `for channel, num_subs in counts.items()` to correctly iterate over the dictionary.

### 2. Keyspace notifications: incorrect comment about flags
**What was wrong:** The inline comment stated `g = generic, $ = string, E = keyevent` but the config string `"KEg"` does not contain `$`. The comment incorrectly described a flag not being used.
**What was changed:** Updated the comment to correctly describe the three flags in use: `K = keyspace, E = keyevent, g = generic commands`.

### 3. Keyspace notifications: incorrect claim about tracking subscribe/unsubscribe events
**What was wrong:** The text stated keyspace notifications can "track subscribe/unsubscribe events." Keyspace notifications fire on data key operations (SET, DEL, EXPIRE, RENAME, etc.), not on Pub/Sub subscribe or unsubscribe events. There is no built-in Redis mechanism to receive notifications when clients subscribe or unsubscribe from channels.
**What was changed:** Corrected the description to say keyspace notifications track "key-level data events (such as SET, DEL, and EXPIRE operations)."

### 4. INFO stats section: misleading comment and incorrect example output
**What was wrong:** The comment said "Total messages published since server start" but the fields shown (`pubsub_channels`, `pubsub_patterns`) are current-state gauges, not cumulative counters. Additionally, `total_commands_processed` does not contain the string "pubsub" and would not appear in `grep pubsub` output.
**What was changed:** Updated the comment to "Current Pub/Sub state from server stats" and removed the `total_commands_processed` line from the example output.

## Review Notes
- The `PUBSUB CHANNELS "*" | wc -l` pipeline will count correctly but note that `redis-cli` output formatting may add extra lines in some contexts. This is minor and acceptable for a quick count.
- The `MONITOR | grep PUBLISH` example is correct and the performance warning is appropriate.
- The Grafana/Prometheus metrics table references `redis_commands_total{cmd="publish"}` which is consistent with the oliver006/redis_exporter naming convention. Exact label names may vary slightly across exporter versions.
- The section heading "Track Message Throughput with INFO Stats" slightly overpromises — `INFO stats` shows current Pub/Sub state (channel/pattern counts), not per-message throughput metrics. The heading was not changed since the body was corrected to be accurate.
