# Validation Summary: How to Use Terraform Data Sources to Reference Existing AWS Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform data sources
- Terraform remote state data source
- AWS provider for Terraform
- AWS VPC, subnet, AMI, IAM, Route 53, ACM, Secrets Manager, SSM Parameter Store, and Availability Zone data sources

## Sources Consulted
- Terraform language data sources documentation: https://developer.hashicorp.com/terraform/language/data-sources
- Terraform `terraform_remote_state` data source documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- AWS provider `aws_vpc` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/vpc
- AWS provider `aws_subnets` and `aws_subnet` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnets and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnet
- AWS provider `aws_ami` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- AWS provider `aws_caller_identity`, `aws_region`, and `aws_availability_zones` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/region, and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones
- AWS provider Secrets Manager and SSM Parameter Store data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_secret, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_secret_version, and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter
- AWS provider Route 53, ACM, and IAM policy data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/route53_zone, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/acm_certificate, and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy

## Issues Found
- The current-region example used `data.aws_region.current.name`. In the current AWS provider documentation, `name` is deprecated for `aws_region`; the region name is exported as `id`. Changed the example to use `data.aws_region.current.id`.
- The best-practices section stated that data source values are always resolved during `terraform plan` and that a data source cannot be used to find a resource created in the same configuration. Terraform normally reads data sources during plan when inputs are known, but it can defer reads until apply if inputs are unknown. Updated the explanation and recommended direct resource references for resources managed in the same configuration.

## Review Notes
- The remaining Terraform snippets use documented AWS provider data sources and arguments.
- The warning that Secrets Manager and SSM Parameter Store values can end up in Terraform state is accurate; the SSM Parameter Store documentation specifically warns that decrypted `SecureString` values are stored in raw state as plain text.
- The `terraform_remote_state` example is syntactically valid, but Terraform's documentation notes that consumers of remote state need access to the full state snapshot, so dedicated data-publishing mechanisms are preferable when sensitive data is a concern.
