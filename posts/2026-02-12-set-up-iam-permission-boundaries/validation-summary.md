# Validation Summary: How to Set Up IAM Permission Boundaries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IAM
- IAM permissions boundaries
- AWS CLI
- Terraform AWS provider
- AWS Organizations SCPs

## Sources Consulted
- AWS IAM User Guide: Permissions boundaries for IAM entities - https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html
- AWS IAM User Guide: IAM and AWS STS condition context keys - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_iam-condition-keys.html
- AWS CLI Command Reference: iam create-role - https://docs.aws.amazon.com/cli/latest/reference/iam/create-role.html
- AWS IAM User Guide: Use PutUserPermissionsBoundary with a CLI - https://docs.aws.amazon.com/IAM/latest/UserGuide/iam_example_iam_PutUserPermissionsBoundary_section.html
- AWS IAM API Reference: PutRolePermissionsBoundary - https://docs.aws.amazon.com/IAM/latest/APIReference/API_PutRolePermissionsBoundary.html
- AWS IAM User Guide: Create IAM policies with AWS CLI - https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_create-cli.html
- HashiCorp Terraform AWS provider docs: aws_iam_policy - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy
- HashiCorp Terraform AWS provider docs: aws_iam_user - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user
- HashiCorp Terraform AWS provider docs: aws_caller_identity - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity
- HashiCorp Terraform docs: jsonencode - https://developer.hashicorp.com/terraform/language/functions/jsonencode

## Issues Found
- The opening privilege-escalation example implied `iam:CreateRole` alone is enough to escalate. Updated it to include the additional permissions typically needed, such as `iam:AttachRolePolicy` and `iam:PassRole`.
- The post stated that permission boundaries do not explicitly deny actions. Updated this to clarify that omitted actions are implicitly denied, but boundary policies can still include explicit deny statements.
- The first boundary policy was later attached to `alice`, but it did not allow the bounded role-management actions the delegation policy grants. Added bounded IAM role-management and pass-role permissions to the boundary so the example works as described.
- The delegation policy allowed attaching or editing role policies on any `app-*` role, including a pre-existing unbounded role. Added an `iam:PermissionsBoundary` condition so policy management only applies to roles with the approved boundary.
- The boundary removal deny combined `DeleteRolePermissionsBoundary` and `PutRolePermissionsBoundary` under a condition that would not reliably prevent boundary deletion. Split it into an unconditional delete-boundary deny and a conditional replacement deny.
- The Terraform boundary policy referenced `aws_iam_policy.developer_boundary.arn` inside the same resource's `policy`, which would create a self-reference dependency cycle. Added `aws_caller_identity` and a local ARN string to avoid the cycle.
- Several explanations described permission boundaries as a universal ceiling on all permissions. Updated the wording to match AWS documentation: permissions boundaries limit what identity-based policies can grant, with resource-based policy caveats.

## Review Notes
- JSON policy snippets were syntax-checked locally and parsed successfully.
- AWS CLI and Terraform executables were not installed in the local environment, so command and resource validation was performed against official AWS and HashiCorp documentation.
