# Validation Summary: How to Configure GCP Shared VPC IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Shared VPC
- Google Cloud VPC networks and subnetworks
- Internal IPv6 and dual-stack subnet configuration
- Cloud Router and multiprotocol BGP
- HA VPN or Cloud Interconnect
- `gcloud` CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud Shared VPC overview: https://docs.cloud.google.com/vpc/docs/shared-vpc
- Google Cloud Shared VPC provisioning: https://docs.cloud.google.com/vpc/docs/provisioning-shared-vpc
- Google Cloud subnets and IPv6 subnet ranges: https://docs.cloud.google.com/vpc/docs/subnets
- Google Cloud VPC network creation and IPv6 enablement: https://docs.cloud.google.com/vpc/docs/create-modify-vpc-networks
- Cloud Router multiprotocol BGP configuration: https://docs.cloud.google.com/network-connectivity/docs/router/how-to/configuring-mp-bgp
- Cloud Router custom route advertisements: https://docs.cloud.google.com/network-connectivity/docs/router/how-to/advertising-custom-ip
- `gcloud compute networks update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/update
- `gcloud compute networks subnets update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/update
- `gcloud compute networks subnets list-usable` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/list-usable
- `gcloud compute routers update-bgp-peer` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/update-bgp-peer
- `gcloud compute routers list-bgp-routes` reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/list-bgp-routes
- Terraform Google provider `google_compute_network`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_network.html.markdown
- Terraform Google provider `google_compute_subnetwork`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_subnetwork.html.markdown
- Terraform Google provider `google_compute_router_peer`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/compute_router_peer.html.markdown

## Issues Found
- The description and introduction implied that Shared VPC IPv6 "allocates IPv6 subnets" from the host project to service projects and that IPv6 BGP is always required. I corrected this to reflect the documented model: shared subnets remain in the host project, service projects use them, and Cloud Router BGP is only needed when extending IPv6 routing over HA VPN or Cloud Interconnect.
- The prerequisites omitted key Google Cloud requirements. I updated them to require a custom-mode Shared VPC host network, a service project attachment, a `/48` ULA IPv6 range for internal IPv6, and hybrid connectivity prerequisites only when BGP routing is part of the design.
- Step 1 and Step 2 were not scoped correctly to Shared VPC resources in the host project and skipped the network-level ULA prerequisite for internal IPv6. I replaced the commands with documented host-project `gcloud compute networks describe`, `gcloud compute networks update --enable-ula-internal-ipv6`, and `gcloud compute networks subnets update --stack-type IPV4_IPV6 --ipv6-access-type INTERNAL` usage.
- Step 3 used an invalid BGP example. The original `add-bgp-peer` command used arbitrary IPv6 peer addresses and a nonexistent `--address` flag. I replaced it with the documented `update-bgp-peer --enable-ipv6` flow for enabling IPv6 route exchange on an existing BGP session.
- Step 4's route advertisement example was incomplete and potentially misleading because it omitted `--enable-ipv6` and would override normal subnet advertisements. I corrected it to use custom advertisement mode with `--set-advertisement-groups=all_subnets` and a valid example IPv6 prefix.
- Step 5 used `get-status | grep ipv6` as route verification. I replaced this with the documented `gcloud compute routers list-bgp-routes` command for IPv6 route inspection and updated the connectivity test to `ping -6`.
- The Terraform example was technically incorrect for the current provider because `google_compute_router_peer.peer_ip_address` supports only IPv4, not the IPv6 example shown. I replaced the snippet with a valid Terraform example for enabling internal IPv6 on a host-project VPC network and shared subnet, which is the core configuration the article discusses.

## Review Notes
- Shared VPC internal IPv6 does not by itself require Cloud Router, BGP, or custom route advertisements. Those steps are only relevant for hybrid or cross-network routing designs.
- Auto mode VPC networks do not support IPv6 subnets, so the corrected post now assumes a custom-mode host VPC network.
- The Google Cloud CLI was not installed in the local review environment, so CLI validation was done against the official `gcloud` reference pages rather than local `--help` output.
