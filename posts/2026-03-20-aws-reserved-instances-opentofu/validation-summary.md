# Validation Summary: How to Manage AWS Reserved Instances with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- AWS Provider for Terraform/OpenTofu
- Amazon RDS Reserved DB Instances
- Amazon ElastiCache Reserved Nodes
- Amazon OpenSearch Service
- Amazon EC2 Capacity Reservations
- AWS Budgets
- AWS Savings Plans

## Sources Consulted
- AWS provider docs: `aws_rds_reserved_instance` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_reserved_instance
- AWS provider docs: `aws_rds_reserved_instance_offering` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/rds_reserved_instance_offering
- AWS provider docs: `aws_elasticache_reserved_cache_node` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_reserved_cache_node
- AWS provider docs: `aws_elasticache_reserved_cache_node_offering` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/elasticache_reserved_cache_node_offering
- AWS provider docs: `aws_ec2_capacity_reservation` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_capacity_reservation
- AWS provider docs: `aws_budgets_budget` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- AWS provider docs: `aws_opensearch_domain` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/opensearch_domain
- AWS provider source docs tree review for supported resources/data sources - https://github.com/hashicorp/terraform-provider-aws/tree/main/website/docs
- Amazon RDS User Guide: Reserved DB instances for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithReservedDBInstances.html
- Amazon ElastiCache User Guide: Reserved nodes - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheNodes.Reserved.html
- Amazon OpenSearch Service Developer Guide: Reserved Instances in Amazon OpenSearch Service - https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/aes-ri.html
- Amazon OpenSearch Service Developer Guide: Purchasing Reserved Instances (AWS CLI) - https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ri-cli.html
- AWS Savings Plans User Guide: Savings Plans types - https://docs.aws.amazon.com/savingsplans/latest/userguide/plan-types.html

## Issues Found
- The RDS example used `reserved_instance_id`, but the documented argument on `aws_rds_reserved_instance` is `reservation_id`. I changed the field name so the resource matches the provider schema.
- The ElastiCache offering example used `duration = "1yr"`, but the documented format is RFC3339 duration such as `P1Y`. I updated the duration value accordingly.
- The ElastiCache reservation example used `reserved_cache_node_id`, but the documented optional identifier argument is `id`. I replaced it with `id` to match the provider resource.
- The OpenSearch section referenced `aws_opensearch_reserved_instance` and `aws_opensearch_reserved_instance_offering`, which are not documented resources/data sources in the official AWS provider docs. I removed the unsupported OpenTofu code and replaced it with an accurate note that OpenSearch RI purchases must be done through AWS console/CLI/SDK while `aws_opensearch_domain` can still manage the domain itself.
- The RI utilization budget example omitted the documented `cost_types` block required for `RI_UTILIZATION` budgets because the defaults conflict with RI budget behavior. I added the required `cost_types` configuration and normalized the utilization limit to `100.0`.
- The introductory and concluding guidance was outdated because AWS now documents `Database Savings Plans` for services including RDS, ElastiCache, and Amazon OpenSearch Service. I updated those sections to avoid claiming that Savings Plans only apply to EC2 compute.
- The conclusion said to match reserved instance classes exactly, but that is too broad. AWS documents size-flexible matching for supported RDS and ElastiCache families, while OpenSearch RIs apply to the exact instance type. I corrected the matching guidance.

## Review Notes
- Availability of specific RI offerings and payment options can vary by Region, engine, and instance family, so real deployments may need to adjust the example offering filters.
- EC2 Capacity Reservations are technically a separate capacity-assurance feature, not an RI purchase model, but the example itself is valid as written.
