# Validation Summary: How to Create an ECR Repository with OpenTofu on AWS - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Provider for Terraform/OpenTofu
- Amazon ECR private repositories
- Amazon ECR Public
- AWS CLI
- Docker

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- AWS provider `aws_ecr_repository` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecr_repository.html.markdown
- AWS provider `aws_ecr_lifecycle_policy` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecr_lifecycle_policy.html.markdown
- AWS provider `aws_ecr_repository_policy` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecr_repository_policy.html.markdown
- AWS provider `aws_ecrpublic_repository` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ecrpublic_repository.html.markdown
- Amazon ECR lifecycle policy properties: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_parameters.html
- Amazon ECR private repository policies: https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-policies.html
- Amazon ECR private repository policy examples: https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-policy-examples.html
- AWS CLI `ecr get-login-password` reference: https://docs.aws.amazon.com/en_us/cli/latest/reference/ecr/get-login-password.html
- Amazon ECR Public catalog data: https://docs.aws.amazon.com/AmazonECR/latest/public/public-repository-catalog-data.html

## Issues Found
- Step 4 implied that a repository policy alone is sufficient for cross-account pulls. I added a clarification that the consuming IAM principal also needs an IAM policy allowing `ecr:GetAuthorizationToken`, because AWS requires that permission before authenticating to any private ECR registry.
- Step 7 hard-coded `us-east-1` for `aws ecr get-login-password` while logging in to a private ECR repository created in `var.aws_region`. AWS CLI documentation requires using the same Region as the target private registry, so I updated the example to derive the registry hostname and Region from the `repository_url` output before running `docker login`.

## Review Notes
- The HCL resource syntax is valid for the AWS provider version range pinned in the post (`~> 5.0`), though newer provider major versions exist as of 2026-05-01.
- The repository-level `image_scanning_configuration` shown in the post is valid for enabling scan-on-push behavior, but Amazon ECR also supports enhanced scanning with registry-level configuration through Amazon Inspector.
