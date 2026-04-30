# Validation Summary: How to Configure GCP VPC Network ULA Internal IPv6 Ranges

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud VPC
- Google Cloud CLI (`gcloud`)
- Terraform Google provider
- IPv6
- Unique Local Addresses (ULA)
- RFC 4193
- VPC Network Peering
- Private Google Access

## Sources Consulted
- Google Cloud VPC subnets documentation: https://cloud.google.com/vpc/docs/subnets
- Google Cloud VPC network creation and modification documentation: https://cloud.google.com/vpc/docs/create-modify-vpc-networks
- Google Cloud VPC peering documentation: https://cloud.google.com/vpc/docs/using-vpc-peering
- Google Cloud Public NAT documentation: https://cloud.google.com/nat/docs/public-nat
- Google Cloud DNS64/NAT64 overview: https://cloud.google.com/vpc/docs/ipv6-to-ipv4-overview
- Google Cloud Private Google Access documentation: https://cloud.google.com/vpc/docs/configure-private-google-access
- `gcloud compute networks update` reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/update
- `gcloud compute networks subnets create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/create
- `gcloud compute networks peerings create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/peerings/create
- Compute Engine network properties documentation: https://cloud.google.com/compute/docs/instances/view-network-properties
- Terraform `google_compute_network` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_network
- Terraform `google_compute_subnetwork` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork
- RFC 4193: https://www.rfc-editor.org/rfc/rfc4193.txt

## Issues Found
- The post incorrectly said that creating a subnet with `ipv6-access-type=INTERNAL` makes Google Cloud assign a `/48` to the subnet. I fixed this by adding the required VPC-level ULA enablement step and clarifying that the VPC gets the `/48` and each subnet gets a `/64`.
- The post described Google Cloud ULA assignment too broadly as `fd00::/8` and referred to a random 40-bit global ID in a way that did not match current Google Cloud behavior. I corrected the post to explain that Google Cloud assigns or validates a VPC-level `/48` from `fd20::/20`, which is within RFC 4193 local-assignment space.
- The peering example used an invalid `gcloud` flag (`--exchange-subnet-routes`) and implied one command was sufficient. I replaced it with a valid two-sided peering example using `--stack-type=IPV4_IPV6`, which matches current peering requirements for IPv6 route exchange.
- The Terraform example omitted `enable_ula_internal_ipv6 = true` on the VPC network, which is required before creating internal IPv6 subnets. I added the missing argument.
- The connectivity test used `curl` against PostgreSQL port `5432`, which is not an HTTP endpoint, and the routing text said Cloud NAT was required for ULA internet access. I replaced the test with `nc -zv -6` for TCP verification and clarified that internal ULA IPv6 addresses themselves are not internet-routable.
- The post description metadata still said Google Cloud assigns `fd::/8` prefixes. I updated it to the documented `fd20::/20` behavior.

## Review Notes
- The workspace did not have `gcloud` installed, so CLI syntax was verified against the official Google Cloud CLI reference pages rather than local `--help` output.
- The Terraform fields used in the corrected post match the current provider documentation as of 2026-04-30. If this repo later pins a substantially older Google provider version, the examples should be rechecked against that pinned version.
