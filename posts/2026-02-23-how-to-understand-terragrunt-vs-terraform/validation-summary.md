# Validation Summary: How to Understand Terragrunt vs Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- Terragrunt
- OpenTofu
- HCL
- AWS provider
- AWS S3 backend
- Infrastructure as Code

## Sources Consulted
- HashiCorp Terraform intro: https://developer.hashicorp.com/terraform/intro
- Terraform resource configuration documentation: https://developer.hashicorp.com/terraform/language/resources
- Terraform apply command reference: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform AWS provider `aws_s3_bucket` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Terragrunt HCL blocks reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt run command reference: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt CLI redesign migration guide: https://docs.terragrunt.com/migrate/cli-redesign/
- Terragrunt root configuration migration guide: https://docs.terragrunt.com/migrate/migrating-from-root-terragrunt-hcl/
- HashiCorp licensing FAQ: https://www.hashicorp.com/en/license-faq
- Linked OneUptime Terragrunt article: https://oneuptime.com/blog/post/2026-02-23-how-to-create-your-first-terragrunt-configuration/view

## Issues Found
- The post described Terraform as open source. Current HashiCorp Terraform releases are under the Business Source License, so I changed the description to "an IaC tool built by HashiCorp."
- The post described Terragrunt only as a Terraform wrapper. Current Terragrunt documentation describes orchestration for Terraform and OpenTofu, so I updated the relevant wording.
- The Terragrunt root configuration examples used a root `terragrunt.hcl` file and bare `find_in_parent_folders()`. Current Terragrunt guidance recommends naming shared root config something like `root.hcl` and referencing it explicitly, so I updated those snippets.
- The post used `terragrunt run-all apply`. Current Terragrunt documentation says `run-all` is deprecated in favor of `terragrunt run --all apply`, so I updated the command.
- The post said Terraform can only operate on one module at a time. Terraform can manage many child modules inside a root module, so I clarified that the CLI normally operates on one root module, working directory, and state at a time.

## Review Notes
The remaining Terraform and Terragrunt examples are syntactically plausible HCL. The sample AWS resource assumes a globally unique S3 bucket name and valid AWS credentials, which is normal for illustrative Terraform snippets.
