# Validation Summary: How to Log Redis Slow Queries to External Systems

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (SLOWLOG commands, configuration)
- Python (redis-py client library)
- Elasticsearch (elasticsearch-py client library)
- Datadog (datadog Python library, DogStatsD)
- Telegraf (Redis input plugin)
- Prometheus / Grafana (redis_exporter, PromQL, alerting rules)
- Filebeat (log shipping)

## Sources Consulted
- Redis SLOWLOG documentation: https://redis.io/commands/slowlog/
- redis-py documentation and source code for `slowlog_get()` return format: https://github.com/redis/redis-py
- elasticsearch-py documentation: https://elasticsearch-py.readthedocs.io/
- Datadog Python library (datadogpy) documentation: https://github.com/DataDog/datadogpy
- Telegraf Redis input plugin documentation: https://github.com/influxdata/telegraf/tree/master/plugins/inputs/redis
- oliver006/redis_exporter metrics documentation: https://github.com/oliver006/redis_exporter
- Prometheus PromQL documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found

1. **Misleading comment on slowlog threshold** (line 18): The comment said "100ms = 100000 microseconds" but the value being set was 10000 (10ms). While the conversion math was correct in isolation, it was misleading in context. Changed to "10ms = 10000 microseconds" to match the actual configured value.

2. **Wrong redis-py dictionary key `client_addr`** (4 locations across Elasticsearch, Datadog, and Filebeat code blocks): The `slowlog_get()` method in redis-py returns entries with the key `client_address`, not `client_addr`. Using `client_addr` with `.get()` would always silently return the default value, meaning client address information would never be captured. Changed all occurrences to `client_address`.

3. **Missing `import json` in Datadog section**: The Datadog code block used `json.dumps()` to print log events but did not import the `json` module, which would cause a `NameError` at runtime. Added `import json` to the imports.

## Review Notes
- The Elasticsearch script uses `es.index(index=..., body=doc)`. In elasticsearch-py 8.x, the `body` parameter is deprecated in favor of `document=doc`. The current code works with elasticsearch-py 7.x and in 8.x compatibility mode, but users on elasticsearch-py 8.x+ should use `document` instead of `body`.
- The Prometheus PromQL query `rate(redis_slowlog_length[5m]) * 60` applies `rate()` to what is effectively a gauge metric. This is a common approximation but not strictly correct — `rate()` is designed for monotonically increasing counters. When the slow log reaches `slowlog-max-len`, the length plateaus and `rate()` returns 0 even as new entries replace old ones. A more reliable approach would be to use `redis_slowlog_last_id` (exposed by redis_exporter) which is monotonically increasing. The same caveat applies to the `increase(redis_slowlog_length[5m])` alert expression.
- The Datadog section calls `initialize(api_key=...)` which configures the HTTP API key, but the code only uses `statsd` (DogStatsD) which communicates with the local Datadog Agent over UDP and doesn't use the API key. This works but may confuse readers into thinking the API key is required for DogStatsD.
