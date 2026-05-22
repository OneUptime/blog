# Validation Summary: How to Use Terraform for Multi-Region Active-Active Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS Route 53 latency-based routing and health checks
- AWS Elastic Load Balancing / Application Load Balancer
- Amazon ECS
- Amazon Aurora Global Database
- Amazon CloudWatch alarms and dashboards
- Amazon SNS

## Sources Consulted
- Terraform provider configuration documentation: https://developer.hashicorp.com/terraform/language/providers/configuration
- Terraform providers meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/providers
- Terraform AWS provider `aws_route53_record` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS provider `aws_rds_global_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_global_cluster
- Terraform AWS provider `aws_rds_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform AWS provider `aws_cloudwatch_metric_alarm` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- AWS Route 53 latency-based routing documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-latency.html
- AWS Route 53 DNS failover and alias target health documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-simple-configs.html
- Amazon Aurora Global Database documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html
- Amazon Aurora Global Database configuration requirements: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.configuration.requirements.html
- Aurora global database supported Regions and engine versions: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.Aurora_Fea_Regions_DB-eng.Feature.GlobalDatabase.html
- AWS announcement for Aurora PostgreSQL 17.9, 16.13, 15.17, and 14.22: https://aws.amazon.com/about-aws/whats-new/2026/04/amazon-aurora-postgresql-17-9-16-13-15-17-14-22/
- Amazon CloudWatch dashboard body documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html
- Amazon CloudWatch dashboards documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Dashboards.html
- Amazon CloudWatch alarm actions documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-actions.html

## Issues Found
- The provider example defined only aliased AWS providers, while several root-module resources used the unaliased default provider. Added a default `aws` provider configuration so unaliased Route 53, CloudWatch dashboard, and global RDS resources have a configured AWS region.
- The regional module accepted `vpc_cidr` and `desired_count` from callers but did not declare those variables. Added the missing variable declarations.
- Later snippets referenced ALB and target group suffix module outputs that the module did not expose. Added `alb_arn_suffix` and `target_group_arn_suffix` outputs.
- The Route 53 health check example created only one health check and did not associate health checks with the latency records. Added per-region health checks and connected them with `health_check_id`.
- The CloudWatch alarm example used `module[each.key]`, which is not a valid way to dynamically reference separately declared module blocks, and also attempted to monitor regional ALB metrics without selecting the matching regional provider. Replaced it with explicit per-region alarms using the correct provider alias and module outputs.
- The CloudWatch alarm example referenced a single SNS topic for all regional alarms. Added per-region SNS topics so each regional alarm uses a regional notification target.
- The CloudWatch dashboard showed ALB metrics from multiple regions without setting the metric region. Added per-metric `region` rendering properties.
- The Aurora PostgreSQL example pinned an older `15.4` engine version. Updated the examples to `15.17`, a current Aurora PostgreSQL 15 minor version announced by AWS in April 2026.
- The database guidance implied that Aurora Global Database provides general multi-region write consistency for active-active usage. Updated the text to clarify that Aurora Global Database has one primary write region and read-only secondary regions, with typical under-one-second replication to secondary regions.

## Review Notes
The Terraform snippets remain tutorial examples and still assume supporting resources such as ECS task definitions, listeners, security groups, target groups, and database subnet groups exist in the referenced modules. Terraform was not installed in the local environment, so validation was performed by reviewing the snippets against official Terraform and AWS documentation rather than running `terraform validate`.
