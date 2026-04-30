# Validation Summary: How to Configure IPv6 Subnets in Google Cloud

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud VPC
- Google Cloud IPv6 networking
- `gcloud` CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud VPC subnets documentation: https://docs.cloud.google.com/vpc/docs/subnets
- Google Cloud VPC network creation and IPv6 subnet examples: https://docs.cloud.google.com/vpc/docs/create-modify-vpc-networks
- `gcloud compute networks subnets create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/create
- `gcloud compute networks subnets update` reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/update
- Compute Engine `subnetworks` REST resource reference: https://docs.cloud.google.com/compute/docs/reference/rest/v1/subnetworks
- Terraform `google_compute_subnetwork` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork
- Terraform `google_compute_network` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network

## Issues Found
- The post incorrectly said a dual-stack subnet receives a `/96` IPv6 block and that external subnets receive `/48` prefixes. I corrected this to match Google Cloud's documented model: IPv6-enabled subnets receive `/64` ranges, while VM network interfaces receive `/96` ranges.
- The internal IPv6 examples omitted the required VPC prerequisite. I added the `gcloud compute networks update ... --enable-ula-internal-ipv6` step and the Terraform `enable_ula_internal_ipv6 = true` network setting because internal IPv6 subnets require a `/48` ULA range on the VPC first.
- The inspection examples used `ipv6CidrRange`, which the Compute Engine REST reference marks as internal-use output. I changed the examples to use the documented subnet prefix fields `internalIpv6Prefix` and `externalIpv6Prefix`.
- The Private IPv6 Google Access CLI example used the wrong flag name. I corrected `--private-ipv6-google-access=...` to `--private-ipv6-google-access-type=enable-outbound-vm-access`, which matches the current `gcloud` reference.
- The allocation example mixed subnet and VPC prefix sizes for internal IPv6, and it used an inconsistent subnet name in the `describe` command. I corrected the examples and aligned the command with the earlier `subnet-public` example.
- The Terraform section labeled one subnet as "internal IPv6 only" even though its `stack_type` was dual-stack. I corrected the comment to match the actual configuration.

## Review Notes
- External IPv6 subnet ranges are available only in Premium Tier. The post remains technically correct without that detail, but it would be worth mentioning if the guide is expanded later.
- The Terraform examples match current provider documentation; older Google provider versions should be rechecked before reuse.
