# Validation Summary: How to Build Mimir Compactor Configuration

## Status
validated

## Post Type
Technical guide / Configuration tutorial

## Technologies Covered
- Grafana Mimir
- Mimir Compactor
- Prometheus metrics and alerting rules
- Object storage for Mimir blocks
- Memberlist and Consul hash-ring backends
- Memcached caches for Mimir bucket-store

## Sources Consulted
- Grafana Mimir configuration parameters: https://grafana.com/docs/mimir/latest/configure/configuration-parameters/
- Grafana Mimir compactor architecture: https://grafana.com/docs/mimir/latest/references/architecture/components/compactor/
- Grafana Mimir metrics storage retention: https://grafana.com/docs/mimir/latest/configure/configure-metrics-storage-retention/
- Grafana Mimir runtime configuration: https://grafana.com/docs/mimir/latest/configure/about-runtime-configuration/
- Grafana Mimir hash rings: https://grafana.com/docs/mimir/latest/configure/configure-hash-rings/
- Grafana Mimir bucket index: https://grafana.com/docs/mimir/latest/references/architecture/bucket-index/

## Issues Found
- Several compactor configuration keys were not valid Mimir configuration parameters. Replaced `max_compaction_range`, `consistency_delay`, `compaction_jobs_concurrent`, and `max_compaction_bytes` with documented settings such as `max_compaction_time`, `first_level_compaction_wait_period`, and `compaction_jobs_order`.
- Split-and-merge settings were shown under `compactor` with invalid keys such as `compaction_mode`, `split_and_merge_shards`, and `split_groups`. Moved these to the documented tenant limit keys `compactor_split_and_merge_shards` and `compactor_split_groups`.
- Retention was shown with Loki-style `retention_enabled` and `retention_period` keys under `compactor`. Updated retention to use `limits.compactor_blocks_retention_period`, with per-tenant examples under runtime configuration `overrides`.
- Multi-instance compactor examples used unsupported `sharding_enabled` and `replication_factor` fields. Removed them and kept the documented `compactor.sharding_ring` hash-ring configuration.
- Comments described `compaction_concurrency` as tenant concurrency. Updated wording to match Mimir documentation: it controls concurrent compactions in a compactor instance.
- The best-practice and conclusion wording implied an explicit sharding enable flag for high availability. Updated it to refer to running multiple compactors with a shared hash ring for horizontal scaling.

## Review Notes
The article is now aligned with the current Grafana Mimir 3.1.x documentation. The production configuration is still illustrative; real deployments should validate the full rendered config with the running Mimir version and tune disk capacity based on tenant block sizes and `compaction_concurrency`.
