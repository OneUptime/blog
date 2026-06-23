# Validation Summary: How to Deploy to Multiple AWS Accounts with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS IAM and STS AssumeRole
- Amazon S3 Terraform backend
- Amazon ECR
- Amazon ECS task definitions
- AWS VPC peering
- Terragrunt

## Sources Consulted
- HashiCorp Terraform provider block reference: https://developer.hashicorp.com/terraform/language/block/provider
- HashiCorp Terraform providers within modules documentation: https://developer.hashicorp.com/terraform/language/modules/develop/providers
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp AWS provider documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/index.html.markdown
- HashiCorp AWS provider `aws_vpc_peering_connection` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc_peering_connection.html.markdown
- HashiCorp AWS provider `aws_vpc_peering_connection_accepter` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc_peering_connection_accepter.html.markdown
- HashiCorp AWS provider `aws_ecr_repository` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecr_repository.html.markdown
- HashiCorp AWS provider `aws_ecr_repository_policy` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecr_repository_policy.html.markdown
- AWS IAM external ID documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_third-party.html
- AWS STS AssumeRole API documentation: https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html
- Amazon ECR repository policy documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-policies.html
- Amazon ECR image scanning documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html
- Terragrunt remote state backend documentation: https://docs.terragrunt.com/features/units/state-backend/

## Issues Found
- Updated AWS provider version constraints from `~> 5.0` to `~> 6.0` to match the current official AWS provider examples.
- Renamed "Dynamic Provider Configuration" to "Parameterized Provider Configuration" and adjusted the description, because Terraform provider blocks are statically declared even when their arguments use variables.
- Replaced deprecated S3 backend `dynamodb_table` locking examples with `use_lockfile = true`, which is the current Terraform-recommended S3 state locking mechanism.
- Added the missing provider mapping in the separate-state module example so the earlier module using `configuration_aliases = [aws.target]` receives `aws.target = aws`.
- Added a note that target-account ECS task execution roles still need `ecr:GetAuthorizationToken` IAM permission for cross-account ECR pulls.
- Replaced an undeclared `aws_vpc.shared.id` reference in the VPC peering example with `var.shared_vpc_id`, so the snippet no longer references a resource that is not defined in the post.

## Review Notes
Terraform was not installed in the review environment, so `terraform fmt` and `terraform validate` could not be run locally. The HCL snippets were reviewed manually against official Terraform, AWS provider, AWS, and Terragrunt documentation.
