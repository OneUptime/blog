# Validation Summary: How to Use Network Topology Visualization in Network Intelligence Center

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Network Intelligence Center
- Network Topology
- VPC Flow Logs
- Cloud Logging
- Cloud Monitoring
- gcloud CLI
- Shared VPC and VPC Network Peering
- Google Cloud IAM

## Sources Consulted
- Google Cloud Network Topology overview: https://docs.cloud.google.com/network-intelligence-center/docs/network-topology/concepts/overview
- Google Cloud Network Topology usage guide: https://docs.cloud.google.com/network-intelligence-center/docs/network-topology/how-to/audit-troubleshoot-networking-issues
- Google Cloud Network Topology roles and permissions: https://docs.cloud.google.com/network-intelligence-center/docs/network-topology/concepts/access-control
- Google Cloud Network Topology metrics reference: https://docs.cloud.google.com/network-intelligence-center/docs/network-topology/reference/metrics-reference
- Google Cloud Network Topology troubleshooting: https://docs.cloud.google.com/network-intelligence-center/docs/network-topology/support/troubleshooting
- gcloud compute networks subnets update reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/update
- Google Cloud VPC Flow Logs overview: https://cloud.google.com/vpc/docs/flow-logs
- Google Cloud VPC Flow Logs record format: https://cloud.google.com/vpc/docs/about-flow-logs-records
- Google Cloud Monitoring metrics list for networking metrics: https://cloud.google.com/monitoring/api/metrics_gcp_i_o

## Issues Found
- Network Topology was described as requiring VPC Flow Logs. Google Cloud documentation says Network Topology can be opened without additional configuration; VPC Flow Logs are needed for detailed flow-log lookup and generated BigQuery queries. Updated the section to clarify this.
- The post described Network Topology as a real-time/current-state map. Documentation describes hourly segments, six weeks of history, and recent metrics for the latest segment. Updated the language to refer to the selected hourly segment.
- The VPC Flow Logs gcloud example used API-style enum values `INTERVAL_5_SEC` and `INCLUDE_ALL_METADATA`. The current gcloud command reference expects lowercase CLI values such as `interval-5-sec` and `include-all`. Updated the command.
- The traffic details list included packets per second, protocol breakdown, and source/destination ports as details from clicking a topology line. Network Topology details are documented as metric charts and supported metrics such as throughput, latency, and packet loss; detailed ports come from flow logs. Updated the list.
- Troubleshooting examples overstated route/path tracing and Cloud NAT visibility. Updated the asymmetric-routing guidance to pair Network Topology with Connectivity Tests for exact packet paths, and removed the Cloud NAT example from visible single points of failure.
- The unused-resource guidance implied visible nodes with no traffic lines. Documentation says resources that do not communicate during the selected hour might not appear. Updated the wording accordingly.
- The export section described all data as underlying Monitoring API data while the first command queries VPC Flow Logs in Cloud Logging. Updated the wording to distinguish Cloud Logging flow logs from Cloud Monitoring metrics.
- The Monitoring example used BSD/macOS `date -v-1H`, which does not work in common Linux/Cloud Shell environments. Updated it to GNU `date -d '1 hour ago'`.
- The multi-project IAM example granted `roles/compute.networkViewer`, but Network Topology documentation requires Network Management Viewer and Monitoring Viewer permissions. Updated the command to grant `roles/networkmanagement.viewer` and `roles/monitoring.viewer`.
- The shared VPC section implied viewing only the host project shows all service project resources. Documentation says multi-project visibility requires a Cloud Monitoring metrics scope that includes the relevant projects. Updated the text.
- The filtering section claimed an arbitrary traffic-threshold filter and referenced a left sidebar. Documentation describes filtering entities in View options and traffic-type filters for egress insights. Updated the wording.

## Review Notes
The post is technically relevant and contains implementation details. gcloud was not installed in the local environment, so CLI verification was performed against the official Google Cloud SDK command reference rather than local `--help` output.
