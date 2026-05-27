# Validation Summary: How to Set Up Redundant VPN Tunnels for 99.99 Percent SLA on GCP HA VPN

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud HA VPN
- Cloud VPN tunnels
- Cloud Router
- BGP
- Google Cloud CLI
- Cloud Monitoring metrics and alerting

## Sources Consulted
- Google Cloud HA VPN topologies: https://cloud.google.com/network-connectivity/docs/vpn/concepts/topologies
- Google Cloud guide to creating HA VPN to a peer VPN gateway: https://cloud.google.com/network-connectivity/docs/vpn/how-to/creating-ha-vpn
- Google Cloud guide to checking VPN status: https://cloud.google.com/network-connectivity/docs/vpn/how-to/checking-vpn-status
- Google Cloud VPN Service Level Agreement: https://cloud.google.com/network-connectivity/docs/vpn/sla
- Google Cloud CLI reference for `gcloud compute vpn-tunnels create`: https://cloud.google.com/sdk/gcloud/reference/compute/vpn-tunnels/create
- Google Cloud CLI reference for `gcloud compute external-vpn-gateways create`: https://cloud.google.com/sdk/gcloud/reference/compute/external-vpn-gateways/create
- Google Cloud CLI reference for `gcloud compute vpn-gateways get-status`: https://cloud.google.com/sdk/gcloud/reference/compute/vpn-gateways/get-status
- Google Cloud Monitoring metrics reference for Cloud VPN: https://cloud.google.com/monitoring/api/metrics_gcp_p_z#vpn
- Google Cloud VPN route order and ECMP behavior: https://cloud.google.com/network-connectivity/docs/vpn/concepts/order-of-routes

## Issues Found
- The post claimed that a two-device on-premises setup should create four tunnels, one from each Google Cloud interface to each on-premises device. Google Cloud documentation states that for two peer interfaces, the 99.99% SLA requirement is met with two tunnels: HA VPN interface 0 to peer interface 0, and HA VPN interface 1 to peer interface 1. I changed the tunnel and BGP examples from four sessions to two corresponding sessions and noted that full mesh is not required for the Google Cloud-side SLA.
- The post said to look for `highAvailability.state` in `gcloud compute vpn-gateways get-status` output. Google documentation shows the high availability status as `HighAvailabilityRedundancyRequirementState.state`. I updated the field name.
- The post listed `CONNECTION_REDUNDANCY_DEGRADED` as a possible high availability state. Current Google documentation and API references list `CONNECTION_REDUNDANCY_MET` and `CONNECTION_REDUNDANCY_NOT_MET` for this state. I removed the unsupported value.
- The Cloud Monitoring alert used the metric type `compute.googleapis.com/vpn/tunnel_established`. Google Cloud Monitoring documents the Cloud VPN metric as `vpn.googleapis.com/tunnel_established`. I corrected the metric type.
- The opening text implied multiple HA VPN gateways are generally needed. I narrowed this to redundant tunnels across both HA VPN gateway interfaces, which is the documented requirement for HA VPN to peer VPN gateway topologies.

## Review Notes
The command syntax could not be checked with local `gcloud --help` because the Google Cloud CLI is not installed in this environment, so CLI validation was performed against the official Google Cloud CLI documentation. The monitoring command remains an illustrative alerting example; production alert policies often need additional filters or aggregations for specific gateway and tunnel labels.
