# Validation Summary: How to Set Up VPC Peering Across AWS Accounts with OpenTofu

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- OpenTofu (v1.6+)
- AWS VPC Peering
- AWS IAM (cross-account role assumption via `sts:AssumeRole`)
- HashiCorp Configuration Language (HCL)
- AWS Provider for Terraform/OpenTofu (multi-provider with `alias`)

## Sources Consulted
- AWS provider documentation for `aws_vpc_peering_connection`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_peering_connection
- AWS provider documentation for `aws_vpc_peering_connection_accepter`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_peering_connection_accepter
- AWS provider documentation for `aws_vpc_peering_connection_options`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_peering_connection_options
- AWS provider `aws_route` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route
- AWS provider `assume_role` block docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs#assume_role
- AWS documentation on cross-account VPC peering: https://docs.aws.amazon.com/vpc/latest/peering/create-vpc-peering-connection.html
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/commands/

## Issues Found
No technical issues found.

Verified:
- Provider configuration with `assume_role { role_arn = ... }` block is valid AWS provider syntax for cross-account access.
- `aws_vpc_peering_connection` attributes `vpc_id`, `peer_vpc_id`, `peer_owner_id`, `peer_region`, and `auto_accept` are all correct. Setting `auto_accept = false` is correct for cross-account peering — the accepter must explicitly accept.
- `aws_vpc_peering_connection_accepter` with `auto_accept = true` is the correct pattern.
- `aws_vpc_peering_connection_options` correctly splits the `requester` and `accepter` blocks across their respective providers, each referencing the same peering connection id. `depends_on` on the accepter resource is required because options can only be set after the connection is active.
- `aws_route` arguments `route_table_id`, `destination_cidr_block`, and `vpc_peering_connection_id` are valid.
- `data "aws_caller_identity"` is the correct data source for retrieving the current account ID.
- OpenTofu 1.6 was the first stable release (January 2024), so the `v1.6+` prerequisite is accurate.
- `tofu init/plan/apply` CLI commands are correct.
- The conclusion correctly notes that the accepter-side IAM role must trust the requester account (`sts:AssumeRole`) and that security group rules are not updated automatically.

## Review Notes
- `allow_remote_vpc_dns_resolution` is only effective for same-region VPC peering; cross-region VPC peering does not support DNS resolution of private hostnames across the peer. In the example both providers use `us-east-1`, so it is fine, but readers using `peer_region` for actual cross-region peering should be aware.
- Route tables in real deployments often have multiple associations per VPC (public/private/isolated subnets). The example shows a single route per side; operators should add routes to every relevant route table.
- The example hardcodes `TerraformPeeringRole` as the cross-account role name — users should parameterize this for their environment.
