# Validation Summary: How to Set Up VPC Peering with OpenTofu on AWS - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- OpenTofu (v1.6+)
- AWS VPC Peering
- HashiCorp AWS provider (Terraform/OpenTofu)
- HCL (HashiCorp Configuration Language)
- AWS networking (VPC, route tables, DNS resolution)

## Sources Consulted
- HashiCorp AWS provider documentation for `aws_vpc_peering_connection` (https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/vpc_peering_connection.html.markdown)
- HashiCorp AWS provider documentation for `aws_vpc_peering_connection_options` (https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/vpc_peering_connection_options.html.markdown)
- HashiCorp AWS provider documentation for `aws_vpc_peering_connection_accepter`
- HashiCorp AWS provider documentation for `aws_route`
- AWS VPC Peering documentation (concepts and constraints)
- OpenTofu CLI documentation (`tofu init`, `tofu plan`, `tofu apply`)

## Issues Found
No technical issues found. Verified items:
- `aws_vpc_peering_connection` resource arguments (`vpc_id`, `peer_vpc_id`, `peer_region`, `auto_accept`, `tags`) are all correct.
- `accept_status` is a valid exported attribute used correctly in the output.
- `aws_vpc_peering_connection_accepter` resource and `vpc_peering_connection_id`/`auto_accept` arguments match the provider docs.
- `aws_vpc_peering_connection_options` with `requester` / `accepter` blocks and the `allow_remote_vpc_dns_resolution` attribute name match official docs exactly.
- `aws_route` arguments (`route_table_id`, `destination_cidr_block`, `vpc_peering_connection_id`) are correct.
- Provider alias usage and cross-account/cross-region pattern with two providers is the canonical approach.
- OpenTofu CLI commands (`tofu init`, `tofu plan`, `tofu apply`) are correct.
- Statement that VPC peering is non-transitive matches AWS documentation; AWS Transit Gateway is correctly recommended for hub-and-spoke topologies.

## Review Notes
- The `auto_accept = var.same_account ? true : false` logic only works correctly when the peering is both same-account AND same-region. AWS requires `auto_accept = false` for any cross-region peering even within a single account; in that case the `aws_vpc_peering_connection_accepter` resource (or manual acceptance) is required. The post's pattern is fine for the common same-account same-region case but may surprise readers configuring same-account cross-region peering.
- For cross-account peering, applying `aws_vpc_peering_connection_options.accepter` may need an implicit/explicit dependency on `aws_vpc_peering_connection_accepter.peer` since options can only be set after the connection is in `active` state. Not strictly an error since Terraform/OpenTofu often resolves this via reference graph, but a `depends_on` would be more robust.
- Both VPCs must have `enable_dns_hostnames` and `enable_dns_support` enabled for `allow_remote_vpc_dns_resolution` to function — not stated in the post but a useful prerequisite.
- No AWS provider version constraint is pinned; readers may want to add a `required_providers` block for reproducibility.
