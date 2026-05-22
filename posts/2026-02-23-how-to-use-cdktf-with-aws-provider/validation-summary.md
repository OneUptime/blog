# Validation Summary: How to Use CDKTF with AWS Provider

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CDK for Terraform (CDKTF)
- Terraform AWS provider
- TypeScript
- AWS CLI credentials and SSO
- AWS VPC, EC2, S3, RDS, and IAM

## Sources Consulted
- HashiCorp CDKTF Providers documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/providers
- CDKTF CLI help output for `cdktf init`, `cdktf synth`, `cdktf diff`, `cdktf deploy`, and `cdktf destroy` using the latest CLI
- `@cdktf/provider-aws` package declarations for version 21.22.1 from npm
- Terraform AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform AWS provider `aws_s3_bucket_lifecycle_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- Terraform AWS provider `aws_s3_bucket_server_side_encryption_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Terraform AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS CLI IAM Identity Center / SSO documentation: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html

## Issues Found
- CDKTF is deprecated as of December 10, 2025 according to HashiCorp's official documentation. Updated the introduction and conclusion so the post no longer presents CDKTF as an unqualified current recommendation for new projects.
- The AWS SSO example logged in with a named profile but did not select that profile for Terraform/CDKTF. Added `export AWS_PROFILE="your-profile"` after `aws sso login --profile your-profile`.
- The TypeScript snippets included unused imports (`App`, `NatGateway`, `Eip`, and `KeyPair`). Current CDKTF TypeScript templates enable `noUnusedLocals`, so these would fail compilation in a standard project. Removed the unused imports.
- The VPC snippet created `privateSubnet` but did not use it. Added `privateSubnetIds` collection and pushed each private subnet ID so the later RDS subnet group example has a defined input and the snippet avoids an unused local.
- The S3 lifecycle rule omitted `filter`. The current AWS provider recommends specifying `filter`, and an empty filter explicitly applies the lifecycle rule to all objects. Added `filter: [{}]`.

## Review Notes
- The examples are still partial snippets and assume surrounding stack context for variables such as `vpc`, `publicSubnet`, `privateSubnetIds`, `dbSg`, and `bucket`.
- The RDS password remains a placeholder. A real deployment should pass this through a secret mechanism rather than hardcoding it in source.
- Example S3 bucket names must be replaced with globally unique bucket names before deployment.
