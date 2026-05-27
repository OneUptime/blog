# Validation Summary: How to Use Network Analyzer to Detect VPN Tunnel

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Network Analyzer
- Google Cloud Network Intelligence Center
- Google Cloud Recommender API and gcloud CLI
- Cloud VPN
- Cloud Router and BGP
- Cloud Load Balancing
- Cloud Logging and Cloud Monitoring alerting

## Sources Consulted
- Google Cloud Network Analyzer overview: https://docs.cloud.google.com/network-intelligence-center/docs/network-analyzer/overview
- Google Cloud Network Analyzer insight groups and types: https://docs.cloud.google.com/network-intelligence-center/docs/network-analyzer/insight-groups-types
- Google Cloud Network Analyzer roles and permissions: https://docs.cloud.google.com/network-intelligence-center/docs/network-analyzer/access-control
- Google Cloud Network Analyzer load balancer insights: https://docs.cloud.google.com/network-intelligence-center/docs/network-analyzer/insights/network-services/load-balancer
- Google Cloud Network Analyzer shadowed dynamic route insights: https://docs.cloud.google.com/network-intelligence-center/docs/network-analyzer/insights/hybrid-connectivity/dynamic-route-shadowed
- Google Cloud Network Analyzer log-based alerts: https://docs.cloud.google.com/network-intelligence-center/docs/network-analyzer/setup-log-based-alerts
- gcloud recommender insights list reference: https://cloud.google.com/sdk/gcloud/reference/recommender/insights/list
- Google Cloud Recommender insights API usage: https://cloud.google.com/recommender/docs/insights/use-api
- Google Cloud Load Balancing firewall rules: https://cloud.google.com/load-balancing/docs/firewall-rules
- gcloud compute backend-services get-health reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/get-health
- Cloud VPN MTU considerations: https://docs.cloud.google.com/network-connectivity/docs/vpn/concepts/mtu-considerations
- Cloud VPN supported IKE ciphers: https://docs.cloud.google.com/network-connectivity/docs/vpn/concepts/supported-ike-ciphers
- gcloud monitoring policies create reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create

## Issues Found
- The post used the non-existent command `gcloud network-management network-analyzer-findings list`. Replaced it with documented `gcloud recommender insights list` commands and the Network Analyzer Recommender insight types.
- The post said to enable `networkmanagement.googleapis.com` and grant `roles/networkmanagement.viewer` for Network Analyzer CLI insights. Updated this to `recommender.googleapis.com` and `roles/recommender.networkAnalyzerViewer`, matching Network Analyzer access control docs.
- The post claimed Network Analyzer checks IKE version and cipher mismatches. Updated the IKE section to describe it as a manual Cloud VPN troubleshooting check.
- The post claimed Network Analyzer detects VPN MTU mismatches and implied VPN tunnel MTU can be updated to match the VPC. Updated this to a manual MTU check and clarified Cloud VPN gateway/payload MTU behavior.
- The post overstated VPN route advertisement coverage. Updated it to the documented dynamic route shadowing and VPN-tunnel next-hop insights, with manual Cloud Router checks for BGP status and advertisements.
- The post listed load balancer insights that are not documented Network Analyzer load balancer insight types, including generic backend health, backend capacity, URL map unreachable rules, and certificate expiration. Updated the descriptions to documented insights such as health check firewall problems, health check port mismatch, session affinity risks, and Google-managed certificate attachment/port 443 problems.
- The log-based metric filter used `resource.type="network_management_connectivity_test"`, which is for Connectivity Tests rather than Network Analyzer logs. Replaced it with the documented Network Analyzer log ID.
- The alerting policy command used invalid threshold flags for the current `gcloud monitoring policies create` command. Replaced them with documented `--if="> 0"` and `--duration=60s` flags.

## Review Notes
The post is now technically aligned with the documented Network Analyzer insight types. Some manual troubleshooting checks remain intentionally included because they are useful follow-up diagnostics, but they are no longer described as Network Analyzer detections where Google does not document that behavior.
