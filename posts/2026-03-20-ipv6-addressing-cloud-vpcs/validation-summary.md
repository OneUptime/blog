# Validation Summary: How to Plan IPv6 Addressing for Cloud VPCs

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing
- AWS VPC
- Azure Virtual Network (VNet)
- Google Cloud VPC
- Azure CLI
- Google Cloud CLI (`gcloud`)
- Terraform AWS Provider
- Python `ipaddress`

## Sources Consulted
- AWS VPC CIDR blocks: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html
- Add IPv6 support for your VPC: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-migrate-ipv6-add.html
- Planning IPv6 adoption in the AWS Cloud network: https://docs.aws.amazon.com/whitepapers/latest/ipv6-on-aws/planning-ipv6-adoption-in-the-aws-cloud-network.html
- AWS Availability Zones: https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-availability-zones.html
- Overview of IPv6 for Azure Virtual Network: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/ipv6-overview
- Create an Azure virtual machine with a dual-stack network: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/create-vm-dual-stack-ipv6-portal
- Configure IP addresses for an Azure network interface: https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/virtual-network-network-interface-addresses
- `az network nic ip-config` reference: https://learn.microsoft.com/en-us/cli/azure/network/nic/ip-config?view=azure-cli-latest
- Google Cloud VPC subnets: https://cloud.google.com/vpc/docs/subnets
- Create and manage VPC networks: https://cloud.google.com/vpc/docs/create-modify-vpc-networks
- `gcloud compute networks create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/create
- `gcloud compute networks subnets create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/create
- Compute Engine subnetwork REST resource: https://cloud.google.com/compute/docs/reference/rest/v1/subnetworks
- Terraform `aws_vpc` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- Terraform language functions: https://developer.hashicorp.com/terraform/language/functions

## Issues Found
- The AWS section originally stated that AWS assigns a `/56` to each VPC unconditionally. I updated it to clarify that the fixed `/56` applies to Amazon-provided IPv6 CIDR blocks, because AWS also supports IPAM-allocated and BYOIP IPv6 CIDRs.
- The AWS sample comment said `us-east-1` has six Availability Zones (`a-f`). I replaced it with a generic example note because AZ counts change and AZ letter mappings can be account-specific.
- The Azure model description said Azure uses Azure-allocated or BYOIP IPv6 prefixes. I corrected this to match current documentation: VNets use customer-defined IPv6 address space, and IPv6 subnets must be exactly `/64`.
- The Azure CLI NIC example used `az network nic ip-config update` with an explicit private IPv6 address. I replaced it with the documented `az network nic ip-config create` pattern for creating an IPv6 IP configuration on a NIC.
- The GCP internal IPv6 example omitted the required VPC-level ULA enablement step. I added `--enable-ula-internal-ipv6` to the network creation command.
- The GCP subnet inspection example queried `ipv6CidrRange`. I changed it to `internalIpv6Prefix`, which matches the documented subnetwork field for an internal IPv6 subnet range.
- The conclusion overstated provider behavior by implying AWS always provides `/56` blocks and that only Azure and GCP offer BYOIP flexibility. I rewrote it to distinguish Amazon-provided AWS IPv6, Azure customer-defined VNet space, and GCP internal or external IPv6 models.

## Review Notes
- Azure IPv6 support remains feature-dependent across Azure services; the VNet behavior described here is correct, but service-level compatibility should still be checked during implementation.
- In GCP, internal IPv6 requires a VPC-level `/48` ULA range. External IPv6 subnets do not require that step.
- The Python and Terraform examples were technically consistent after the provider-model wording corrections.
