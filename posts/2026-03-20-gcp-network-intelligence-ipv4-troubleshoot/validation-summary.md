# Validation Summary: How to Use GCP Network Intelligence Center to Troubleshoot IPv4 Issues

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Platform (GCP)
- Network Intelligence Center
- Connectivity Tests
- Firewall Insights
- Network Topology
- Performance Dashboard
- Google Cloud CLI (`gcloud`)
- VPC networking
- IPv4 troubleshooting

## Sources Consulted
- Google Cloud: Network Intelligence Center overview  
  https://cloud.google.com/network-intelligence-center/docs/overview
- Google Cloud: Create and run Connectivity Tests  
  https://cloud.google.com/network-intelligence-center/docs/connectivity-tests/how-to/running-connectivity-tests
- Google Cloud: Measuring reachability in Connectivity Tests  
  https://cloud.google.com/network-intelligence-center/docs/connectivity-tests/concepts/reachability
- Google Cloud SDK reference: `gcloud network-management connectivity-tests`  
  https://cloud.google.com/sdk/gcloud/reference/network-management/connectivity-tests
- Google Cloud SDK reference: `gcloud network-management connectivity-tests create`  
  https://cloud.google.com/sdk/gcloud/reference/network-management/connectivity-tests/create
- Google Cloud: Enable APIs and features for Firewall Insights  
  https://cloud.google.com/network-intelligence-center/docs/firewall-insights/how-to/enable-api-features
- Google Cloud: View and understand Firewall Insights  
  https://cloud.google.com/network-intelligence-center/docs/firewall-insights/how-to/view-understand-insights
- Google Cloud: Manage and export Firewall Insights  
  https://cloud.google.com/network-intelligence-center/docs/firewall-insights/how-to/manage-insights
- Google Cloud: Set up observation period and refresh cycle for Firewall Insights  
  https://cloud.google.com/network-intelligence-center/docs/firewall-insights/how-to/configure-observation-period
- Google Cloud SDK reference: `gcloud recommender insights list`  
  https://cloud.google.com/sdk/gcloud/reference/recommender/insights/list
- Google Cloud: Network Topology overview  
  https://cloud.google.com/network-intelligence-center/docs/network-topology/concepts/overview
- Google Cloud: Performance Dashboard overview  
  https://cloud.google.com/network-intelligence-center/docs/performance-dashboard/concepts/overview

## Issues Found
- The post used `gcloud network-management connectivity-tests run`, but the current CLI command is `gcloud network-management connectivity-tests rerun`. I corrected the command and updated the result description to include the documented `UNDETERMINED` state.
- The Firewall Insights example used `gcloud compute firewall-rules list`, which only lists firewall rules and does not query Firewall Insights. I replaced it with `gcloud recommender insights list`, added the required `recommender.googleapis.com` API enablement, and noted that some insights depend on Firewall Rules Logging and Firewall Insights configuration.
- The troubleshooting example used the invalid flag `--source-ip`. I changed it to `--source-ip-address` and aligned the example with the current Connectivity Tests CLI by adding `--source-network-type` and `--destination-network`.
- The troubleshooting example checked for a default route (`0.0.0.0/0`) while describing connectivity to a specific VM. I changed the route check to the destination subnet so the diagnostic step matches the scenario.
- The firewall verification filter in the troubleshooting example was overly specific and not a reliable generic check. I simplified it to a valid ingress firewall rules listing for the target VPC.
- The Performance Dashboard description said it monitors latency and packet loss "between Google services," which is not how Google documents the feature. I corrected the wording to reflect VM-to-VM packet loss and latency, plus latency to internet locations.
- I tightened the Network Topology wording to describe observed communication rather than implying a packet-by-packet flow map.

## Review Notes
- The `8.8.8.8` example is valid for configuration analysis, but Google documents that live data plane analysis results are not shown for Google-owned IP addresses such as `8.8.8.8`.
- Performance Dashboard is primarily a console feature. The `gcloud services enable networkmanagement.googleapis.com` command enables access to the service, but it does not expose dashboard views directly in the CLI.
