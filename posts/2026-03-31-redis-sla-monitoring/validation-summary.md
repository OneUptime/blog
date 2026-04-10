# Validation Summary: How to Implement Redis SLA Monitoring

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (PING, INFO stats, SLA concepts)
- Prometheus (PromQL queries, alerting rules)
- Grafana (alert rule definitions)
- oliver006/redis_exporter (Prometheus exporter for Redis)
- Bash scripting (availability checks, SLA report generation)
- Docker Compose (redis_exporter deployment)
- Node Exporter textfile collector (custom metric exposure)

## Sources Consulted
- [oliver006/redis_exporter GitHub repository](https://github.com/oliver006/redis_exporter) - verified metric names and environment variable formats
- [oliver006/redis_exporter exporter.go source code](https://github.com/oliver006/redis_exporter/blob/master/exporter/exporter.go) - verified metricMapCounters mappings for exact Prometheus metric names
- [Sysdig - How to monitor Redis with Prometheus](https://www.sysdig.com/blog/redis-prometheus) - confirmed `redis_commands_processed_total` and `redis_up` metric names and usage patterns
- [Docker Hub - oliver006/redis_exporter](https://hub.docker.com/r/oliver006/redis_exporter) - verified REDIS_ADDR environment variable format supports `redis://` URI scheme
- [Grafana - Redis Exporter documentation](https://grafana.com/oss/prometheus/exporters/redis-exporter/) - cross-referenced metric availability

## Issues Found

### 1. Error rate PromQL query used non-existent metric names and labels
**What was wrong:** The error rate query used `redis_commands_total{status="failed"}` for the numerator and `redis_commands_total` for the denominator. The standard redis_exporter does not expose a `redis_commands_total` metric (the correct name is `redis_commands_processed_total`), and no command metric carries a `status="failed"` label. This query would return no data.

**What was changed:** Replaced the numerator with `redis_total_error_replies` (maps from Redis INFO stat `total_error_replies`, available in Redis 6.2+) and the denominator with `redis_commands_processed_total` (maps from `total_commands_processed`). Added a note that this requires Redis 6.2+. These metric names were verified against the redis_exporter source code (`metricMapCounters` in `exporter/exporter.go`).

**Why:** The original query would silently return empty results in Prometheus, giving users no error rate data. The corrected query uses real metrics from the standard redis_exporter.

### 2. curl command in SLA report script lacked URL encoding
**What was wrong:** The `query_prometheus()` function passed the PromQL query directly in the URL: `curl -s "$PROMETHEUS_URL/api/v1/query?query=$1"`. PromQL queries contain special characters (parentheses, square brackets, asterisks) that must be URL-encoded for HTTP requests. Without encoding, the request would fail or return unexpected results.

**What was changed:** Replaced with `curl -s -G "$PROMETHEUS_URL/api/v1/query" --data-urlencode "query=$1"` which uses curl's built-in `--data-urlencode` flag with `-G` (GET request) to properly encode the query parameter.

**Why:** The original command would fail when the PromQL query contained characters like `(`, `)`, `[`, `]`, or `*`, which all the example queries in the post do.

## Review Notes
- The `date -d "last month"` syntax in the SLA report script is GNU/Linux-specific (GNU coreutils). On macOS, the equivalent is `date -v-1m`. Since this is a server-side monitoring script, Linux is the expected environment, so this is acceptable but worth noting for readers on macOS.
- The `date +%s%3N` format in the availability check script also requires GNU date (the `%N` nanosecond format specifier is not available on macOS/BSD date). Same consideration applies.
- The Grafana alert rules section uses Prometheus alerting rule format (groups/rules/alert/expr), which is compatible with Grafana's unified alerting when using a Prometheus-compatible datasource. This is technically correct but readers should be aware this is Prometheus rule format consumed by Grafana, not Grafana's native provisioning format.
- The 99.9% availability = 43.8 min downtime/month calculation is correct (based on average month length of 30.44 days).
- The `redis_total_error_replies` metric requires Redis 6.2+ which introduced the `total_error_replies` INFO stat. Readers using older Redis versions will need alternative error monitoring approaches.
