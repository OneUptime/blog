# Validation Summary: How to Use the one Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform collection functions
- Terraform splat expressions
- Terraform `count` meta-argument
- AWS provider resources and data sources

## Sources Consulted
- HashiCorp Terraform `one` function documentation: https://developer.hashicorp.com/terraform/language/functions/one
- HashiCorp Terraform built-in functions documentation: https://developer.hashicorp.com/terraform/language/functions
- HashiCorp Terraform splat expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/splat
- HashiCorp Terraform `count` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- HashiCorp Terraform `try` function documentation: https://developer.hashicorp.com/terraform/language/functions/try
- HashiCorp AWS provider `aws_subnets` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnets
- HashiCorp AWS provider `aws_subnet` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnet
- HashiCorp AWS provider `aws_elasticache_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_cluster
- HashiCorp AWS provider `aws_lb_listener` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_listener

## Issues Found
- The post stated that the `one` function was introduced in Terraform 1.0. HashiCorp documents it as available in Terraform v0.15 and later, so the version note was corrected.
- The filtered data source example referenced `data.aws_subnet.all`, which was not declared and would not work as written. The example now uses the current `aws_subnets` data source and applies `one` to its `ids` attribute.

## Review Notes
Terraform was not installed in the local workspace, so validation was performed against official HashiCorp Terraform and AWS provider documentation rather than by running `terraform console` or `terraform validate`.
