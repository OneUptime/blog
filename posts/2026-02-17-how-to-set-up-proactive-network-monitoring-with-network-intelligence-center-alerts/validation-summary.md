# Validation Summary: How to Set Up Proactive Network Monitoring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Network Intelligence Center
- Performance Dashboard
- Connectivity Tests
- Cloud Monitoring alerting policies
- Cloud Monitoring notification channels
- Cloud Monitoring dashboards
- Cloud VPN metrics
- Cloud Scheduler
- Cloud Functions for Python
- Google Cloud Network Management Python client

## Sources Consulted
- Google Cloud SDK reference for `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud SDK reference for `gcloud beta monitoring channels create`: https://cloud.google.com/sdk/gcloud/reference/beta/monitoring/channels/create
- Google Cloud SDK reference for `gcloud monitoring dashboards create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- Network Intelligence Center Performance Dashboard metrics reference: https://docs.cloud.google.com/network-intelligence-center/docs/performance-dashboard/how-to/viewing-perf-dash-metrics
- Cloud Monitoring Google Cloud metrics reference for `networking.googleapis.com/vm_flow/rtt` and `networking.googleapis.com/cloud_netslo/active_probing/probe_count`: https://docs.cloud.google.com/monitoring/api/metrics_gcp_i_o
- Cloud Monitoring monitored resource types reference for `gce_zone_network_health`: https://docs.cloud.google.com/monitoring/api/resources
- Network Intelligence Center Connectivity Tests guide: https://docs.cloud.google.com/network-intelligence-center/docs/connectivity-tests/how-to/running-connectivity-tests
- Network Management Python client reference for `ReachabilityServiceClient.rerun_connectivity_test`: https://docs.cloud.google.com/python/docs/reference/networkmanagement/latest/google.cloud.network_management_v1.services.reachability_service.ReachabilityServiceClient
- Cloud Scheduler HTTP job reference: https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- Cloud VPN logs and metrics reference: https://cloud.google.com/network-connectivity/docs/vpn/how-to/viewing-logs-metrics
- Cloud Load Balancing metrics reference for `loadbalancing.googleapis.com/https/backend_request_count`: https://cloud.google.com/load-balancing/docs/https/https-logging-monitoring

## Issues Found
- The notification channel examples used `gcloud monitoring channels create/list`, but the documented CLI surface for channel creation is currently the beta command group. Updated the commands to `gcloud beta monitoring channels create/list`.
- The PagerDuty text described webhook channels, but the example creates a PagerDuty notification channel. Updated the wording to match the command.
- The latency alert commands used obsolete `--condition-threshold-*` flags. Replaced them with the current documented `--if` and `--duration` flags, and added percentile aggregation for the `vm_flow/rtt` distribution metric.
- The latency filters used nonexistent `source_zone` and `destination_zone` metric labels. Replaced them with documented `resource.labels.zone`, `metric.labels.remote_zone`, and `metric.labels.remote_region` filters.
- The packet loss alert used nonexistent `networking.googleapis.com/vm_flow/packet_loss`. Replaced it with a ratio alert using `networking.googleapis.com/cloud_netslo/active_probing/probe_count`, failed probes as the numerator, and total probes as the denominator.
- The Cloud Function imported unused `monitoring_v3` and `time`, and claimed to create incidents even though it only logs failures. Removed the unused imports and corrected the wording/docstring.
- The Cloud Scheduler command omitted a location even though the HTTP job command requires or resolves a location. Added `--location=us-central1`.
- The VPN alert and dashboard used the wrong metric name, `compute.googleapis.com/vpn_tunnel/tunnel_established`. Replaced it with the documented Cloud VPN metric `vpn.googleapis.com/tunnel_established` and `vpn_gateway` resource type.
- The dashboard used the nonexistent packet-loss metric. Replaced that chart with failed network probes based on the documented active probing metric.

## Review Notes
- `gcloud` was not installed in the local environment, so CLI validation was performed against official Google Cloud SDK documentation rather than local `--help` output.
- The connectivity-test Cloud Function logs failures for a downstream log-based alerting workflow, but the post does not include the optional log-based metric and alert setup for those log lines.
