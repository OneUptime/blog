# Validation Summary: How to Use Ansible to Configure Elasticsearch Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Elasticsearch
- Elasticsearch cluster discovery and node roles
- Elasticsearch shard allocation and rolling restarts
- Elasticsearch index templates
- Elasticsearch Index Lifecycle Management

## Sources Consulted
- Elasticsearch node roles: https://www.elastic.co/docs/deploy-manage/distributed-architecture/clusters-nodes-shards/node-roles
- Elasticsearch discovery and cluster formation settings: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/discovery-cluster-formation-settings
- Elasticsearch rolling restart procedure: https://www.elastic.co/guide/en/elasticsearch/reference/current/restart-cluster.html
- Elasticsearch data tier allocation settings: https://www.elastic.co/docs/reference/elasticsearch/index-settings/data-tier-allocation
- Elasticsearch ILM migrate action: https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-migrate.html
- Elasticsearch ILM rollover action: https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-rollover.html
- Elasticsearch ILM shrink action: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-shrink
- Elasticsearch ILM force merge action: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-forcemerge
- Elasticsearch JVM settings: https://www.elastic.co/docs/reference/elasticsearch/jvm-settings/
- Ansible uri module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html

## Issues Found
- The topology diagram labeled every master node as `voting_only`. A cluster where every master-eligible node is voting-only cannot elect a master. I changed the diagram to show the three dedicated master nodes as `master`, matching the inventory.
- The `cluster.initial_master_nodes` setting was rendered on every node and for every run. Elasticsearch documents this as a bootstrap-only setting for master-eligible nodes in a brand-new cluster, and says to remove it after the cluster forms. I wrapped it in a conditional so it is emitted only for master nodes when `es_bootstrap_cluster=true`, and added a short note to use that variable only for first bootstrap.
- The rolling restart playbook notified a restart handler, then immediately ran health checks in `post_tasks`. Ansible handlers are not guaranteed to run before those checks unless flushed. I added a `meta: flush_handlers` task before the health checks.
- The shard allocation reset used `"all"`, which is a valid value but leaves a persistent override in cluster settings. Elastic's restart procedure recommends restoring the default by setting `cluster.routing.allocation.enable` to `null`, so I changed the snippet to `null`.
- The ILM policy used an `allocate` action with `_tier_preference`. Data-tier movement is handled by ILM's `migrate` action, which updates `index.routing.allocation.include._tier_preference` for the target phase. I replaced that allocation block with an explicit `migrate: enabled: true`.
- The production tip said 2GB heap is enough for master nodes. That is too absolute because master heap sizing depends on cluster state and workload. I changed it to recommend sizing master heap for the cluster state and workload.

## Review Notes
The examples intentionally use `validate_certs: false`, which can be acceptable for a simplified internal example with self-signed certificates, but production playbooks should normally install trusted CA certificates and validate TLS. The index template uses alias-based rollover with `index.lifecycle.rollover_alias`; a complete deployment also needs an initial write index or alias bootstrap step, or a data stream based approach.
