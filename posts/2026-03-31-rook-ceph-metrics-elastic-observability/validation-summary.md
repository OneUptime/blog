# Validation Summary: How to Set Up Ceph Metrics in Elastic Observability

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook Ceph (storage orchestrator on Kubernetes)
- Ceph Manager Prometheus module (metrics endpoint on port 9283)
- Metricbeat 8.12.0 (Elastic Beats data shipper)
- Metricbeat Prometheus collector metricset
- Elasticsearch 8.x (ILM policies, index templates)
- Kibana 8.x (Lens dashboards, Dev Tools Console, alerting API)
- Kubernetes (DaemonSets, ConfigMaps, Services)

## Sources Consulted
- Elastic Metricbeat Prometheus module documentation: https://www.elastic.co/guide/en/beats/metricbeat/current/metricbeat-module-prometheus.html
- Elastic Metricbeat Prometheus collector metricset: https://www.elastic.co/guide/en/beats/metricbeat/current/metricbeat-metricset-prometheus-collector.html
- Elasticsearch ILM policy API: https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-put-lifecycle.html
- Kibana Alerting API: https://www.elastic.co/guide/en/kibana/current/create-rule-api.html
- Ceph Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Rook Ceph documentation: https://rook.io/docs/rook/latest/

## Issues Found

### 1. Step 5 description incorrectly labeled as "KQL queries"
- **What was wrong:** The text described the example as "KQL queries" but the code block is an Elasticsearch Query DSL request in Kibana Dev Tools Console format, not Kibana Query Language (KQL).
- **What was changed:** Updated the description to "Elasticsearch query in the Dev Tools Console".
- **Why:** KQL is a simple text-based query language (e.g., `field: value`), which is distinct from the JSON-based Elasticsearch Query DSL shown in the example. Conflating the two would confuse readers.

### 2. Step 5 query used incorrect field path `labels.name`
- **What was wrong:** The query used `{"match": {"labels.name": "ceph_health_status"}}` to find health status metrics. With Metricbeat's Prometheus collector metricset (especially with `use_types: true`), metrics are indexed as fields under `prometheus.metrics.<metric_name>`, not in a `labels.name` field.
- **What was changed:** Replaced the `match` query with `{"exists": {"field": "prometheus.metrics.ceph_health_status"}}` to correctly filter for documents containing the health status metric.
- **Why:** The original field path `labels.name` does not correspond to any field in the Metricbeat Prometheus module's output schema and would return zero results.

### 3. Step 5 aggregation used incorrect field path `prometheus.labels.value`
- **What was wrong:** The avg aggregation referenced `prometheus.labels.value`, which is not where metric values are stored. `prometheus.labels.*` stores Prometheus label key-value pairs (like `instance`, `job`), not metric values.
- **What was changed:** Changed to `prometheus.metrics.ceph_health_status` which is the actual field containing the numeric metric value.
- **Why:** The original field path would fail to produce meaningful aggregation results since it doesn't contain numeric metric data.

### 4. Step 6 alerting rule used incorrect consumer value
- **What was wrong:** The `consumer` field was set to `"alerts"`, but the `.index-threshold` rule type in Kibana 8.x is registered under the `stackAlerts` feature.
- **What was changed:** Changed `"consumer": "alerts"` to `"consumer": "stackAlerts"`.
- **Why:** Using an incorrect consumer value would result in an authorization error when creating the rule, since the `alerts` consumer is not registered to authorize `.index-threshold` rule types.

## Review Notes
- Step 1 creates a new service `ceph-mgr-prometheus` via `kubectl expose`, but Step 3 references `rook-ceph-mgr.rook-ceph.svc.cluster.local:9283` which is the default Rook-created service. Both services would work (Rook automatically creates a `rook-ceph-mgr` service with port 9283), but this inconsistency could confuse readers. A future revision could either remove the redundant `kubectl expose` or update the Metricbeat host to use the manually created service.
- The Metricbeat image version 8.12.0 is current but will eventually need updating. The Prometheus module configuration is compatible across 8.x versions.
- The ILM policy and alerting rule examples use placeholder credentials (`elastic:password`). This is fine for a tutorial but readers should be reminded to use proper secrets management in production.
- The DaemonSet in Step 2 deploys Metricbeat on every node, which is typical for node-level metrics collection. However, for scraping a single Ceph MGR Prometheus endpoint, a Deployment with a single replica would be more resource-efficient. This is a design choice rather than a technical error.
