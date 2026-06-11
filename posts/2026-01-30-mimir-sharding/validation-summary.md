# Validation Summary: How to Build Mimir Sharding

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana Mimir
- Prometheus-compatible remote write and query architecture
- Mimir ingesters, distributors, compactors, store-gateways, queriers, rulers, query-frontends, and query-schedulers
- Mimir hash rings, memberlist, zone-aware replication, and shuffle sharding
- Kubernetes StatefulSets
- Memcached caching
- Amazon S3 object storage
- Prometheus recording and alerting rules
- Mermaid diagrams

## Sources Consulted
- Grafana Mimir configuration parameters: https://grafana.com/docs/mimir/latest/configure/configuration-parameters/
- Configure Grafana Mimir shuffle sharding: https://grafana.com/docs/mimir/latest/configure/configure-shuffle-sharding/
- Grafana Mimir store-gateway component documentation: https://grafana.com/docs/mimir/latest/references/architecture/components/store-gateway/
- Grafana Mimir compactor component documentation: https://grafana.com/docs/mimir/latest/references/architecture/components/compactor/
- Configure Grafana Mimir metrics storage retention: https://grafana.com/docs/mimir/latest/configure/configure-metrics-storage-retention/
- Configure Grafana Mimir zone-aware replication: https://grafana.com/docs/mimir/latest/configure/configure-zone-aware-replication/
- Grafana Mimir runtime configuration: https://grafana.com/docs/mimir/latest/configure/about-runtime-configuration/
- Grafana Mimir object storage backend configuration: https://grafana.com/docs/mimir/latest/configure/configure-object-storage-backend/
- Grafana Mimir runbooks and monitoring references: https://grafana.com/docs/mimir/latest/manage/mimir-runbooks/

## Issues Found
- The ingester, compactor, and store-gateway examples nested `memberlist.join_members` under each ring `kvstore`. Mimir configures memberlist under the top-level `memberlist` block, while ring `kvstore.store` selects `memberlist`. I moved the join members to top-level `memberlist` blocks in standalone snippets.
- The zone-aware ingester example described `excluded_zones` as requiring different zones before acknowledging writes. In Mimir, `excluded_zones` filters zones out of the ring. I corrected the comment.
- The compactor examples used nonexistent `compactor.sharding_enabled`, `compactor.ring`, and `compactor.tenant_shard_size` fields. I changed the ring block to `compactor.sharding_ring` and moved tenant shard size to `limits.compactor_tenant_shard_size`.
- The compactor distribution diagram labeled the setting as `tenant_shard_size`. I changed it to `compactor_tenant_shard_size`.
- The compactor cleanup example used nonexistent `retention_enabled`. Mimir retention is configured with `limits.compactor_blocks_retention_period`, so I replaced the retention setting with that field.
- The `max_compaction_time` comment said it controlled the maximum number of blocks in one operation. It actually limits time for starting compactions for a single tenant in one cycle, so I corrected the comment.
- The store-gateway examples used nonexistent `store_gateway.sharding_enabled`. Store-gateway sharding is configured through `store_gateway.sharding_ring`, so I removed that field.
- The block storage cache example used flattened `index_header_lazy_loading_enabled` and `index_header_lazy_loading_idle_timeout` fields. Current Mimir YAML nests these under `blocks_storage.bucket_store.index_header`, so I corrected the structure.
- The complete configuration used `query_frontend.max_outstanding_requests_per_tenant`, which belongs to `query_scheduler` in the current configuration reference. I removed it from the `query_frontend` block and left the valid query-scheduler setting.

## Review Notes
The guide focuses on the classic ingester architecture. Current Mimir documentation also covers ingest storage partition shuffle sharding, so a future update could clarify which architecture the examples target.
