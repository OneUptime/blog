# Validation Summary: How to Configure Elasticsearch Shard Allocation Awareness for Zone Redundancy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch shard allocation awareness and forced awareness
- Elasticsearch cluster settings and CAT APIs
- Elasticsearch Watcher
- Kubernetes StatefulSets, node affinity, field selectors, and Downward API
- Elastic Cloud on Kubernetes (ECK)

## Sources Consulted
- Elastic Docs: Shard allocation awareness, https://www.elastic.co/docs/deploy-manage/distributed-architecture/shard-allocation-relocation-recovery/shard-allocation-awareness
- Elastic Docs: Cluster-level shard allocation and routing settings, https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/cluster-level-shard-allocation-routing-settings
- Elastic Docs: Install Elasticsearch with Docker / environment variable settings, https://www.elastic.co/guide/en/elasticsearch/reference/8.19/docker.html
- Elastic API Docs: CAT node attributes API, https://www.elastic.co/docs/api/doc/elasticsearch/v8/operation/operation-cat-nodeattrs
- Elastic API Docs: CAT shards API, https://www.elastic.co/docs/api/doc/elasticsearch/v8/operation/operation-cat-shards
- Elastic Docs: Watcher HTTP input, https://www.elastic.co/guide/en/elasticsearch/reference/current/input-http.html
- Elastic Docs: Advanced Elasticsearch node scheduling in ECK, https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/advanced-elasticsearch-node-scheduling
- Kubernetes Docs: Downward API, https://kubernetes.io/docs/concepts/workloads/pods/downward-api/

## Issues Found
- The generic Kubernetes StatefulSet example incorrectly claimed the standard Downward API could read the node label `topology.kubernetes.io/zone` through `metadata.labels[...]`. Kubernetes Downward API exposes pod labels, not node labels. Updated the example to use a zone-specific StatefulSet with node affinity and a matching pod label.
- The Kubernetes example used Elasticsearch setting names directly as environment variable names. Updated the example to use Elastic's Docker-compatible `ES_SETTING_` environment variable style, including doubled underscores for Elasticsearch settings that contain underscores.
- The Kubernetes example used one six-replica StatefulSet while describing zone-specific configuration. Changed it to a two-replica `elasticsearch-zone-a` StatefulSet and clarified that equivalent StatefulSets should be created for the other zones.
- The shard verification command grepped `_cat/shards` output for `zone`, but `_cat/shards` does not include zone attributes. Updated the command to show shard placement by node and kept the node attribute lookup as the zone source.
- The forced-awareness explanation said Elasticsearch would not allocate replica shards until all zones were available. Refined this to match Elastic's behavior: forced awareness may leave some replicas unassigned rather than overloading the remaining zones.
- The Kubernetes zone-failure deletion command built one `spec.nodeName` field selector from multiple node names, which is invalid. Updated it to loop over nodes and delete matching pods per node.
- The multi-attribute awareness explanation described a strict zone-then-rack hierarchy. Updated it to describe awareness across both configured attributes without implying hierarchy.
- The Watcher example queried only `_cat/shards` but the script attempted to read node attributes from a nonexistent payload field. Replaced it with a chain input that loads both shard rows and node attributes before calculating zone counts.

## Review Notes
The examples use plain `http://elasticsearch:9200` curl commands. Elasticsearch 8.x enables security by default in many self-managed deployments, so real clusters may need HTTPS and authentication headers depending on how Elasticsearch is installed.
