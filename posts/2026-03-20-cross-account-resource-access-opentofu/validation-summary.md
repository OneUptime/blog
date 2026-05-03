# Validation Summary: How to Set Up Cross-Account Resource Access with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (and the Terraform AWS provider, which OpenTofu uses)
- AWS IAM (role assumption, trust policies, external IDs)
- AWS STS (`sts:AssumeRole`)
- AWS VPC and VPC Peering (cross-account)
- AWS ECS (referenced as an example resource)
- HCL (HashiCorp Configuration Language) provider aliases

## Sources Consulted
- OpenTofu AWS provider docs / Terraform AWS provider `assume_role` configuration: https://registry.terraform.io/providers/hashicorp/aws/latest/docs#assume_role
- AWS IAM trust policy syntax (`Principal`, `Action`, `Condition`/`sts:ExternalId`): https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html
- AWS STS AssumeRole documentation: https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html
- AWS VPC sizing limits (CIDR must be between /16 and /28): https://docs.aws.amazon.com/vpc/latest/userguide/configure-your-vpc.html
- AWS VPC Peering cross-account workflow (requester `auto_accept = false`, accepter resource): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_peering_connection
- `aws_vpc_peering_connection_accepter` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_peering_connection_accepter
- `aws_iam_role` and `aws_iam_role_policy` resource docs

## Issues Found

1. **Invalid AWS VPC CIDR block (`10.0.0.0/8`)** — AWS VPC IPv4 CIDR blocks must be between `/16` and `/28`. A `/8` block would be rejected by the AWS API at apply time. Changed `cidr_block = "10.0.0.0/8"` to `cidr_block = "10.0.0.0/16"` for `aws_vpc.shared`.

2. **Broken resource reference (`aws_vpc.prod_app.id`)** — The "Deploying Cross-Account Resources" snippet defined `aws_ecs_cluster "prod_app"` (an ECS cluster, which has no `vpc_id` attribute meaningful for VPC peering), but the subsequent `aws_vpc_peering_connection` resource referenced `aws_vpc.prod_app.id`. This would fail OpenTofu validation (undeclared resource). Replaced the ECS cluster with an `aws_vpc "prod_app"` resource (CIDR `10.1.0.0/16`, non-overlapping with the shared VPC) so the peering example references a real, declared VPC. The peering example is the focus of that section, so making the prod-side resource a VPC keeps the snippet self-consistent.

## Review Notes

- The `assume_role` block fields used (`role_arn`, `session_name`, `external_id`) are valid for the current AWS provider.
- The cross-account VPC peering pattern (requester with `auto_accept = false` plus an `aws_vpc_peering_connection_accepter` resource on the peer-account provider with `auto_accept = true`) is correct and matches AWS provider documentation.
- The trust policy structure (`Principal.AWS`, `sts:AssumeRole`, `Condition.StringEquals."sts:ExternalId"`) is correct.
- The snippet uses both `var.external_id` in the provider and `var.external_id` in the trust policy — these must match in real deployments. The post does not state this explicitly but the symmetry is implied.
- Author may want to also note that route tables on each side of the peering must be updated for traffic to actually flow; that is outside the scope of the post but worth flagging in a follow-up.
