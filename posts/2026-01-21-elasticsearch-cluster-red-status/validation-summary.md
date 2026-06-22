# Validation Summary: How to Debug Elasticsearch 'Cluster Red' Status

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Elasticsearch cluster health
- Elasticsearch shard allocation and recovery
- Elasticsearch CAT APIs
- Elasticsearch cluster reroute API
- Elasticsearch snapshot and restore APIs
- Elasticsearch cluster and index settings
- curl and bash

## Sources Consulted
- Elasticsearch Cluster health API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-health
- Elasticsearch CAT indices API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-indices
- Elasticsearch CAT shards API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-shards
- Elasticsearch Cluster allocation explain API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-allocation-explain
- Elasticsearch Cluster reroute API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-reroute
- Elasticsearch cluster-level shard allocation and routing settings: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/cluster-level-shard-allocation-routing-settings
- Elasticsearch miscellaneous cluster settings: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/miscellaneous-cluster-settings
- Elasticsearch index recovery settings: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/index-recovery-settings
- Elasticsearch delayed allocation documentation: https://www.elastic.co/docs/deploy-manage/distributed-architecture/shard-allocation-relocation-recovery/delaying-allocation-when-node-leaves
- Elasticsearch Force merge API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-forcemerge
- Elasticsearch Restore snapshot API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-restore
- Elasticsearch Create or update snapshot repository API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-snapshot-create-repository
- Elasticsearch Update index settings API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-settings

## Issues Found
- The unassigned shard reason table included `REROUTE_CANCELLED`, which is not listed in the current Elasticsearch CAT shards API documentation, and omitted several current documented reason values. Updated the table to include `FORCED_EMPTY_PRIMARY`, `INDEX_CLOSED`, `MANUAL_ALLOCATION`, `NODE_RESTARTING`, and `PRIMARY_FAILED`, and removed `REROUTE_CANCELLED`.
- The force merge example was presented as a general disk cleanup command. Elastic recommends force merging only indices that are no longer receiving writes. Updated the comment to make that operational constraint clear.
- The "Too Many Shards per Node" section used `cluster.max_shards_per_node`, but Elastic documents this as a cluster-wide shard safety limit calculated from the number of non-frozen data nodes, not as a per-node allocation balancing setting. Renamed the section and added the documented caveat.
- The recovery tuning section showed valid settings but did not warn that increasing concurrency and bandwidth can add load and may not improve recovery. Added a caution consistent with Elastic's recovery and allocation setting guidance.

## Review Notes
The remaining Elasticsearch API examples and settings are technically valid for current Elasticsearch documentation. Several commands use CAT APIs, which Elastic documents as intended for human command-line consumption rather than application logic; that is appropriate for this troubleshooting guide.
