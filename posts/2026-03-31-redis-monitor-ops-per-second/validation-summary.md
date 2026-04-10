# Validation Summary: How to Monitor Redis Ops Per Second

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (`INFO stats`, `LATENCY HISTORY`, `INFO latencystats`)
- redis-cli
- Bash scripting
- Python (redis-py library)
- Prometheus (redis_exporter, PromQL, alerting rules)

## Sources Consulted
- Redis INFO command documentation: https://redis.io/commands/info
- Redis LATENCY HISTORY command documentation: https://redis.io/commands/latency-history
- Redis 7.0 release notes (INFO latencystats section): https://github.com/redis/redis/blob/7.0/00-RELEASENOTES
- redis-py library documentation: https://redis-py.readthedocs.io/
- oliver006/redis_exporter metrics documentation: https://github.com/oliver006/redis_exporter
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
1. **Incorrect field name `latency_ms` for `INFO latencystats`** (line 96): The post referenced `latency_ms` as a field from `INFO latencystats`. This field does not exist. Redis 7.0's `INFO latencystats` exposes per-command latency percentiles in microseconds with field names like `latency_percentiles_usec_get`, `latency_percentiles_usec_set`, etc. Fixed the reference to use the correct field format (`latency_percentiles_usec_<command>`).

## Review Notes
- The shell script uses bash integer arithmetic (`$(( ... ))`), which truncates decimals. This is acceptable for a quick-and-dirty script but readers should be aware it won't show fractional ops/sec.
- `INFO latencystats` was introduced in Redis 7.0. Readers on older Redis versions would need to rely solely on `LATENCY HISTORY` for latency data.
- The Python example has no sleep between loop iterations beyond the `interval` parameter inside `get_ops_per_sec()`, which is fine since the sleep inside the function effectively paces the loop.
