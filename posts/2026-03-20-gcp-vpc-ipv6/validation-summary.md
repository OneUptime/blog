# Validation Summary: How to Enable IPv6 in Google Cloud VPC

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud VPC
- Google Cloud IPv6 networking
- Google Cloud CLI (`gcloud`)
- Terraform
- HashiCorp Google provider

## Sources Consulted
- Google Cloud VPC subnet documentation: https://cloud.google.com/vpc/docs/subnets
- Google Cloud SDK reference for `gcloud compute networks create`: https://cloud.google.com/sdk/gcloud/reference/compute/networks/create
- Google Cloud SDK reference for `gcloud compute networks subnets create`: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/create
- Compute Engine IPv6 instance configuration: https://cloud.google.com/compute/docs/ip-addresses/configure-ipv6-address
- Terraform Registry `google_compute_subnetwork`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork
- Terraform Registry `google_compute_network`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network
- Azure IPv6 for Virtual Network overview, used to verify and remove the inaccurate cloud-comparison claim: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/ipv6-overview

## Issues Found
- The introduction claimed that AWS and Azure assign IPv6 at the VPC/VNet level in contrast to GCP. That was too broad and inaccurate for Azure dual-stack networking, so I removed the comparison and kept the GCP explanation focused on subnet-level IPv6 behavior.
- The `gcloud` example created an internal IPv6 subnet without first enabling a ULA internal IPv6 range on the VPC network. I added `--enable-ula-internal-ipv6` to the network creation command because internal IPv6 subnets require a `/48` ULA range on the VPC.
- The Terraform example had the same prerequisite issue for the internal IPv6 subnet. I added `enable_ula_internal_ipv6 = true` to the `google_compute_network` resource so the `ipv6_access_type = "INTERNAL"` subnet is valid.
- The Terraform provider version was pinned to `~> 5.0`, which is outdated relative to the current provider documentation consulted during review. I updated it to `~> 7.0`.
- The architecture section incorrectly described subnet and VM IPv6 prefix sizes. I corrected it to reflect Google Cloud's documented model: VPC network `/48` for internal ULA, subnet `/64`, and VM interface `/96`.
- The `IPV6_ONLY` description said it "requires DNS64/NAT64". That is too absolute. DNS64/NAT64 is needed when IPv6-only workloads must reach IPv4 internet destinations, so I adjusted the wording accordingly.
- The conclusion repeated the incorrect `/48` external subnet and `/96` subnet sizing claims. I corrected the conclusion to match the documented `/64` subnet and `/96` VM interface allocation model, and to mention the `/48` VPC-level prerequisite for internal IPv6.

## Review Notes
- `gcloud` was not installed in the local workspace, so CLI validation was performed against the official Google Cloud SDK reference instead of local `--help` output.
- The examples remain valid for dual-stack subnet creation. The post does not cover VM NIC stack-type changes, firewall rules for IPv6 ingress, or BYOIP IPv6 ranges, but the current scope is technically sound.
