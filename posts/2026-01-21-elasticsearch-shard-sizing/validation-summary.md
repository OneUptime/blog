# Validation Summary: How to Optimize Elasticsearch Shard Sizing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Elasticsearch
- Elasticsearch shards and replicas
- Index Lifecycle Management (ILM)
- Elasticsearch index templates
- Elasticsearch shrink and split index APIs
- Elasticsearch shard allocation awareness
- Elasticsearch cat, cluster health, and cluster stats APIs

## Sources Consulted
- Elastic Docs: Size your shards - https://www.elastic.co/docs/deploy-manage/production-guidance/optimize-performance/size-shards
- Elastic Docs: ILM rollover action - https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-rollover
- Elastic Docs: Configure lifecycle policy - https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management/configure-lifecycle-policy
- Elastic Docs: Manage time series data without data streams - https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management/tutorial-time-series-without-data-streams
- Elastic Docs: Fix index lifecycle management errors - https://www.elastic.co/docs/troubleshoot/elasticsearch/index-lifecycle-management-errors
- Elasticsearch API Docs: Split an index - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-split
- Elasticsearch API Docs: Shrink an index - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-shrink
- Elastic Docs: Miscellaneous cluster settings - https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/miscellaneous-cluster-settings
- Elastic Docs: Shard allocation awareness - https://www.elastic.co/docs/deploy-manage/distributed-architecture/shard-allocation-relocation-recovery/shard-allocation-awareness
- Elastic Docs: Index-level shard allocation settings - https://www.elastic.co/docs/reference/elasticsearch/index-settings/shard-allocation

## Issues Found
- The post used the deprecated "~20 shards per GB heap" rule. Updated the guidance and capacity planning example to use Elasticsearch's current default shard limit of 1,000 non-frozen shards per data node, while keeping the 10-50GB shard-size guidance and adding the 200 million documents per shard guideline.
- The ILM rollover example configured a rollover alias in the template but did not bootstrap an initial write index. Added the required initial `logs-000001` index with the `logs` write alias, matching Elastic's alias-based rollover requirements.
- The shrink prerequisites omitted the target shard-count factor rule. Added that the target shard count must be a factor of the source index shard count.
- The split-index example only stated that the target shard count must be a multiple of the source shard count. Added the required `index.number_of_routing_shards` divisor caveat and made the target index writable after the split by setting `index.blocks.write` to `false`.
- The shard-limit section only referenced `_cluster/health`, which is useful for active and unassigned shard state but not the total shard count. Added the official `_cluster/stats?filter_path=indices.shards.total` command for total shard count.
- The cluster shard-limit formula did not specify that `cluster.max_shards_per_node` is multiplied by the number of non-frozen data nodes. Clarified the wording.

## Review Notes
The examples are generally version-neutral for current Elasticsearch self-managed deployments. Elastic recommends data streams for append-only time-series workloads because they require less alias bootstrapping than rolling indices; this post's alias-based ILM approach is still valid when updates or custom alias behavior are needed.
