# Validation Summary: How to Handle Elasticsearch Node Failures

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Elasticsearch REST APIs
- Elasticsearch cluster health and node APIs
- Elasticsearch shard allocation, recovery, and reroute APIs
- Elasticsearch cluster and index settings
- Elasticsearch Watcher
- Linux systemd and diagnostic commands

## Sources Consulted
- Elastic Elasticsearch Reroute API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-reroute
- Elastic cluster-level shard allocation and routing settings: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/cluster-level-shard-allocation-routing-settings
- Elastic delayed allocation documentation: https://www.elastic.co/docs/deploy-manage/distributed-architecture/shard-allocation-relocation-recovery/delaying-allocation-when-node-leaves
- Elastic Cluster Update Settings API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-put-settings
- Elastic cluster health API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-health
- Elastic cluster allocation explain API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-allocation-explain
- Elastic CAT master and CAT nodes API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-master and https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-nodes
- Elastic JVM settings documentation: https://www.elastic.co/docs/reference/elasticsearch/jvm-settings
- Elastic discovery and quorum documentation: https://www.elastic.co/docs/deploy-manage/distributed-architecture/discovery-cluster-formation/modules-discovery-quorums
- Elastic Watcher HTTP input and webhook action documentation: https://www.elastic.co/docs/explore-analyze/alerting/watcher/input-http and https://www.elastic.co/docs/explore-analyze/alerting/watcher/actions-webhook

## Issues Found
- The cluster settings examples used `transient` settings. Elastic's current documentation says transient cluster settings are no longer recommended because they can clear unexpectedly during instability. Changed the examples to use `persistent` settings.
- The "Remove allocation exclusion for old node" command set `cluster.routing.allocation.exclude._name` to `"failed-node"`, which adds an exclusion instead of removing it. Changed the value to `null`, which is the documented way to reset a cluster setting.
- The temporary-failure guidance described `cluster.routing.allocation.enable: primaries` as delayed shard reallocation. That setting allows primary allocation and prevents replica allocation until re-enabled; updated the wording to match the command.
- The heap-size note said not to exceed 31GB. Elastic's current JVM guidance recommends setting heap to no more than 50% of available memory and below the compressed ordinary object pointer threshold, with 26GB safe on most systems and up to about 30GB on some. Updated the comment accordingly.

## Review Notes
The remaining Elasticsearch API examples are syntactically consistent with the official REST API documentation. The split-brain prevention snippet is version-specific: `discovery.zen.minimum_master_nodes` only applies before Elasticsearch 7.x, while current versions use voting configurations and quorum-based coordination.
