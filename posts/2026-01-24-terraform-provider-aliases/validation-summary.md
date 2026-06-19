# Validation Summary: How to Use Provider Aliases in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform provider aliases
- Terraform provider and providers meta-arguments
- Terraform modules and configuration_aliases
- AWS provider
- AWS S3 replication resources
- AWS IAM role assumption
- Google Cloud provider
- AzureRM provider

## Sources Consulted
- Terraform provider block reference: https://developer.hashicorp.com/terraform/language/block/provider
- Terraform resource block reference: https://developer.hashicorp.com/terraform/language/block/resource
- Terraform providers meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/providers
- Terraform providers within modules: https://developer.hashicorp.com/terraform/language/modules/develop/providers
- AWS Prescriptive Guidance, Terraform provider aliases and assume_role examples: https://docs.aws.amazon.com/prescriptive-guidance/latest/getting-started-terraform/providers.html
- AWS Prescriptive Guidance, Terraform AWS provider best practices: https://docs.aws.amazon.com/prescriptive-guidance/latest/terraform-aws-provider-best-practices/overview.html
- Terraform AWS provider aws_s3_bucket_replication_configuration documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_replication_configuration
- Terraform AzureRM provider documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs
- Terraform Google provider documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs
- Author GitHub profile link: https://github.com/nawazdhandala

## Issues Found
- The S3 replication module example referenced `aws_s3_bucket_versioning.source` and `aws_iam_role.replication` without defining them. Added source and destination bucket versioning, an IAM replication role, an IAM role policy, and an explicit dependency on those prerequisites so the snippet matches the resource requirements for S3 replication.
- The Dynamic Provider Selection section said to use `for_each` with modules to deploy to multiple regions, but Terraform provider configuration references are static and the example used separate module blocks. Updated the text to say to define separate module blocks for each provider configuration.
- The best-practices section said resources in different regions cannot reference each other directly. Terraform can reference values across provider configurations, but cloud services often need service-specific cross-region configuration. Updated the wording accordingly.

## Review Notes
Terraform CLI is not installed in the local environment, so I could not run `terraform validate`. The review was performed against official Terraform, AWS, AzureRM, and Google provider documentation.
