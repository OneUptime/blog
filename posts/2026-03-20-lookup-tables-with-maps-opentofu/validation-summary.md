# Validation Summary: How to Use Lookup Tables with Maps in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu
- HCL (HashiCorp Configuration Language)
- OpenTofu collections and functions (`map`/`object`, `lookup`, `merge`, `keys`, `contains`)
- OpenTofu meta-arguments (`for_each`)
- Terraform AWS provider resources used as examples (`aws_instance`, `aws_vpc`, `aws_wafv2_web_acl_association`, `aws_s3_bucket`, `aws_s3_bucket_versioning`)

## Sources Consulted
- OpenTofu `lookup` function documentation: https://opentofu.org/docs/language/functions/lookup/
- OpenTofu `merge` function documentation: https://opentofu.org/docs/language/functions/merge/
- OpenTofu `contains` function documentation: https://opentofu.org/docs/language/functions/contains/
- OpenTofu `keys` function documentation: https://opentofu.org/docs/language/functions/keys/
- OpenTofu types and values documentation: https://opentofu.org/docs/language/expressions/types/
- OpenTofu type constraints documentation: https://opentofu.org/docs/language/expressions/type-constraints/
- OpenTofu `for_each` meta-argument documentation: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- Terraform AWS provider `aws_instance` documentation source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/instance.html.markdown
- Terraform AWS provider `aws_vpc` documentation source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/vpc.html.markdown
- Terraform AWS provider `aws_s3_bucket_versioning` documentation source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/s3_bucket_versioning.html.markdown
- Terraform AWS provider `aws_wafv2_web_acl_association` documentation source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/wafv2_web_acl_association.html.markdown

## Issues Found
No technical issues found.

## Review Notes
- The post's OpenTofu language claims are accurate: square-bracket indexing on map/object values, `lookup()` with a default, `merge()`, `keys()`, `contains()`, `object` type constraints, and `for_each` over maps all match the official documentation.
- The AWS resource snippets use current resource names and argument shapes that match the provider documentation reviewed above.
- The examples are illustrative partial configurations rather than full standalone modules, so readers would still need surrounding provider configuration and any referenced variables, data sources, or companion resources when adapting them directly.
