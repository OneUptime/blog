# Validation Summary: How to Use the setunion Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform collection functions (`setunion`, `setintersection`, `setsubtract`, `concat`, `tolist`)
- Terraform `for_each`
- AWS provider resources and data sources

## Sources Consulted
- Terraform `setunion` function documentation: https://developer.hashicorp.com/terraform/language/functions/setunion
- Terraform `for_each` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform `tolist` function documentation: https://developer.hashicorp.com/terraform/language/functions/tolist
- Terraform types and values documentation: https://developer.hashicorp.com/terraform/language/expressions/types
- Terraform `concat` function documentation: https://developer.hashicorp.com/terraform/language/functions/concat
- Terraform `setintersection` function documentation: https://developer.hashicorp.com/terraform/language/functions/setintersection
- Terraform `setsubtract` function documentation: https://developer.hashicorp.com/terraform/language/functions/setsubtract
- AWS provider `aws_subnets` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnets
- AWS provider `aws_vpc_security_group_ingress_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- AWS provider `aws_s3_bucket` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket

## Issues Found
- The security group example used `aws_security_group_rule` with multiple CIDR blocks. Current AWS provider documentation recommends `aws_vpc_security_group_ingress_rule` for new security group rules, with one CIDR per rule. Updated the example to use `for_each` over the `setunion` result and create one `aws_vpc_security_group_ingress_rule` per CIDR.
- The S3 `for_each` example claimed to create buckets in each unique region, but the resource did not set a resource region. Updated the example to set `region = each.value` so the code matches the explanation for the current AWS provider.
- The edge-case section said strings and numbers cannot be mixed. Terraform can often convert primitive values to a common type, so that statement was too broad. Updated the wording to say values must be convertible to a common type and changed the error example to an incompatible object/string mix.

## Review Notes
Terraform was not installed in the local environment, so console examples were checked against official Terraform and AWS provider documentation rather than executed locally. The article does not pin Terraform or AWS provider versions; the review used the current official documentation available on 2026-05-22.
