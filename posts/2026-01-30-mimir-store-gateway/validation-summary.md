# Validation Summary: How to Create Mimir Store Gateway

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana Mimir
- Prometheus and PromQL
- Object storage backends for blocks storage
- Memcached caching
- Kubernetes StatefulSets and Services
- Mermaid diagrams

## Sources Consulted
- Grafana Mimir store-gateway documentation: https://grafana.com/docs/mimir/latest/references/architecture/components/store-gateway/
- Grafana Mimir configuration parameters: https://grafana.com/docs/mimir/latest/configure/configuration-parameters/
- Grafana Mimir object storage backend documentation: https://grafana.com/docs/mimir/latest/configure/configure-object-storage-backend/
- Grafana Mimir bucket index documentation: https://grafana.com/docs/mimir/latest/references/architecture/bucket-index/
- Grafana Mimir Docker image tags: https://hub.docker.com/r/grafana/mimir/tags
- Grafana Mimir 3.1.0 release information: https://github.com/grafana/mimir/releases

## Issues Found
- The basic configuration described `ignore_blocks_within` as ignoring old blocks. Changed the comment to say it ignores recently created blocks, matching the documented behavior for young blocks.
- The block synchronization examples used `max_concurrent_blocks_sync`, which is not a valid Mimir bucket store configuration key. Removed it from the detailed sync example and replaced it with `block_sync_concurrency` in the complete production example.
- The index header section said index headers are memory-mapped. Current Mimir documentation describes index headers as local-disk files that are loaded on demand with lazy loading. Updated the wording.
- The chunks cache example used unsupported `max_chunk_pool_bytes` and `chunk_ranges_per_series` keys. Replaced them with the documented `chunks_cache.max_get_range_requests` setting.
- The zone-aware replication YAML duplicated the `sharding_ring` key under `store_gateway`, which would overwrite the earlier ring settings in YAML. Moved `instance_availability_zone` into the existing `sharding_ring` block.
- The Kubernetes example used the outdated `grafana/mimir:2.11.0` image while the post otherwise aligns with current Mimir configuration. Updated it to `grafana/mimir:3.1.0`.
- The performance checklist incorrectly implied the index cache stores index headers. Updated it to say the index cache stores frequently queried index entries.
- The sync directory note described temporary index data. Updated it to describe synchronized index headers, which matches the store-gateway documentation.
- The troubleshooting section referred to the invalid `max_concurrent_blocks_sync` setting. Updated it to `block_sync_concurrency`.

## Review Notes
The complete production YAML block was extracted from the post and parsed successfully with `grafana/mimir:3.1.0` using `-config.file=/etc/mimir/config.yaml -print.config -target=store-gateway`. The query-flow diagrams are simplified but technically acceptable for a high-level guide.
