# Validation Summary: How to Monitor VPN Tunnel Bandwidth and Latency Using Cloud Monitoring in GCP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud VPN
- Cloud Monitoring
- Cloud Monitoring dashboards
- Cloud Monitoring alerting policies
- PromQL
- Google Cloud CLI
- Python custom metrics with `google-cloud-monitoring`

## Sources Consulted
- Google Cloud VPN logs and metrics documentation: https://cloud.google.com/network-connectivity/docs/vpn/how-to/viewing-logs-metrics
- Google Cloud VPN overview and bandwidth limits: https://cloud.google.com/network-connectivity/docs/vpn/concepts/overview
- Google Cloud Monitoring MQL deprecation notice: https://cloud.google.com/stackdriver/docs/deprecations/mql
- `gcloud monitoring policies create` reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- `gcloud monitoring dashboards create` reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- Cloud Monitoring dashboard API reference: https://cloud.google.com/monitoring/api/ref_v3/rest/v1/projects.dashboards
- Cloud Monitoring alert policy API reference: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Cloud Monitoring custom metrics API guide: https://cloud.google.com/monitoring/custom-metrics/creating-metrics
- Network Topology metrics reference: https://cloud.google.com/network-intelligence-center/docs/network-topology/reference/metrics-reference

## Issues Found
- The post used the obsolete/incorrect `compute.googleapis.com/vpn/...` metric namespace. Updated Cloud VPN metrics to the documented `vpn.googleapis.com/...` namespace and corrected metric paths such as `network/sent_bytes_count`.
- The post listed a single `vpn/dropped_packets_count` metric, but Cloud VPN exposes separate incoming and outgoing dropped-packet metrics. Replaced this with `network/dropped_sent_packets_count` and `network/dropped_received_packets_count`.
- The post stated that `tunnel_established` is exactly 1 for up and 0 for down. Updated this to match the documentation, which says successful tunnel establishment is indicated when the value is greater than 0.
- The post recommended MQL for advanced queries. Google no longer recommends MQL for new Cloud Monitoring workflows, so the bandwidth examples were converted to PromQL.
- The dashboard JSON used incorrect Cloud VPN metric type strings. Updated the dashboard filters to use `vpn.googleapis.com/tunnel_established` and `vpn.googleapis.com/network/sent_bytes_count`.
- The latency section incorrectly claimed HA VPN exposes RTT through `vpn/gateway/connections`. Reworded it to state that Cloud VPN's metrics list does not expose a built-in per-tunnel latency metric, while Network Topology can show latency for some connection types.
- The Python latency parser attempted to read `parts[4]` from Linux `ping` output split on `/`, which would raise an index error. Updated the parsing logic to extract the average latency from the summary line correctly.
- The alerting commands used unsupported `gcloud monitoring policies create` flags such as `--condition-comparison`, `--condition-threshold-value`, and `--condition-duration`. Updated the tunnel-down example to use current `--if` and `--duration` flags.
- The bandwidth alert checked only sent bytes even though Cloud VPN bandwidth guidance says to compare the sum of sent and received bytes against the tunnel limit. Replaced it with a PromQL-based alert policy JSON that sums both directions.
- The packet-drop query used the old metric path and MQL-style grouping. Replaced it with a PromQL query that sums incoming and outgoing dropped-packet rates by tunnel.

## Review Notes
The article is technically relevant and salvageable. The largest corrections were around current Cloud VPN metric names and Cloud Monitoring query/alerting practices. The custom metric example assumes Application Default Credentials and appropriate Monitoring write permissions, which is standard for the Cloud Monitoring Python client but could be called out in a future improvement.
