# Validation Summary: How to Build a Container Registry Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Elastic Container Registry (ECR)
- AWS ECR lifecycle policies
- AWS ECR pull-through cache
- AWS ECR replication
- AWS ECR enhanced scanning with Amazon Inspector
- Amazon EventBridge
- Amazon SNS
- AWS IAM and GitHub Actions OIDC
- Docker / container images

## Sources Consulted
- Terraform AWS provider `aws_ecr_repository`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_repository
- Terraform AWS provider `aws_ecr_registry_scanning_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_registry_scanning_configuration
- AWS ECR image scanning documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html
- AWS ECR enhanced scanning documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning-enhanced.html
- AWS ECR lifecycle policy properties: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_parameters.html
- AWS ECR lifecycle policy examples: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_examples.html
- AWS ECR pull-through cache documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/pull-through-cache.html
- AWS ECR pull-through cache secret requirements: https://docs.aws.amazon.com/AmazonECR/latest/userguide/pull-through-cache-creating-secret.html
- AWS ECR pull-through cache rule creation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/pull-through-cache-creating-rule.html
- AWS ECR private replication documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/replication.html
- AWS ECR registry policy examples: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry-permissions-examples.html
- Amazon Inspector EventBridge schema: https://docs.aws.amazon.com/inspector/latest/user/eventbridge-integration.html
- Amazon EventBridge resource-based policy documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- GitHub Actions OIDC configuration for AWS: https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services

## Issues Found
- The repository module used repository-level `image_scanning_configuration.scan_on_push`. AWS documents the underlying repository-level image scanning configuration API as being deprecated in favor of registry-level scanning configuration. Removed the module variable and repository-level scanning block because the post already configures registry-level enhanced scanning.
- The ECR lifecycle policy used multiple values in a single `tagPrefixList` for release and development tags. AWS lifecycle policy matching requires images to match all listed tag prefixes/patterns in a single rule, so those rules would not match the intended individual prefixes. Changed the policy to generate one lifecycle rule per prefix.
- The GitHub Container Registry pull-through cache rule omitted `credential_arn`. AWS requires Secrets Manager credentials for GitHub Container Registry pull-through cache. Added a GitHub credentials secret and attached it to the GHCR rule.
- The EventBridge-to-SNS alerting example lacked an SNS topic policy allowing `events.amazonaws.com` to publish to the topic. Added an `aws_sns_topic_policy` with `sns:Publish` permission for EventBridge.
- The GitHub Actions OIDC role trust policy only constrained the `sub` claim. GitHub and AWS guidance recommends validating the token audience as well. Added the `token.actions.githubusercontent.com:aud = sts.amazonaws.com` condition.

## Review Notes
Terraform is not installed in the workspace, so I could not run `terraform validate`. The snippets were reviewed against official Terraform AWS provider, AWS ECR, Amazon Inspector, EventBridge, SNS, and GitHub Actions OIDC documentation.
