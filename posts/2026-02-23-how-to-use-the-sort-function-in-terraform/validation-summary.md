# Validation Summary: How to Use the sort Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform collection functions
- Terraform string and type conversion functions
- AWS provider resources and data sources

## Sources Consulted
- Terraform `sort` function documentation: https://developer.hashicorp.com/terraform/language/functions/sort
- Terraform `keys` function documentation: https://developer.hashicorp.com/terraform/language/functions/keys
- Terraform `distinct` function documentation: https://developer.hashicorp.com/terraform/language/functions/distinct
- Terraform `concat` function documentation: https://developer.hashicorp.com/terraform/language/functions/concat
- Terraform `join` function documentation: https://developer.hashicorp.com/terraform/language/functions/join
- Terraform `slice` function documentation: https://developer.hashicorp.com/terraform/language/functions/slice
- Terraform `format` function documentation: https://developer.hashicorp.com/terraform/language/functions/format
- Terraform `trimprefix` function documentation: https://developer.hashicorp.com/terraform/language/functions/trimprefix
- Terraform `tonumber` function documentation: https://developer.hashicorp.com/terraform/language/functions/tonumber
- Terraform `tostring` function documentation: https://developer.hashicorp.com/terraform/language/functions/tostring
- Terraform `lower` function documentation: https://developer.hashicorp.com/terraform/language/functions/lower
- AWS provider `aws_subnets` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnets
- AWS provider `aws_acm_certificate` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate
- HashiCorp Terraform AWS RDS tutorial for `aws_db_subnet_group` usage: https://developer.hashicorp.com/terraform/tutorials/aws/aws-rds

## Issues Found
- The post described lexicographic ordering in terms of the ASCII table. Terraform's official `sort` documentation specifies ordering by Unicode code points, so the wording was updated to match Terraform's behavior.
- The `sort(keys(...))` example implied that `sort` is needed for map keys. Terraform's `keys` function already returns keys in lexicographical order, so a clarifying comment was added while keeping the example intact.
- The number-string padding example used `trimprefix(p, "0")` to remove padding. `trimprefix` removes the prefix only once, so values such as `"00022"` would become `"0022"` rather than `"22"`. The example now uses `tostring(tonumber(p))` to remove all zero padding for decimal number strings.

## Review Notes
Terraform CLI was not installed in the local environment, so examples were validated against official Terraform and AWS provider documentation rather than by running `terraform console` or `terraform validate`.
