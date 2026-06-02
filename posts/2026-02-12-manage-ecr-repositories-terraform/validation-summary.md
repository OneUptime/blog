# Validation Summary: How to Manage ECR Repositories with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Elastic Container Registry (ECR)
- Terraform AWS provider
- Docker CLI
- AWS CLI
- AWS IAM
- Amazon Inspector
- AWS Secrets Manager

## Sources Consulted
- Terraform AWS provider documentation for `aws_ecr_repository`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_repository
- Terraform AWS provider documentation for `aws_ecr_lifecycle_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_lifecycle_policy
- Terraform AWS provider documentation for `aws_ecr_replication_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_replication_configuration
- Terraform AWS provider documentation for `aws_ecr_registry_scanning_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_registry_scanning_configuration
- Terraform AWS provider documentation for `aws_ecr_pull_through_cache_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_pull_through_cache_rule
- Amazon ECR lifecycle policy properties: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_parameters.html
- Amazon ECR lifecycle policy examples: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_examples.html
- Amazon ECR image scanning documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html
- Amazon ECR private image replication documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/replication.html
- Amazon ECR pull-through cache documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/pull-through-cache.html
- Amazon ECR Docker Hub pull-through cache rule documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/pull-through-cache-creating-rule.html
- AWS CLI ECR examples for `get-login-password`: https://docs.aws.amazon.com/cli/latest/userguide/cli_ecr_code_examples.html
- Docker CLI documentation for image tagging and pushing: https://docs.docker.com/engine/reference/commandline/tag/ and https://docs.docker.com/engine/reference/commandline/image_push/

## Issues Found
- The lifecycle policy prose said it kept the 20 most recent tagged images, but the rule only applies to tags with the `v` prefix and also includes a final `any` rule. Updated the lead-in and rule description so they accurately describe the policy.
- The lifecycle policy evaluation notes implied an image stops being evaluated after the first matching rule. Updated the wording to match Amazon ECR's rule-priority behavior, including the requirement that `tagStatus = "any"` rules have the highest priority value and are evaluated last.
- The replication example referenced `data.aws_caller_identity.current.account_id` without declaring the data source. Added the `data "aws_caller_identity" "current" {}` block so the snippet is self-contained.
- The enhanced scanning section said ECR basic scanning uses Clair. Current AWS documentation says basic scanning uses AWS native scanning technology with CVE data. Updated the statement.
- The Docker Hub pull-through cache Terraform example omitted `credential_arn`. AWS documentation requires a Secrets Manager secret for Docker Hub pull-through cache rules. Added a placeholder `credential_arn` and updated the explanatory text and pull example to use the full ECR registry URI.

## Review Notes
The repository-level `image_scanning_configuration.scan_on_push` examples still match the Terraform AWS provider schema. For broader registry-wide scanning configuration, the post's enhanced scanning section correctly uses `aws_ecr_registry_scanning_configuration`.
