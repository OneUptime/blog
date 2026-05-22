# Validation Summary: How to Use the format Function for Dynamic Resource Names

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform configuration language
- Terraform `format` and `formatlist` functions
- Terraform `count` and `for_each` meta-arguments
- AWS resource naming, including Amazon S3 bucket names
- Azure Storage account naming

## Sources Consulted
- HashiCorp Terraform `format` function documentation: https://developer.hashicorp.com/terraform/language/functions/format
- HashiCorp Terraform `formatlist` function documentation: https://developer.hashicorp.com/terraform/language/functions/formatlist
- HashiCorp Terraform `substr` function documentation: https://developer.hashicorp.com/terraform/language/functions/substr
- HashiCorp Terraform `for_each` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Amazon S3 general purpose bucket naming rules: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
- Azure Storage account overview and naming rules: https://learn.microsoft.com/en-us/azure/storage/common/storage-account-overview

## Issues Found
- The S3 bucket naming section described bucket names as globally unique. AWS currently documents general purpose bucket names in the shared global namespace as unique across all AWS accounts in all Regions within a partition, with optional account regional namespace behavior. Updated the wording to match the current official terminology.
- The naming module example said the `subnet` output returned a "function-like value using a template." Terraform outputs return values, not callable function-like values. Updated the comment to describe it as a fixed subnet name using the shared base.

## Review Notes
Terraform was not installed in the local environment, so examples were reviewed against official documentation rather than executed with `terraform validate`. The snippets rely on surrounding variables, providers, data sources, and resources that are intentionally omitted for brevity.
