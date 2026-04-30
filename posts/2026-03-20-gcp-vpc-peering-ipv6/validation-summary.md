# Validation Summary: How to Configure GCP VPC Peering IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud VPC Network Peering
- Google Cloud IPv6 and dual-stack VPC subnets
- Google Cloud CLI (`gcloud`)
- Terraform Google provider

## Sources Consulted
- Google Cloud VPC Network Peering overview: https://cloud.google.com/vpc/docs/vpc-peering
- Set up and manage VPC Network Peering: https://cloud.google.com/vpc/docs/using-vpc-peering
- Google Cloud subnets documentation: https://cloud.google.com/vpc/docs/subnets
- IPv6 support in Google Cloud: https://cloud.google.com/vpc/docs/ipv6-support
- `gcloud compute networks peerings create`: https://cloud.google.com/sdk/gcloud/reference/compute/networks/peerings/create
- `gcloud compute networks peerings update`: https://cloud.google.com/sdk/gcloud/reference/compute/networks/peerings/update
- `gcloud compute networks peerings list-routes`: https://cloud.google.com/sdk/gcloud/reference/compute/networks/peerings/list-routes
- `gcloud compute networks update`: https://cloud.google.com/sdk/gcloud/reference/compute/networks/update
- `gcloud compute networks subnets update`: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/update
- Terraform `google_compute_network_peering` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network_peering

## Issues Found
- The introduction incorrectly described VPC peering as an on-premises and BGP-based setup. I rewrote it to match Google Cloud’s documented model: VPC Network Peering exchanges IPv6 subnet routes when both sides use `IPV4_IPV6`, and Cloud Router is only relevant for optional custom route exchange.
- The prerequisites and enablement steps omitted the required VPC-level ULA `/48` configuration for internal IPv6 subnets. I added the network verification step and `gcloud compute networks update --enable-ula-internal-ipv6` before the subnet update.
- The original Step 3 used Cloud Router and `add-bgp-peer`, which configures HA VPN or Interconnect BGP sessions rather than VPC Network Peering. I replaced it with the documented `gcloud compute networks peerings create` commands on both sides of the peering.
- The original Step 4 advertised IPv6 prefixes from Cloud Router, which is not how VPC peering exchanges IPv6 subnet routes. I replaced it with `gcloud compute networks peerings update` commands to enable optional custom route import and export on both peerings.
- The original validation step used `gcloud compute routers get-status`, which is unrelated to VPC peering route exchange. I replaced it with `gcloud compute networks peerings list` and `gcloud compute networks peerings list-routes`.
- The Terraform example used `google_compute_router_peer`, which manages Cloud Router BGP peers rather than VPC peerings. I replaced it with two `google_compute_network_peering` resources using `stack_type = "IPV4_IPV6"` and the relevant custom route flags.

## Review Notes
- The post now accurately covers VPC-to-VPC IPv6 peering. If the author wants a separate article about exchanging on-premises IPv6 routes, that should be framed as Cloud Router with HA VPN or Interconnect plus optional custom route exchange over VPC peering.
- `gcloud` was not installed in the local workspace, so CLI validation was performed against the official Google Cloud SDK reference pages instead of local `--help` output.
