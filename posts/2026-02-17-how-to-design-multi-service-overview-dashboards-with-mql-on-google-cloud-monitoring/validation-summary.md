# Validation Summary: How to Design Multi-Service Overview Dashboards with MQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Monitoring
- Monitoring Query Language (MQL)
- Cloud Monitoring Dashboard API
- Google Cloud Python client libraries
- Cloud Run metrics
- Google Kubernetes Engine metrics
- Cloud SQL metrics
- OpenTelemetry custom metrics

## Sources Consulted
- Google Cloud MQL deprecation notice: https://docs.cloud.google.com/stackdriver/docs/deprecations/mql
- Google Cloud Monitoring dashboard API guide: https://docs.cloud.google.com/monitoring/dashboards/api-dashboard
- Cloud Monitoring dashboard v1 API reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rpc/google.monitoring.dashboard.v1
- Google Cloud Python Monitoring Dashboards client reference: https://cloud.google.com/python/docs/reference/monitoring-dashboards/latest
- Cloud Run metric descriptors: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- GKE metric descriptors: https://docs.cloud.google.com/monitoring/api/metrics_kubernetes
- Cloud SQL metric descriptors: https://docs.cloud.google.com/monitoring/api/metrics_gcp_c
- Cloud Monitoring request-response SLI documentation: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/req-resp-metrics
- Cloud Monitoring distribution metric documentation: https://docs.cloud.google.com/monitoring/api/v3/distribution-metrics

## Issues Found
- The introduction described MQL as the tool for new cross-service dashboards. Updated it to reflect Google's current guidance: MQL still works for existing dashboards and API-created dashboards, but PromQL or the interactive query builder is now recommended for new work.
- The "Before MQL" wording implied Cloud Monitoring was still limited to the old point-and-click metric explorer. Reworded it to avoid outdated product positioning.
- The capabilities list said MQL applies conditional formatting. Changed this to threshold conditions; dashboard cell coloring and threshold rendering are dashboard features, not MQL formatting syntax.
- The latency section said it showed P50 and P99, but the first query only returned P99. Updated the query to return both P50 and P99.
- The latency examples used `align delta(5m)` on distribution-valued latency metrics. Removed that aligner and kept percentile aggregation, which matches how distribution-valued metrics are converted into numeric percentile series.
- The "Request Volume Heatmap" section used a request-count time-series query, not a heatmap over a distribution metric. Renamed it to a request volume chart and adjusted the text.
- The Python example imported `json` without using it. Removed the unused import.
- The API dashboard's "Error Rate by Service" table query only counted 5xx responses. Updated it to calculate an error-rate percentage from non-5xx and 5xx request counts.
- The API dashboard's latency query also used `align delta(5m)` on a distribution-valued latency metric. Removed it.
- The latency SLI example claimed to calculate the percentage of requests under 500ms, but the query only evaluated whether P99 latency was below 500ms. Updated the comment to call it a P99 latency SLI proxy.

## Review Notes
MQL is not shut down, but as of the current Google documentation it is no longer a recommended query language, Google customer support for writing valid MQL has ended, and new MQL dashboards can't be created in the Google Cloud console. They can still be created through the Cloud Monitoring API. The Python dashboard sample was syntax-checked and its protobuf construction was verified with `google-cloud-monitoring-dashboards==2.19.0`; the MQL snippets were reviewed against official documentation but not executed against a live Google Cloud project.
