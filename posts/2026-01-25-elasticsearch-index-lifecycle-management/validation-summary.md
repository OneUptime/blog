# Validation Summary: How to Configure Index Lifecycle Management in Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch 8.x
- Index Lifecycle Management (ILM)
- Elasticsearch data tiers
- Elasticsearch REST APIs
- Elasticsearch Python client
- Python

## Sources Consulted
- Elasticsearch Index Lifecycle Management overview: https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management
- Elasticsearch ILM phases and actions: https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management/index-lifecycle
- Elasticsearch index lifecycle actions reference: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions
- Elasticsearch create or update lifecycle policy API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ilm-put-lifecycle
- Elasticsearch rollover action reference: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-rollover
- Elasticsearch migrate action reference: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-migrate
- Elasticsearch allocate action reference: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-allocate
- Elasticsearch data tiers documentation: https://www.elastic.co/docs/manage-data/lifecycle/data-tiers
- Elasticsearch node roles documentation: https://www.elastic.co/docs/deploy-manage/distributed-architecture/clusters-nodes-shards/node-roles
- Elasticsearch Python client documentation: https://www.elastic.co/docs/reference/elasticsearch/clients/python
- Python Elasticsearch client ILM API reference: https://elasticsearch-py.readthedocs.io/en/v8.15.0/api/index-lifecycle-management.html
- Elasticsearch shard sizing guidance: https://www.elastic.co/docs/deploy-manage/production-guidance/optimize-performance/size-shards

## Issues Found
- The post used `node.attr.data` custom attributes and explicit allocation filters as the primary Elasticsearch 8 tiering setup. Updated the node configuration to use current data tier roles (`data_hot`, `data_content`, `data_warm`, `data_cold`) and removed the matching attribute allocation filters from the ILM policy and template.
- The ILM phase diagram showed a `Freeze` action in the cold phase. Current ILM actions do not include a freeze action. Removed it from the diagram.
- The rollover example stated that the previous write index is immediately in the warm/cold phase after rollover. Updated the comment to say the index is managed by ILM, because phase transition depends on policy completion and `min_age`.
- The long-term metrics policy had a cold-phase allocation filter based on legacy custom attributes. Replaced it with `set_priority` so the cold phase remains valid while relying on data-tier migration.
- The Python client examples passed lifecycle policy names using `policy=policy_name`, which is incorrect for the current client API. Updated calls to `put_lifecycle(name=..., policy=...)` and `delete_lifecycle(name=...)`.
- The Python `move_to_step` call used a request body with a hard-coded target complete step. Updated it to use the current `current_step` and `next_step` client parameters and move to the first step in the requested phase.
- The storage calculation parsed human-formatted `pri.store.size` values as integers, which would fail for values such as `1.2kb`. Updated the cat indices call to request byte units and parse the returned byte string.

## Review Notes
The post now uses modern Elasticsearch data-tier roles. The REST examples still use index aliases rather than data streams; this is technically valid, although Elastic recommends data streams for many append-only time-series workloads.
