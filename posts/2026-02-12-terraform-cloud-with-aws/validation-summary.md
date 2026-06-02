# Validation Summary: How to Use Terraform Cloud with AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS
- Terraform CLI
- Terraform Cloud / HCP Terraform
- Terraform AWS provider
- AWS IAM OIDC federation
- Sentinel policy as code
- Terraform private module registry

## Sources Consulted
- HashiCorp Terraform `terraform` block reference: https://developer.hashicorp.com/terraform/language/terraform
- HashiCorp Terraform login command reference: https://developer.hashicorp.com/terraform/cli/commands/login
- HCP Terraform plans and features: https://developer.hashicorp.com/terraform/cloud-docs/overview
- HCP Terraform UI and VCS-driven run workflow: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/ui
- HCP Terraform CLI-driven run workflow: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/cli
- HCP Terraform dynamic credentials for AWS: https://developer.hashicorp.com/terraform/cloud-docs/dynamic-provider-credentials/aws-configuration
- HashiCorp dynamic credentials tutorial: https://developer.hashicorp.com/terraform/tutorials/cloud/dynamic-credentials
- HCP Terraform cost estimation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/cost-estimation
- HCP Terraform run triggers: https://developer.hashicorp.com/terraform/enterprise/workspaces/settings/run-triggers
- HCP Terraform workspace permissions: https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/permissions/workspace
- HCP Terraform private module registry: https://developer.hashicorp.com/terraform/cloud-docs/registry
- HashiCorp private module registry tutorial: https://developer.hashicorp.com/terraform/tutorials/modules/module-private-registry-share
- Sentinel `tfplan/v2` import documentation: https://developer.hashicorp.com/sentinel/docs/features/terraform/tfplan-v2
- Sentinel language set operators and maps: https://developer.hashicorp.com/sentinel/docs/language/spec
- Terraform AWS provider latest documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform AWS provider S3 bucket documentation: https://registry.terraform.io/providers/hashicorp/aws/6.0.0/docs/resources/s3_bucket
- Terraform AWS provider S3 bucket encryption configuration documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Terraform AWS provider IAM OIDC provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider

## Issues Found
- The VCS workflow description said Terraform Cloud performs an automatic plan on PR and apply on merge. HCP Terraform performs speculative plans on pull requests and queues a standard run when commits are merged to the workspace branch; apply may require confirmation unless auto-apply is enabled. Updated the wording.
- The AWS provider version constraint used `~> 5.0`, while the current AWS provider major version is 6.x. Updated the example to `~> 6.0`.
- The AWS OIDC provider example used a hard-coded certificate thumbprint. Replaced it with the official `tls_certificate` data source pattern so the thumbprint is derived from the current HCP Terraform certificate.
- The S3 Sentinel policy checked `server_side_encryption_configuration` on `aws_s3_bucket`, which is deprecated in current AWS provider documentation. Updated the example to check `aws_s3_bucket_server_side_encryption_configuration` resources.
- The Sentinel code fences were marked as Python. Changed them to `sentinel`.
- The required-tags Sentinel policy only evaluated resources whose tags were already non-null, so it could miss taggable resources with null tags. Updated it to filter taggable planned resources and require non-null tags containing the required keys.
- The cost estimation section said cost estimation is enabled by default for paid plans and needs no configuration. Current HCP Terraform documentation says cost estimation is disabled by default and must be enabled in organization settings. Updated the section.

## Review Notes
- Terraform was not installed in the local workspace, so CLI command behavior was checked against official documentation rather than local `terraform --help` output.
- The post still uses the older "Terraform Cloud" name in prose, but HashiCorp's current documentation generally uses "HCP Terraform." This is a branding/versioning note rather than a functional correctness issue.
