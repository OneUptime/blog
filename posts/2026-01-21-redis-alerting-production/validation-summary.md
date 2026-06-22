# Validation Summary: How to Set Up Redis Alerting for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Redis
- redis_exporter
- Prometheus alerting rules and PromQL
- Alertmanager
- PagerDuty
- Slack incoming webhooks
- Python
- redis-py

## Sources Consulted
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- Redis memory optimization documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/memory-optimization/
- redis-py guide: https://redis.io/docs/latest/develop/clients/redis-py/
- redis_exporter README and source: https://github.com/oliver006/redis_exporter
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- PagerDuty Events API v2 documentation: https://developer.pagerduty.com/docs/events-api-v2-overview
- Slack incoming webhooks documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/

## Issues Found
- Redis memory percentage alerts divided by `redis_memory_max_bytes` without checking whether `maxmemory` was configured. The redis_exporter documentation states that `redis_memory_max_bytes` is `0` when no Redis memory limit is set, so I added `redis_memory_max_bytes > 0` guards to the warning and critical memory alerts.
- The replication warning used `redis_master_last_io_seconds_ago` but described it as replication lag. Redis documents this INFO field as seconds since the last interaction with the master, so I changed the alert name and text to describe stale replication I/O instead of data lag.
- The command latency alert divided a per-command metric by a global command counter without aggregation, which would not produce the intended average because of label mismatch. I changed it to `sum without (cmd) (rate(...))` before dividing by `redis_commands_processed_total`.
- The Alertmanager route and inhibition examples used deprecated `match`, `source_match`, and `target_match_re` fields. I updated them to current `matchers`, `source_matchers`, and `target_matchers` syntax.
- The Python alerting script could trigger `RedisDown` but never resolve it when connectivity returned. I added handling to emit a resolved `RedisDown` alert after a successful connectivity check.
- The Redis down runbook suggested validating configuration with `redis-server --test-memory`, which is a memory test rather than a Redis configuration validation step. I replaced that guidance with testing the corrected configuration in a safe environment before restarting production.
- The Memory Critical runbook had malformed Markdown code-fence closers with language strings appended, such as `text` and `bash`. I corrected them to proper closing fences.

## Review Notes
YAML snippets parse successfully and the Python example compiles with Python's `ast` parser. `promtool`, `amtool`, `redis-cli`, and `redis-server` were not installed in this environment, so I could not run official local validation commands for Prometheus/Alertmanager configs or Redis CLI output.
