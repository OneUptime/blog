# Validation Summary: How to Configure Elasticsearch Cluster Resilience

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Elasticsearch cluster configuration
- Shard allocation awareness and forced awareness
- Index-level and cluster-level shard allocation filtering
- Replica settings and auto-expanding replicas
- Cluster recovery and shard recovery settings
- CAT APIs and cluster health monitoring

## Sources Consulted
- Elastic Docs: Shard allocation awareness - https://www.elastic.co/docs/deploy-manage/distributed-architecture/shard-allocation-relocation-recovery/shard-allocation-awareness
- Elastic Docs: Bootstrapping a cluster - https://www.elastic.co/docs/deploy-manage/distributed-architecture/discovery-cluster-formation/modules-discovery-bootstrap-cluster
- Elastic Docs: Discovery and cluster formation settings - https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/discovery-cluster-formation-settings
- Elastic Docs: Local gateway settings - https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/local-gateway
- Elastic Docs: Cluster-level shard allocation and routing settings - https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/cluster-level-shard-allocation-routing-settings
- Elastic Docs: Index-level shard allocation - https://www.elastic.co/docs/deploy-manage/distributed-architecture/shard-allocation-relocation-recovery/index-level-shard-allocation
- Elastic Docs: General index settings - https://www.elastic.co/docs/reference/elasticsearch/index-settings/index-modules
- Elastic Docs: Delaying allocation when a node leaves - https://www.elastic.co/docs/deploy-manage/distributed-architecture/shard-allocation-relocation-recovery/delaying-allocation-when-node-leaves
- Elastic API Docs: Update cluster settings - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-put-settings
- Elastic API Docs: Update index settings - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-settings
- Elastic API Docs: Cluster allocation explain - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-allocation-explain
- Elastic API Docs: CAT node attributes - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-nodeattrs

## Issues Found
- The forced-awareness API example used a JSON array for `cluster.routing.allocation.awareness.force.zone.values`. Elastic documents this setting as a comma-separated setting value, so it was changed to `"zone-a,zone-b,zone-c"`.
- The cluster recovery example used older `gateway.recover_after_nodes` and `gateway.expected_nodes` names and applied them through the dynamic cluster settings API. Current Elastic docs define local gateway recovery settings as static `elasticsearch.yml` settings on master-eligible nodes, using `gateway.recover_after_data_nodes`, `gateway.expected_data_nodes`, and `gateway.recover_after_time`. The example was updated accordingly.
- The allocation-awareness verification command implied that the default `_cat/shards` output included zone information at a fixed column. It does not expose custom node attributes directly, so the command was changed to list shards by node and compare them with `_cat/nodeattrs` zone output.

## Review Notes
- The `index.auto_expand_replicas: "0-all"` example is valid, but Elastic notes that an `all` upper bound ignores shard allocation awareness for that index. In production, a bounded value such as `0-2` is often more appropriate when zone awareness is part of the resilience model.
- Several recovery concurrency settings are valid and dynamic, but Elastic generally recommends avoiding changes from defaults unless testing shows a clear need.
