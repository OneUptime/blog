# Validation Summary: How to Recover from Elasticsearch Shard Allocation Failures

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Elasticsearch shard allocation
- Elasticsearch Cluster allocation explain API
- Elasticsearch Cluster reroute API
- Elasticsearch cluster and index allocation settings
- Elasticsearch CAT APIs
- Elasticsearch Index Lifecycle Management
- Bash, curl, awk, jq

## Sources Consulted
- Elasticsearch Cluster allocation explain API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-allocation-explain
- Elasticsearch Cluster reroute API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-reroute
- Elasticsearch cluster-level shard allocation and routing settings: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/cluster-level-shard-allocation-routing-settings
- Elasticsearch total shards per node setting: https://www.elastic.co/docs/reference/elasticsearch/index-settings/total-shards-per-node
- Elasticsearch miscellaneous cluster settings, including cluster shard limits: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/miscellaneous-cluster-settings
- Elasticsearch CAT shards API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-shards
- Elasticsearch CAT allocation API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-allocation
- Elasticsearch ILM delete action documentation: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-delete

## Issues Found
- The "Explain with Current State" heading was inaccurate because `include_yes_decisions=true` returns YES allocation decisions, not a separate current-state mode. Changed the heading to "Explain with YES Decisions."
- The maximum-shards section mixed up Elasticsearch's cluster-wide shard creation limit (`cluster.max_shards_per_node`) with the allocation-time per-node shard limit (`cluster.routing.allocation.total_shards_per_node`). Updated the decider to `shards_limit` and changed the remediation command to adjust `cluster.routing.allocation.total_shards_per_node`.
- The allocation-disabled section used an incorrect decider name and explanation. Updated the decider to `enable` and used the documented allocation-disabled explanation for `cluster.routing.allocation.enable=none`.
- The disk monitoring command depended on the default column order from `_cat/allocation`, which can change and did not reliably read `disk.percent`. Updated it to request `host,node,disk.percent` explicitly and read the documented `disk.percent` column.

## Review Notes
The examples use CAT APIs for operator diagnostics, which is appropriate for the command-line troubleshooting context. For production automation, Elasticsearch documentation recommends JSON APIs rather than CAT API text output.
