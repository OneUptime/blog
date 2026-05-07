# Validation Summary: How to Avoid Overusing Locals in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider resources (`aws_vpc`, `aws_subnet`, `aws_internet_gateway`, `aws_s3_bucket`)

## Sources Consulted
- OpenTofu Local Values: https://opentofu.org/docs/language/values/locals/
- OpenTofu Strings and Templates: https://opentofu.org/docs/language/expressions/strings/
- OpenTofu For Expressions: https://opentofu.org/docs/language/expressions/for/
- OpenTofu Conditional Expressions: https://opentofu.org/docs/language/expressions/conditionals/
- OpenTofu `merge` function: https://opentofu.org/docs/v1.8/language/functions/merge/
- Terraform AWS Provider `aws_vpc` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc.html.markdown
- Terraform AWS Provider `aws_subnet` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/subnet.html.markdown
- Terraform AWS Provider `aws_internet_gateway` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/internet_gateway.html.markdown
- Terraform AWS Provider `aws_s3_bucket` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket.html.markdown

## Issues Found
- Several AWS resource examples were not valid as written because they omitted required arguments. I added `cidr_block` to the VPC examples, `vpc_id` and `cidr_block` to the subnet example, and replaced the tags-only EC2 instance example with a valid `aws_internet_gateway` example so the repeated-tags pattern remains correct and runnable.
- The single-use-local comparison used `resource "aws_vpc" "main"` twice within one code block, which makes the combined snippet invalid. I renamed the second resource label to keep the comparison valid in one fenced example.
- The guideline claiming locals are useful when “a computation is expensive and should happen once” was not supported by the OpenTofu locals documentation and could imply a performance guarantee the docs do not make. I rephrased it to a clarity/reuse-oriented guideline.
- The refactoring example kept `all_tags` but did not apply it anywhere. I added `tags = local.all_tags` so the example matches the explanation.

## Review Notes
- OpenTofu’s locals guidance supports using locals to avoid repeating expressions and to centralize values that are reused and likely to change, while warning that overuse can hurt readability.
- Current AWS provider documentation now includes a resource-level `region` argument for the resources used here, so the post’s direct `region = var.aws_region` examples are valid against the latest provider docs.
