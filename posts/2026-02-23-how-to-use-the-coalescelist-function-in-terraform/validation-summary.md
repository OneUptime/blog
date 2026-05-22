# Validation Summary: How to Use the coalescelist Function in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform `coalescelist` and `coalesce` functions
- Terraform locals and conditional expressions
- AWS Terraform provider resources and data sources
- AWS Security Groups, Load Balancers, RDS Aurora clusters, CloudWatch alarms, and ECS services

## Sources Consulted
- HashiCorp Terraform `coalescelist` function documentation: https://developer.hashicorp.com/terraform/language/functions/coalescelist
- HashiCorp Terraform `coalesce` function documentation: https://developer.hashicorp.com/terraform/language/functions/coalesce
- HashiCorp Terraform locals block documentation: https://developer.hashicorp.com/terraform/language/block/locals
- HashiCorp Terraform conditional expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/conditionals
- HashiCorp AWS Provider `aws_subnets` data source documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/subnets.html.markdown
- HashiCorp AWS Provider `aws_lb` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lb.html.markdown
- HashiCorp AWS Provider `aws_rds_cluster` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/rds_cluster.html.markdown
- HashiCorp AWS Provider `aws_cloudwatch_metric_alarm` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_metric_alarm.html.markdown
- HashiCorp AWS Provider `aws_ecs_service` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service

## Issues Found
- The conditional-expression comparison snippets used `local.subnets = ...` as if it were valid top-level Terraform configuration. Changed those examples to use proper `locals { subnets = ... }` blocks, matching Terraform's locals syntax.
- The subnet fallback explanation said the load balancer would always have subnets. Clarified that this depends on the VPC having matching subnets, because `coalescelist` still errors if all candidate lists are empty.
- The section titled "Handling Tag Lists" described CloudWatch alarm action lists, not tags. Renamed the heading and introductory sentence to refer to alarm action lists.
- The all-empty-list error example included an exact-looking error message that was not present in the official function documentation. Changed it to a descriptive comment that accurately explains the failure without asserting a specific diagnostic string.

## Review Notes
Terraform was not installed in the local environment, so examples were reviewed against official HashiCorp documentation rather than executed with `terraform console` or `terraform validate`.
