# Validation Summary: How to Install and Configure Grafana Loki on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Grafana Loki (v2.9.3)
- Promtail (v2.9.3)
- Grafana
- Docker / Docker Compose
- systemd
- LogQL
- Ubuntu

## Sources Consulted
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Loki configuration examples: https://grafana.com/docs/loki/latest/configure/examples/configuration-examples/
- Single Store TSDB (tsdb): https://grafana.com/docs/loki/latest/operations/storage/tsdb/
- Migrate to TSDB: https://grafana.com/docs/loki/latest/setup/migrate/migrate-to-tsdb/
- Log retention / compactor: https://grafana.com/docs/loki/latest/operations/storage/retention/
- LogQL reference: https://grafana.com/docs/loki/latest/query/
- Loki GitHub releases (v2.9.3): https://github.com/grafana/loki/releases/tag/v2.9.3

## Issues Found
No technical issues found.

The post pins Loki and Promtail to **v2.9.3** throughout (binaries, Docker images, Docker Compose), and every configuration snippet is internally consistent with that version:

- Binary download URLs follow the correct GitHub release asset format and v2.9.3 exists.
- The basic `loki-config.yaml` is the standard single-binary example: `common.storage.filesystem` with `chunks_directory`/`rules_directory`, `query_range.results_cache.embedded_cache`, and a `schema_config` using `store: tsdb`, `object_store: filesystem`, `schema: v13`, 24h index period — all valid for 2.9.x.
- The retention section's `compactor.shared_store: filesystem` and the production config's `tsdb_shipper.shared_store: s3` and `limits_config.enforce_metric_name` are valid for 2.9.x. (These fields were only deprecated/removed in Loki 3.0, so they remain correct for the pinned 2.9.3.)
- Promtail config (`positions`, `clients` push URL `/loki/api/v1/push`, `scrape_configs`, `pipeline_stages` with `regex`/`labels`) is correct.
- systemd unit files are valid; data directory ownership (`nobody:nogroup`) matches the configured `path_prefix` and working directories.
- LogQL examples (`|=`, `|~`, `!=`, `| json`, `| regexp`, `| pattern`, `rate`, `count_over_time`, `topk`, `sum by`) are syntactically correct.
- Troubleshooting endpoints (`/ready`, `/metrics`, `/config` on :3100; `/targets`, `/metrics` on :9080) and the manual push API example are accurate.

## Review Notes
- The post explicitly targets Loki **2.9.3**, an older 2.x release. Readers adopting Loki **3.x** should note that several fields used here were removed or renamed in 3.0: `compactor.shared_store`, `tsdb_shipper.shared_store` (replaced by `compactor.delete_request_store` / per-store config), and `limits_config.enforce_metric_name`. This is a version caveat, not an error, since the guide is consistently pinned to 2.9.3.
- The basic config relies on the `common` block to derive TSDB shipper directories from `path_prefix` rather than an explicit `storage_config.tsdb_shipper` block — this is valid and matches Grafana's single-binary example.
- `grpc_listen_port: 9096` is a non-default value (default is 9095) but is a legitimate user choice and does not conflict with anything else in the guide.
