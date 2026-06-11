# Validation Summary: How to Implement Mimir Ruler Configuration

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Grafana Mimir Ruler
- Prometheus recording and alerting rules
- Alertmanager integration
- Mimir ruler storage backends: filesystem, S3, GCS, Azure Blob Storage
- Mimir ruler ring and memberlist
- Kubernetes StatefulSet deployment

## Sources Consulted
- Grafana Mimir ruler documentation: https://grafana.com/docs/mimir/latest/references/architecture/components/ruler/
- Grafana Mimir v2.11 ruler documentation: https://grafana.com/docs/mimir/v2.11.x/references/architecture/components/ruler/
- Grafana Mimir configuration parameters: https://grafana.com/docs/mimir/latest/configure/configuration-parameters/
- Grafana Mimir HTTP API reference: https://grafana.com/docs/mimir/latest/references/http-api/
- Grafana Mimir v2.11 HTTP API reference: https://grafana.com/docs/mimir/v2.11.x/references/http-api/
- Grafana Mimir hash ring configuration: https://grafana.com/docs/mimir/latest/configure/configure-hash-rings/
- Grafana Mimir v2.11 Docker image help output: `docker run --rm grafana/mimir:2.11.0 -help`

## Issues Found
- Removed `ruler.enabled: true` from Mimir configuration examples. Mimir enables the ruler by running the ruler target, such as `-target=ruler`; `ruler.enabled` is not a Mimir config key.
- Changed the basic example `rule_path` from `/data/mimir/rules` to `/data/mimir/rules-temp` because Mimir rejects overlapping `ruler.rule_path` and `ruler_storage.filesystem.dir` directories.
- Updated S3 examples to include `endpoint: s3.us-east-1.amazonaws.com`; Mimir 2.11 requires an S3 endpoint.
- Replaced the invalid S3 `s3_force_path_style` option with `bucket_lookup_type: path`.
- Corrected the GCS `service_account` example to use service account JSON content rather than a filesystem path.
- Removed unsupported `enable_alertmanager_v2`, `external_labels`, `notification_queue_capacity`, `notification_timeout`, and `alertmanager_client.tls_enabled` fields from ruler examples.
- Corrected built-in Mimir Alertmanager guidance to include the `/alertmanager` API prefix.
- Replaced unsupported ruler sharding fields (`enable_sharding`, `sharding_strategy`, `replication_factor`, `instance_addr`, heartbeat settings) with documented ruler ring configuration and `limits.ruler_tenant_shard_size`.
- Corrected the Consul ring key from `host` to `hostname`.
- Removed unsupported Mimir 2.11 memberlist keys (`node_name`, `leave_timeout`, `compression_enabled`) from examples.
- Removed unsupported `query_stats_enabled` and `ruler_remote_write_headers` from the production example.
- Clarified that the Ruler API upload endpoint accepts one rule group body, not a full multi-group `groups:` file.
- Updated troubleshooting guidance to refer to consistent `ruler.ring` configuration instead of invalid `enable_sharding`.

## Review Notes
Validated the edited minimal configuration with `grafana/mimir:2.11.0`; it started successfully until the test timeout stopped it. The production example parsed under the same image and failed only while resolving example Kubernetes service names such as `memcached` and `mimir-ruler-headless`, which is expected outside the target cluster.
