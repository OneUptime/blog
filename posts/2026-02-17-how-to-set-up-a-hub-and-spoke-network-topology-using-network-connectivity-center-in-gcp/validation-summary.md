# Validation Summary: How to Set Up a Hub-and-Spoke Network Topology Using Network Connectivity Center

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Google Cloud Platform
- Network Connectivity Center
- VPC spokes
- Hybrid spokes for HA VPN
- Cloud Router and BGP
- VPC firewall rules
- Google Cloud CLI

## Sources Consulted
- Google Cloud Network Connectivity Center overview: https://cloud.google.com/network-connectivity/docs/network-connectivity-center/concepts/overview
- Google Cloud VPC spokes overview: https://cloud.google.com/network-connectivity/docs/network-connectivity-center/concepts/vpc-spokes-overview
- Google Cloud route exchange with VPC spokes: https://cloud.google.com/network-connectivity/docs/network-connectivity-center/concepts/dynamic-route-exchange-with-vpc-spokes
- Google Cloud Work with hubs and spokes: https://cloud.google.com/network-connectivity/docs/network-connectivity-center/how-to/working-with-hubs-spokes
- Google Cloud View the hub route table and routes: https://cloud.google.com/network-connectivity/docs/network-connectivity-center/how-to/vpc-view-hub-route-table
- Google Cloud View the VPC route table: https://cloud.google.com/network-connectivity/docs/network-connectivity-center/how-to/vpc-view-route-table
- Google Cloud SDK reference for `gcloud network-connectivity hubs create`: https://cloud.google.com/sdk/gcloud/reference/network-connectivity/hubs/create
- Google Cloud SDK reference for `gcloud network-connectivity hubs list-spokes`: https://cloud.google.com/sdk/gcloud/reference/network-connectivity/hubs/list-spokes
- Google Cloud SDK reference for `gcloud network-connectivity hubs route-tables routes list`: https://cloud.google.com/sdk/gcloud/reference/network-connectivity/hubs/route-tables/routes/list
- Google Cloud SDK reference for VPC spoke create/update: https://cloud.google.com/sdk/gcloud/reference/network-connectivity/spokes/linked-vpc-network/create
- Google Cloud SDK reference for VPN spoke create: https://cloud.google.com/sdk/gcloud/reference/network-connectivity/spokes/linked-vpn-tunnels/create
- Google Cloud SDK reference for spoke delete: https://cloud.google.com/sdk/gcloud/reference/network-connectivity/spokes/delete
- Google Cloud SDK reference for HA VPN and Cloud Router commands: https://cloud.google.com/sdk/gcloud/reference/compute/vpn-tunnels/create and https://cloud.google.com/sdk/gcloud/reference/compute/routers/add-interface
- Google Cloud VPC Network Peering documentation: https://cloud.google.com/vpc/docs/vpc-peering

## Issues Found
- Replaced the hard-coded VPC Peering connection limit claim with a per-network quota description, because current Google Cloud quota documentation treats this as a quota rather than a fixed article-level constant.
- Corrected the NCC IAM role reference from `networkconnectivity.admin` to current predefined roles such as `roles/networkconnectivity.hubAdmin` and `roles/networkconnectivity.spokeAdmin`.
- Replaced `--location=global` with `--global` for VPC spoke create/update/delete commands, matching the current `gcloud network-connectivity spokes linked-vpc-network` and spoke delete syntax.
- Replaced invalid spoke listing commands that used `gcloud network-connectivity spokes list --hub=...` with `gcloud network-connectivity hubs list-spokes`.
- Replaced the invalid `gcloud network-connectivity hubs list-routes` command with `gcloud network-connectivity hubs route-tables routes list`.
- Replaced the route-verification example that relied on unsupported `gcloud compute routes list` fields such as `nextHopHub` with hub route table inspection using NCC route fields such as `ipCidrRange`, `type`, `spoke`, and `nextHopVpcNetwork.uri`.
- Corrected the HA VPN setup example for an on-premises peer by adding an external VPN gateway resource, using `--peer-external-gateway`, using `--interface`, and adding the required Cloud Router interface before creating the BGP peer.
- Added `--include-import-ranges=ALL_IPV4_RANGES` to the VPN spoke creation command so VPC spoke subnet ranges are automatically advertised back to on-premises through BGP, as claimed by the post.
- Updated the cross-project note to describe required spoke permissions and hub administrator acceptance or auto-acceptance instead of an NCC service account grant.

## Review Notes
The VPN setup remains intentionally simplified and still references a second HA tunnel without showing every command for it, which is acceptable for the post's current style. In a future expansion, the guide could show both tunnel and BGP peer definitions explicitly.
