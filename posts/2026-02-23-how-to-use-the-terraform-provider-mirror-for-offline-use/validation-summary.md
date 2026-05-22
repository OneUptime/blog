# Validation Summary: How to Use the Terraform Provider Mirror for Offline Use

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform provider installation configuration
- Terraform filesystem provider mirrors
- Terraform network provider mirrors
- Nginx
- AWS S3
- AWS CloudFront
- Docker
- GitHub Actions
- Bash

## Sources Consulted
- Terraform CLI configuration file documentation: https://developer.hashicorp.com/terraform/cli/config/config-file
- Terraform `providers mirror` command documentation: https://developer.hashicorp.com/terraform/cli/commands/providers/mirror
- Terraform provider network mirror protocol reference: https://developer.hashicorp.com/terraform/internals/provider-network-mirror-protocol
- Terraform providers overview: https://developer.hashicorp.com/terraform/language/providers
- AWS provider `aws_cloudfront_distribution` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- AWS provider `aws_cloudfront_origin_access_control` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_origin_access_control
- AWS provider `aws_cloudfront_cache_policy` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/cloudfront_cache_policy

## Issues Found
- The provider resolution section incorrectly described `.terraform/providers` as the first default filesystem cache checked before mirrors and the public registry. Updated it to match Terraform's documented behavior: providers are installed from origin registries by default, with implied local mirror directories only when present, and explicit installation methods available through CLI configuration.
- The air-gapped transfer commands archived a top-level `mirror/` directory and then extracted it under `/opt/terraform/providers/`, which would produce `/opt/terraform/providers/mirror/...` instead of the configured mirror root. Changed the tar command to archive the mirror contents and added `mkdir -p /opt/terraform/providers` before extraction.
- The CloudFront example used an undefined `aws_cloudfront_origin_access_identity.mirror` resource and the deprecated `forwarded_values` argument. Updated the snippet to use `aws_cloudfront_origin_access_control`, `origin_access_control_id`, and the AWS-managed `Managed-CachingOptimized` cache policy.
- The automation section said the script updates the mirror with "latest versions", but `terraform providers mirror` uses the dependency lock file by default when one exists. Updated the wording and script comment to say it mirrors the provider versions required by the Terraform projects.

## Review Notes
Terraform was not installed in the local environment, so CLI behavior was verified against official HashiCorp documentation rather than local `terraform --help` output. The Terraform Docker image tag `hashicorp/terraform:1.7.0` is older than current Terraform releases, but it is still a valid example tag rather than an incorrect command.
