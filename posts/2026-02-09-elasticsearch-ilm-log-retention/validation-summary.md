# Validation Summary: How to implement Elasticsearch index lifecycle management for log retention

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch Index Lifecycle Management (ILM)
- Elasticsearch data streams and index templates
- Elasticsearch data tiers
- Searchable snapshots
- Elastic Cloud on Kubernetes (ECK)
- curl
- jq
- Kubernetes ConfigMap

## Sources Consulted
- Elasticsearch ILM phases and actions: https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management/index-lifecycle
- Elasticsearch rollover ILM action: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-rollover
- Elasticsearch searchable snapshot ILM action: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-searchable-snapshot
- Elasticsearch delete ILM action: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-delete
- Elasticsearch allocate ILM action: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-allocate
- Elasticsearch data tiers: https://www.elastic.co/docs/manage-data/lifecycle/data-tiers/
- Elasticsearch data tier allocation settings: https://www.elastic.co/docs/reference/elasticsearch/index-settings/data-tier-allocation
- Elasticsearch node roles: https://www.elastic.co/docs/deploy-manage/distributed-architecture/clusters-nodes-shards/node-roles
- Elasticsearch ILM with data streams: https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management/tutorial-time-series-with-data-streams
- Elasticsearch ILM setup guidance for data streams and aliases: https://www.elastic.co/guide/en/elasticsearch/reference/current/set-up-lifecycle-policy.html
- Elasticsearch cat indices API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-indices-1
- ECK data tier configuration: https://www.elastic.co/docs/manage-data/lifecycle/data-tiers/manage-data-tiers-self-managed-eck

## Issues Found
- The post said ILM has four phases. Current Elasticsearch ILM has five phases: hot, warm, cold, frozen, and delete. Added the frozen phase description.
- The ILM rollover examples used `max_size`, which is deprecated and scheduled for removal. Replaced it with `max_primary_shard_size`, and changed `max_docs` to `max_primary_shard_docs` for primary-shard sizing consistency.
- The basic cold-phase policy used the removed/obsolete `freeze` action. Removed `freeze` and updated the explanation to describe lowering recovery priority in cold.
- The data stream index template set `index.lifecycle.rollover_alias`. Official guidance says this setting is unnecessary for data streams and is only required for alias-based rollover. Removed it.
- The Kubernetes StatefulSet examples were incomplete as Kubernetes manifests and mixed custom node attributes with native data tier roles. Replaced them with an ECK Elasticsearch resource using `spec.nodeSets[].config.node.roles`.
- The advanced searchable snapshot policy manually allocated cold data after `searchable_snapshot`. Searchable snapshots use data tier preference to mount directly to the phase tier, so the manual cold allocation block was removed.
- The monitoring command used `_cat/indices` with `ilm.phase`, but the cat indices API does not expose an `ilm.phase` column. Replaced it with the ILM Explain API and `jq`.
- The monitoring ConfigMap queried an `ilm.phase` document field that is not present in normal log indices. Replaced it with a script that summarizes ILM phase/action/step from ILM Explain.
- The best-practice note about 50GB per index was updated to 50GB per primary shard to match current rollover guidance.

## Review Notes
- The examples assume Elasticsearch Stack deployments where ILM is available. Elasticsearch Serverless uses data stream lifecycle instead of ILM.
- The ECK snippet illustrates node tier role configuration only; production clusters still need storage classes, resource sizing, master-eligible nodes, and operational settings appropriate to the environment.
