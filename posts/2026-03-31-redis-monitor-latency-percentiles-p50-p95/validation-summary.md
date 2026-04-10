# Validation Summary: How to Monitor Redis Latency Percentiles (p50, p95, p99)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis 7.0+ (latency monitoring framework, INFO latencystats, SLOWLOG)
- redis-cli (--latency, --latency-history, --latency-dist)
- Python redis-py client library
- Prometheus (PromQL histogram_quantile)
- redis_exporter (oliver006/redis_exporter)
- Grafana (visualization)

## Sources Consulted
- Redis LATENCY command documentation: https://redis.io/commands/latency-latest/
- Redis CONFIG SET latency-monitor-threshold documentation: https://redis.io/docs/latest/commands/config-set/
- Redis SLOWLOG documentation (slowlog-log-slower-than is in microseconds): https://redis.io/docs/latest/commands/slowlog-get/
- Redis INFO command documentation (latencystats section, added in Redis 7.0): https://redis.io/docs/latest/commands/info/
- Redis latency monitoring documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency-monitor/
- redis-py client library documentation: https://redis-py.readthedocs.io/
- Prometheus histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- redis_exporter GitHub repository: https://github.com/oliver006/redis_exporter

## Issues Found
No technical issues found.

## Review Notes
- The post title and description mention p95, but `INFO latencystats` tracks p50, p99, and p99.9 by default (not p95). The post's sample output correctly shows the defaults. p95 is achievable via Prometheus histogram_quantile as shown. This is not an error but worth noting for readers who expect p95 from INFO latencystats directly. The `latency-tracking-info-percentiles` config option can customize which percentiles are tracked.
- The Python code comment says "value is a dict-like string; parse it" but redis-py already parses the value into a Python dict, so no additional parsing is needed. The code works correctly despite the slightly misleading comment.
- `--latency-dist` is described as an "ASCII heatmap" — it is technically a color-coded spectrum visualization, but the description is a reasonable approximation.
- The `slowlog-log-slower-than` value of 1000 is in microseconds (not milliseconds), which matches the 1ms latency-monitor-threshold. The post does not explicitly state the unit for this config, but the value is correct.
