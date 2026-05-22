# Validation Summary: How to Use zipmap to Create Dynamic Maps in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform `zipmap` function
- Terraform splat expressions and for expressions
- AWS Provider resources and data sources
- Amazon EC2, VPC, Elastic Load Balancing, and Route 53

## Sources Consulted
- HashiCorp Terraform `zipmap` function documentation: https://developer.hashicorp.com/terraform/language/functions/zipmap
- HashiCorp Terraform splat expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/splat
- HashiCorp Terraform for expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/for
- HashiCorp AWS Provider `aws_instances` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/instances
- HashiCorp AWS Provider `aws_availability_zones` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones
- HashiCorp AWS Provider `aws_lb` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb
- HashiCorp AWS Provider `aws_lb_target_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- HashiCorp AWS Provider `aws_route53_record` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- HashiCorp AWS Provider `aws_instance`, `aws_subnet`, and `aws_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The `aws_availability_zones` example used only `state = "available"`. Current AWS Provider documentation notes that Local Zones can be included when they are enabled in a region, and recommends filtering on `opt-in-status = opt-in-not-required` to return only standard Availability Zones. Added that filter to keep the AZ-to-subnet mapping example technically accurate.

## Review Notes
- The Terraform `zipmap` behavior described in the post is correct: keys and values must have the same length, keys must be strings, duplicate keys use the highest-index value, and values can be any type.
- The AWS examples are illustrative snippets and assume surrounding configuration such as provider setup, VPCs, variables, AMI IDs, and Route 53 zones.
- Terraform CLI was not available in the local environment, so examples were reviewed against official documentation rather than executed with `terraform validate`.
