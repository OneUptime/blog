# Validation Summary: How to Define Output Values in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL language, output blocks, modules)
- Terraform CLI (`terraform output` command, including `-raw` and `-json` flags)
- AWS Provider for Terraform (`aws_vpc`, `aws_instance`, `aws_lb`, `aws_db_instance`, `aws_subnet`, `aws_eip`, `aws_cloudfront_distribution`, `aws_s3_bucket`, `aws_region`, `aws_caller_identity`)
- Terraform expressions (splat, for, conditional, string interpolation)
- Terraform preconditions (1.2+)

## Sources Consulted
- HashiCorp Terraform `output` block documentation: https://developer.hashicorp.com/terraform/language/block/output
- HashiCorp Terraform CLI `output` command: https://developer.hashicorp.com/terraform/cli/commands/output
- HashiCorp Terraform splat expressions: https://developer.hashicorp.com/terraform/language/expressions/splat
- HashiCorp Terraform `for` expressions: https://developer.hashicorp.com/terraform/language/expressions/for
- AWS Provider `aws_db_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS Provider `aws_region` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/region
- AWS Provider v6.0.0 changelog / PR #42131 (deprecating `aws_region.name`)

## Issues Found
- **Deprecated attribute `data.aws_region.current.name`**: The `name` attribute on the `aws_region` data source was deprecated in AWS Provider v6.0.0 (released May 2025) in favor of `region`. Updated the example in the "Data Source Outputs" section to use `data.aws_region.current.region`.

## Review Notes
- The `precondition` block example uses `aws_db_instance.main.status == "available"`. The `status` attribute is indeed exported by the `aws_db_instance` resource, so this is technically valid.
- All `terraform output` CLI flags (`-raw`, `-json`) are current and correct.
- The splat (`[*]`) and `for_each` (`for k, v in ...`) expression syntax examples are correct.
- The minor markdown inconsistency in the "What You Can Output" section ("Resource Attributes" is missing `###` heading prefix while other subsections have it) is a formatting issue rather than a technical one, and was left unchanged per the scope of this review.
- The post mentions the `name` attribute deprecation is not flagged for older AWS provider versions (<6.0), but since this post is dated 2026, using the current recommended `region` attribute is appropriate.
