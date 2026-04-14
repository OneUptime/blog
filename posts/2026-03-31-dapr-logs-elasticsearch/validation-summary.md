# Validation Summary: How to Send Dapr Logs to Elasticsearch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar logging configuration)
- Elasticsearch (index templates, Watcher API)
- Fluent Bit 2.2 (log collection and forwarding)
- Kubernetes (DaemonSet deployment, container log collection)
- Kibana (KQL queries, log search)

## Sources Consulted
- Dapr Configuration spec: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr logging documentation: https://docs.dapr.io/operations/observability/logging/logs/
- Fluent Bit Elasticsearch output plugin: https://docs.fluentbit.io/manual/pipeline/outputs/elasticsearch
- Fluent Bit tail input plugin: https://docs.fluentbit.io/manual/pipeline/inputs/tail
- Fluent Bit Kubernetes filter: https://docs.fluentbit.io/manual/pipeline/filters/kubernetes
- Elasticsearch index template API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-put-index-template
- Elasticsearch Watcher API: https://www.elastic.co/docs/explore-analyze/alerting/watcher
- Kibana Query Language (KQL): https://www.elastic.co/docs/explore-analyze/query-filter/languages/kql
- Elasticsearch mapping types removal: https://www.elastic.co/docs/manage-data/data-store/mapping/removal-of-mapping-types

## Issues Found

### 1. `Parser docker` replaced with `multiline.parser docker, cri`
**What was wrong:** The Fluent Bit INPUT section used `Parser docker`, which only parses Docker JSON log format. Kubernetes removed dockershim in version 1.24 (May 2022), and virtually all modern clusters use containerd or CRI-O, which produce logs in CRI format. Using `Parser docker` on these clusters would fail to parse container logs.
**What was changed:** Replaced `Parser docker` with `multiline.parser docker, cri`, which is the Fluent Bit recommended approach that tries both Docker and CRI log formats for maximum compatibility.

### 2. `Type _doc` removed and replaced with `Suppress_Type_Name On`
**What was wrong:** The Fluent Bit ES output included `Type _doc`. Elasticsearch 8.x removed support for mapping types entirely, and sending a `_type` field causes an `illegal_argument_exception` error. While `_doc` was the default type in ES 7.x, it was already redundant there.
**What was changed:** Removed `Type _doc` and added `Suppress_Type_Name On` for Elasticsearch 8.x compatibility.

### 3. Redundant `Index dapr-logs` removed
**What was wrong:** The `Index dapr-logs` parameter was set alongside `Logstash_Format On` and `Logstash_Prefix dapr-logs`. When `Logstash_Format` is enabled, the `Index` parameter is silently ignored — the actual index name is composed from `Logstash_Prefix` + date suffix (e.g., `dapr-logs-2026.04.14`). Having both was misleading.
**What was changed:** Removed the redundant `Index dapr-logs` line.

### 4. Section title corrected from "Kibana Alerts" to "Elasticsearch Watcher Alerts"
**What was wrong:** The section was titled "Setting Up Kibana Alerts" but the content demonstrated the Elasticsearch Watcher API (`_watcher/watch`). Kibana Alerting and Elasticsearch Watcher are different systems with different APIs and capabilities.
**What was changed:** Renamed the section to "Setting Up Elasticsearch Watcher Alerts" and updated the introductory sentence to match.

## Review Notes
- The Elasticsearch Watcher API, while not formally deprecated, is being superseded by Kibana Alerting (Kibana Alerts and Actions) for most use cases. Kibana Alerting provides richer integrations and is available at the Basic license tier. A future revision could mention Kibana Alerting as the modern alternative.
- The Watcher API requires a Gold+ or trial license. This is not mentioned in the post and could be relevant for readers on the Basic tier.
- The `ctx.payload.hits.total.value` path in the Watcher condition is correct for Elasticsearch 7.x+ where `hits.total` is an object with `value` and `relation` fields.
- The Dapr Configuration resource, annotations (`dapr.io/config`, `dapr.io/log-as-json`, `dapr.io/log-level`), and logging spec fields (`enabled`, `obfuscateURLs`, `omitHealthChecks`) are all verified correct against official Dapr documentation.
- The KQL query syntax is correct for Kibana.
- The composable index template API (`_index_template`) format is correct for Elasticsearch 7.8+.
