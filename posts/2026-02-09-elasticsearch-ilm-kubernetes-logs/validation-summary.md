# Validation Summary: Using Elasticsearch Index Lifecycle Management for Kubernetes Log Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Elasticsearch Index Lifecycle Management
- Elasticsearch index templates, rollover aliases, data tiers, and data streams
- Fluent Bit Kubernetes log collection and Elasticsearch output
- Kubernetes ConfigMap, DaemonSet, and CronJob resources
- Prometheus Alertmanager Alerts API
- jq and curl command-line usage

## Sources Consulted
- Elasticsearch ILM rollover action: https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-rollover.html
- Elasticsearch ILM allocate action: https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-allocate.html
- Elasticsearch ILM migrate action and data tier behavior: https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-migrate.html
- Elasticsearch ILM phases and actions: https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-index-lifecycle.html
- Elasticsearch ILM settings, including origination dates and rollover aliases: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/index-lifecycle-management-settings
- Elasticsearch data tier allocation settings: https://www.elastic.co/docs/reference/elasticsearch/index-settings/data-tier-allocation
- Elasticsearch shard sizing guidance: https://www.elastic.co/guide/en/elasticsearch/reference/current/size-your-shards.html
- Elasticsearch data streams: https://www.elastic.co/guide/en/elasticsearch/reference/current/data-streams.html
- Fluent Bit Elasticsearch output plugin: https://docs.fluentbit.io/manual/pipeline/outputs/elasticsearch
- Fluent Bit Kubernetes filter plugin: https://docs.fluentbit.io/manual/pipeline/filters/kubernetes
- Prometheus Alertmanager Alerts API: https://prometheus.io/docs/alerting/latest/alerts_api/

## Issues Found
- The initial Fluent Bit Elasticsearch output used `Logstash_Format On` and `Logstash_Prefix k8s-logs`, which writes to dated indices such as `k8s-logs-YYYY.MM.DD`. That conflicts with the later ILM rollover alias setup. Changed it to `Logstash_Format Off` with `Index k8s-logs` so writes go to the bootstrapped rollover alias.
- The ILM policy used `allocate.require.data_tier`, but `allocate.require` targets custom node attributes, not Elasticsearch data tier roles. Removed the invalid `require` blocks and kept replica changes; ILM's migrate action handles warm and cold tier movement by setting `_tier_preference`.
- The namespace-specific dev policy configured a rollover alias but did not bootstrap an initial dev write index. Added `k8s-logs-dev-000001` with the `k8s-logs-dev` write alias.
- The namespace routing example used Logstash-formatted dated indices for dev and production while the templates used rollover aliases. Changed dev to write to `k8s-logs-dev` and production to write to the already bootstrapped `k8s-logs` alias.
- The CronJob sent alerts to Alertmanager `/api/v1/alerts`, which was removed in Alertmanager 0.27.0. Updated the endpoint to `/api/v2/alerts`.
- The rollover edge-case section claimed ILM should use document `@timestamp` values for clock skew. ILM phase timing is index lifecycle based, not per-document timestamp based. Reworded the section for backfilled indices and changed the example to set `index.lifecycle.origination_date`.

## Review Notes
The post is technically relevant and implementation-heavy. Data streams are correctly presented as a simpler alternative for append-only time-series data; Fluent Bit 3.0 defaults to the `create` bulk operation, which is compatible with Elasticsearch data streams. In future revisions, the examples could use ECS-compatible field mappings and stronger TLS verification guidance, but those are improvements rather than correctness blockers.
