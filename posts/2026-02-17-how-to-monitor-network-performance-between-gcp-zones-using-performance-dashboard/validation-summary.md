# Validation Summary: How to Monitor Network Performance Between GCP Zones Using Performance Dashboard

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Performance Dashboard
- Network Intelligence Center
- Cloud Monitoring API
- Google Cloud CLI
- Cloud Monitoring dashboards and alerting policies
- Compute Engine VM network metrics

## Sources Consulted
- Google Cloud Performance Dashboard overview: https://docs.cloud.google.com/network-intelligence-center/docs/performance-dashboard/concepts/overview
- Google Cloud Performance Dashboard metrics and views: https://docs.cloud.google.com/network-intelligence-center/docs/performance-dashboard/concepts/metrics-views
- Google Cloud Performance Dashboard metrics reference: https://docs.cloud.google.com/network-intelligence-center/docs/performance-dashboard/how-to/viewing-perf-dash-metrics
- Google Cloud Monitoring metrics list, networking metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_i_o
- Google Cloud Monitoring monitored resource types: https://docs.cloud.google.com/monitoring/api/resources
- Cloud Monitoring timeSeries.list REST method: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/list
- gcloud monitoring policies create reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- gcloud monitoring dashboards create reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create

## Issues Found
- The post enabled `networkmanagement.googleapis.com` for programmatic metric queries. Updated it to enable `monitoring.googleapis.com`, because the examples query Cloud Monitoring time-series data.
- The `gcloud monitoring time-series list` examples used a command group that is not available in the current GA `gcloud monitoring` surface. Replaced those examples with Cloud Monitoring `projects.timeSeries.list` REST API calls authenticated with `gcloud auth print-access-token`.
- The latency examples used non-existent `source_zone` and `destination_zone` metric labels. Updated filters to use `resource.labels.zone` for the local zone and `metric.labels.remote_zone` for the remote zone, with `resource.type="gce_instance"`.
- The latency examples treated `vm_flow/rtt` as a simple double value in seconds. Updated examples to align the distribution metric with `ALIGN_PERCENTILE_50`; thresholds now use milliseconds, matching the metric unit.
- The packet-loss examples used a non-existent `networking.googleapis.com/vm_flow/packet_loss` metric. Updated them to use `networking.googleapis.com/cloud_netslo/active_probing/probe_count` on `gce_zone_network_health`, and clarified that packet loss is calculated from failed probes divided by total probes.
- The alerting policy command used obsolete or unsupported flags (`--condition-threshold-value`, `--condition-threshold-duration`, and `--condition-threshold-comparison`). Updated it to the current `--if`, `--duration`, and `--aggregation` flags.
- The dashboard JSON used incorrect metric labels and the non-existent packet-loss metric. Updated the latency chart filter and aggregation, and changed the packet-loss widget to show failed packet-loss probes.
- The text implied latency data purely reflects network-layer behavior and not application behavior. Updated it to note that RTT is sampled from TCP traffic and can be influenced by application behavior in some cases.
- The availability notes implied data appears for any active VM zone pair. Updated them to reflect the documented requirements for sufficient TCP traffic, VMs, and probes.

## Review Notes
- The post is technically relevant and contains commands, API examples, and dashboard configuration.
- The dashboard example now charts failed packet-loss probes rather than computing a packet-loss percentage. A future improvement could add a ratio-based chart or MQL/PromQL example for failed probes divided by total probes.
