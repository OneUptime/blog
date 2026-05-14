# Validation Summary: Cilium Grafana Dashboards

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes ConfigMaps
- Prometheus and PromQL
- Grafana dashboards and alerts

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Running Prometheus & Grafana documentation: https://docs.cilium.io/en/stable/observability/grafana/
- Cilium dashboard JSON files in the official Cilium repository: https://github.com/cilium/cilium/tree/v1.19.4/install/kubernetes/cilium/files
- Grafana dashboard import documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/import-dashboards/
- Grafana.com dashboard API entries for IDs 15513, 15514, 16611, 16612, and 16613: https://grafana.com/api/dashboards/15513, https://grafana.com/api/dashboards/15514, https://grafana.com/api/dashboards/16611, https://grafana.com/api/dashboards/16612, https://grafana.com/api/dashboards/16613
- Prometheus histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile

## Issues Found
- The post said the official dashboards cover BGP session state. Current Cilium dashboard JSON did not include BGP panels, while Cilium exposes BGP metrics separately when the BGP Control Plane is enabled. I changed the wording to describe BGP as a custom-panel metric.
- The Grafana.com dashboard ID table mapped IDs 16611, 16612, and 16613 to Hubble Overview, Hubble DNS, and Hubble L7 HTTP. The Grafana.com API shows these are Cilium v1.12 Agent, Cilium v1.12 Operator, and Cilium v1.12 Hubble dashboards. I corrected the table and added a note to prefer current dashboard JSON from the Cilium repository for current releases.
- The endpoint regeneration p99 query used `histogram_quantile()` over `cilium_endpoint_regenerations_total`, which is a counter rather than a histogram bucket series. I changed it to use `cilium_endpoint_regeneration_time_stats_seconds_bucket` with `sum by (le)`.
- The Hubble flow query grouped `hubble_flows_processed_total` by `protocol`, but Cilium documents the default labels as `type`, `subtype`, and `verdict`. I changed the query to group by those labels.
- The BGP session metric was listed as `cilium_bgp_session_state`. Current Cilium builds the metric name as `cilium_bgp_control_plane_session_state`. I corrected the query.
- The namespace-filtered Hubble query also grouped by `protocol`; I updated it to group by `type`, `subtype`, and `verdict`.
- The drop-rate panel was labeled as policy drop rate while using `cilium_drop_count_total`, which is a packet drop counter. I changed the label to packet drop rate.

## Review Notes
The namespace template variable depends on Hubble metrics being configured with `labelsContext=source_namespace`; the post now calls this out, but future revisions could show the exact Helm values for that setup.
