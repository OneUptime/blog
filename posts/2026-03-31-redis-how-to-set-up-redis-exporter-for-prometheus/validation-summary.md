# Validation Summary: How to Set Up Redis Exporter for Prometheus

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Prometheus
- redis_exporter (oliver006/redis_exporter)
- systemd
- Docker
- PromQL

## Sources Consulted
- redis_exporter GitHub repository and README: https://github.com/oliver006/redis_exporter
- redis_exporter releases page for latest version verification
- redis_exporter source code for metric name verification
- Prometheus documentation for scrape configuration syntax
- Prometheus Management API documentation for lifecycle endpoint (`/-/reload`)

## Issues Found

1. **Outdated version (v1.59.0 -> v1.82.0)**: The binary download URLs referenced v1.59.0, which is significantly outdated. Updated to v1.82.0 (latest release as of March 2026).

2. **Non-existent metric `redis_instantaneous_ops_per_sec`**: This metric is not exported by redis_exporter. The Redis INFO field `instantaneous_ops_per_sec` exists, but the exporter does not expose it as a dedicated metric. Removed from the metrics table. Users should use `rate(redis_commands_processed_total[1m])` instead (already shown in the PromQL section).

3. **Non-existent metric `redis_replication_lag_seconds`**: This metric does not exist in redis_exporter. Replaced with `redis_connected_slave_lag_seconds`, which is the actual metric exported for replica lag.

4. **Incorrect metric name `redis_commands_calls_total`**: The correct metric name is `redis_commands_total` (with a `cmd` label). Fixed in the per-command metrics example.

5. **Misleading "Enabling Per-Command Metrics" section**: The post implied that `--include-system-metrics` and `--redis-only-metrics` flags are required to enable per-command statistics. In reality, per-command metrics from `INFO commandstats` are exported by default with no special flags needed. Rewrote the section to clarify this and removed the misleading flags.

6. **Prometheus config field ordering**: Moved `scrape_interval` and `scrape_timeout` before `static_configs` to follow conventional Prometheus config ordering. While both orderings are valid YAML, the conventional ordering improves readability.

7. **Missing `--web.enable-lifecycle` note**: The `curl -X POST http://localhost:9090/-/reload` command requires Prometheus to be started with the `--web.enable-lifecycle` flag. Added a note to clarify this prerequisite.

8. **Incorrect `check_keys` reference**: The multi-instance section incorrectly mentioned the `check_keys` parameter as related to multi-instance scraping. Removed this reference as `check_keys` is a separate feature for key-level metrics.

## Review Notes
- The Description in the frontmatter mentions TLS setup, but the post does not actually cover TLS configuration. This is not a technical error but a minor metadata inconsistency.
- The systemd service file includes the Redis password in plain text in the ExecStart line. In production, users should use environment files (`EnvironmentFile=`) or a secrets manager instead. This is a security best practice note, not a technical error.
- The multi-instance relabeling pattern is correct and follows the standard Prometheus multi-target exporter pattern documented in the redis_exporter README.
