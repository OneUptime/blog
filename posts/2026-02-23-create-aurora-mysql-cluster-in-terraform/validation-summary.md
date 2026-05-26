# Validation Summary: How to Create Aurora MySQL Cluster in Terraform

## Status
validated

## Post Type
Tutorial / Infrastructure-as-Code guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- Amazon Aurora MySQL-Compatible Edition
- Amazon RDS clusters and cluster instances
- Amazon RDS parameter groups
- Amazon CloudWatch Logs
- AWS IAM

## Sources Consulted
- Terraform AWS provider `aws_rds_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform AWS provider `aws_rds_cluster_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_instance
- Terraform AWS provider `aws_db_parameter_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_parameter_group
- Terraform AWS provider `aws_rds_cluster_endpoint` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_endpoint
- Amazon Aurora MySQL configuration parameters: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Reference.ParameterGroups.html
- Publishing Amazon Aurora MySQL logs to Amazon CloudWatch Logs: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Integrating.CloudWatch.html
- Replication with Amazon Aurora: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Replication.html
- Quotas and constraints for Amazon Aurora: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_Limits.html
- Aurora MySQL 3.12.0 release notes: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraMySQLReleaseNotes/AuroraMySQL.Updates.3120.html

## Issues Found
- The sample used Aurora MySQL `8.0.mysql_aurora.3.07.1`, which AWS now marks as deprecated. Updated it to `8.0.mysql_aurora.3.12.0`, a current Aurora MySQL 3 release compatible with MySQL 8.0.44.
- The post stated Aurora MySQL storage scales up to 128TB. Updated this to 256 TiB for Aurora MySQL 3.10 and later, while noting that earlier supported Aurora MySQL versions remain at 128 TiB.
- The post described replica lag as typically under 20ms. Updated it to AWS's documented phrasing that Aurora replica lag is usually much less than 100 milliseconds.
- The cluster parameter group configured `slow_query_log` and `long_query_time`, but AWS documents those as instance-level parameters for Aurora MySQL. Moved them to the instance parameter group.
- The instance parameter group configured `thread_handling = "pool-of-threads"`, but AWS documents `thread_handling` as not modifiable for Aurora MySQL. Replaced it with the modifiable `thread_cache_size` parameter.
- The post implied Terraform index `0` remains the writer. Clarified that it is only the initial writer and that failover can promote a different instance.
- The post described `innodb_buffer_pool_size` as managed across the shared storage layer. Corrected this to describe it as an instance-level memory-based parameter, while preserving the point that Aurora's shared storage changes related InnoDB behavior.

## Review Notes
- The Terraform snippets are examples and still require the referenced variables and provider configuration in a complete module.
- The custom endpoint example assumes `var.instance_count` is at least `2`; otherwise `aws_rds_cluster_instance.mysql[1]` would be invalid.
