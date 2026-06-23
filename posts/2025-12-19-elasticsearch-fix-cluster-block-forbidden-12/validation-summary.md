# Validation Summary: How to Fix 'cluster_block_exception: FORBIDDEN/12' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Elasticsearch disk-based shard allocation
- Elasticsearch index block settings
- Elasticsearch CAT APIs
- Elasticsearch cluster allocation explain API
- Elasticsearch node stats API
- Elasticsearch Index Lifecycle Management
- Python Elasticsearch client

## Sources Consulted
- Elastic Docs: Watermark errors: https://www.elastic.co/docs/troubleshoot/elasticsearch/fix-watermark-errors
- Elastic Docs: Cluster-level shard allocation and routing settings: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/cluster-level-shard-allocation-routing-settings
- Elastic Docs: Index block settings: https://www.elastic.co/docs/reference/elasticsearch/index-settings/index-block
- Elastic API Docs: CAT allocation API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-allocation
- Elastic API Docs: Force merge API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-forcemerge
- Elastic Docs: ILM rollover action: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-rollover
- Elastic Docs: ILM force merge action: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-forcemerge
- Elastic API Docs: Node stats API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-nodes-stats
- Elastic API Docs: Cluster allocation explain API: https://www.elastic.co/docs/api/doc/elasticsearch/v9/operation/operation-cluster-allocation-explain
- Python Elasticsearch client docs: Nodes API: https://elasticsearch-py.readthedocs.io/en/latest/api/nodes.html

## Issues Found
- The post said the cluster enters a read-only state. I changed this to say Elasticsearch adds a protective write block to affected indices, which is more precise for `index.blocks.read_only_allow_delete`.
- The post said Elasticsearch sets indices read-only to prevent data corruption. I changed this to say it prevents nodes from running out of disk space, matching Elastic's documented purpose for the flood-stage block.
- The low watermark description said no new shards are allocated. I clarified that shard allocation is restricted, with an exception for primary shards of newly created indices.
- The post said the read-only block must be manually cleared after freeing disk space. I updated this because current Elasticsearch releases normally remove the block automatically after disk usage drops below the high watermark, while manual clearing remains useful if writes are still blocked.
- The cleanup commands included `_cache/clear` as a way to free disk space. I removed it from that list because clearing Elasticsearch caches affects memory caches, not disk consumption.
- The ILM example used the deprecated `max_size` rollover condition. I replaced it with `max_primary_shard_size`, which Elastic recommends for current ILM rollover policies.
- The emergency action was described as disabling the flood-stage block. I clarified that `cluster.routing.allocation.disk.threshold_enabled: false` disables the disk allocation decider and removes existing `index.blocks.read_only_allow_delete` blocks.

## Review Notes
The examples are generally valid for current Elasticsearch APIs. Elastic recommends default watermark settings for most deployments; raising watermarks or disabling disk-based allocation checks should remain temporary or carefully justified operational actions.
