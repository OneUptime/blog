# Validation Summary: How to Set Up HA VPN with Active/Passive Tunnel Configuration in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud HA VPN
- Google Cloud Router
- BGP
- MED / advertised route priority
- Google Cloud CLI
- Cloud Monitoring

## Sources Consulted
- Google Cloud: Create an HA VPN gateway to a peer VPN gateway - https://cloud.google.com/network-connectivity/docs/vpn/how-to/creating-ha-vpn
- Google Cloud: HA VPN topologies - https://cloud.google.com/network-connectivity/docs/vpn/concepts/topologies
- Google Cloud: Cloud Router advertised routes - https://cloud.google.com/network-connectivity/docs/router/concepts/advertised-routes
- Google Cloud: List BGP routes - https://cloud.google.com/network-connectivity/docs/router/how-to/list-routes
- Google Cloud: Manage BGP timers - https://cloud.google.com/network-connectivity/docs/router/how-to/managing-bgp-timers
- Google Cloud: Bidirectional Forwarding Detection overview - https://cloud.google.com/network-connectivity/docs/router/concepts/bfd
- Google Cloud: View Cloud VPN logs and metrics - https://cloud.google.com/network-connectivity/docs/vpn/how-to/viewing-logs-metrics
- Google Cloud SDK reference: `gcloud compute routers add-bgp-peer` - https://cloud.google.com/sdk/gcloud/reference/compute/routers/add-bgp-peer
- Google Cloud SDK reference: `gcloud compute routers update-bgp-peer` - https://cloud.google.com/sdk/gcloud/reference/compute/routers/update-bgp-peer
- Google Cloud SDK reference: `gcloud compute routes list` - https://cloud.google.com/sdk/gcloud/reference/compute/routes/list
- Google Cloud SDK reference: `gcloud compute external-vpn-gateways create` - https://cloud.google.com/sdk/gcloud/reference/compute/external-vpn-gateways/create
- Google Cloud SLA: Cloud VPN Service Level Agreement - https://cloud.google.com/network-connectivity/docs/vpn/sla

## Issues Found
- The post described active/active behavior as exactly 50/50 load balancing. Updated this to ECMP traffic distribution because ECMP is flow/hash based and not guaranteed to split traffic exactly evenly.
- The active/passive description said failover happens immediately. Updated this to "automatically" because BGP failover depends on hold timers or explicit session teardown.
- The on-premises routing guidance conflated local preference and MED. Clarified that local preference can influence on-premises-to-GCP traffic, while MED advertised to Cloud Router influences GCP-to-on-premises traffic.
- The route verification command used `gcloud compute routes list` for dynamic routes. Replaced it with Cloud Router status and `gcloud compute routers list-bgp-routes`, because `gcloud compute routes list` lists non-dynamic routes and Cloud Router dynamic routes must be checked through Cloud Router commands.
- The post recommended BFD for faster HA VPN failover. Corrected this because Cloud Router BFD is not supported for HA VPN BGP sessions.
- The monitoring example used Cloud Logging to inspect `sent_bytes_count`. Replaced it with a Cloud Monitoring PromQL metric query using `vpn.googleapis.com/network/sent_bytes_count`.
- The SLA section implied two operational tunnels were sufficient in general. Clarified that the HA VPN SLA depends on a proper HA VPN configuration with at least one tunnel on each HA VPN gateway interface and the same prefixes advertised on both links, even if priorities differ.
- The final restore-priority commands omitted `--project`; added it for consistency with the rest of the command examples.

## Review Notes
The local workspace does not have `gcloud` installed, so CLI validation was performed against official Google Cloud SDK reference documentation rather than local `--help` output.
