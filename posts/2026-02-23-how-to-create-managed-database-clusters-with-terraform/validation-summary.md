# Validation Summary: How to Create Managed Database Clusters with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS RDS Aurora PostgreSQL (`aws_rds_cluster`, `aws_rds_cluster_instance`, `aws_rds_cluster_parameter_group`)
- AWS DocumentDB (`aws_docdb_cluster`, `aws_docdb_cluster_instance`, `aws_docdb_subnet_group`, `aws_docdb_cluster_parameter_group`)
- AWS ElastiCache for Redis (`aws_elasticache_replication_group`, `aws_elasticache_parameter_group`, `aws_elasticache_subnet_group`)
- AWS VPC / Subnets / Security Groups
- AWS KMS
- AWS CloudWatch logs / Performance Insights / Enhanced Monitoring

## Sources Consulted
- Terraform AWS Provider — aws_rds_cluster: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform AWS Provider — aws_rds_cluster_instance: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_instance
- Terraform AWS Provider — aws_docdb_cluster: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/docdb_cluster
- Terraform AWS Provider — aws_docdb_cluster_instance: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/docdb_cluster_instance
- Terraform AWS Provider — aws_docdb_cluster_parameter_group: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/docdb_cluster_parameter_group
- Terraform AWS Provider — aws_elasticache_replication_group: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Terraform AWS Provider — aws_elasticache_parameter_group: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_parameter_group
- AWS Aurora PostgreSQL product page (throughput claim): https://aws.amazon.com/rds/aurora/postgresql-features/
- AWS DocumentDB engine versions / parameter group families: https://docs.aws.amazon.com/documentdb/latest/developerguide/db-cluster-parameter-group-create.html
- AWS DocumentDB CloudWatch logs (audit, profiler): https://docs.aws.amazon.com/documentdb/latest/developerguide/cloud_watch_logs_export.html
- AWS ElastiCache for Redis parameter group families (redis7): https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/ParameterGroups.Redis.html

## Issues Found
- **Aurora PostgreSQL throughput claim was incorrect.** The post stated Aurora PostgreSQL provides "up to five times the throughput of standard PostgreSQL". The 5x throughput figure applies to Aurora MySQL vs. standard MySQL. Per AWS official documentation, Aurora PostgreSQL provides up to **three times** the throughput of standard PostgreSQL. Corrected the text to read "three times".

## Review Notes
- The Terraform resource names, argument names, and attribute references (e.g., `cluster_identifier`, `engine`, `engine_version`, `db_subnet_group_name`, `vpc_security_group_ids`, `enabled_cloudwatch_logs_exports`, `reader_endpoint`, `configuration_endpoint_address`) are all valid against the current AWS provider docs.
- The ElastiCache replication group uses the modern flat attributes `num_node_groups` and `replicas_per_node_group` directly on the resource (the older `cluster_mode` nested block is deprecated). This is the correct/current pattern.
- The replication group uses `description` (the current field name) rather than the deprecated `replication_group_description`. Good.
- `family = "aurora-postgresql15"`, `family = "docdb5.0"`, and `family = "redis7"` are all valid parameter-group family identifiers.
- DocumentDB `enabled_cloudwatch_logs_exports = ["audit", "profiler"]` and the `audit_logs = "enabled"` parameter are valid.
- The post references `aws_iam_role.rds_monitoring` for enhanced monitoring but does not define it in the snippets — acceptable for tutorial brevity, but readers will need to create that role separately.
- Engine versions cited (`aurora-postgresql 15.4`, `docdb 5.0.0`, `redis 7.0`) are all real and were supported at the time of writing. These may need refreshing if the post ages, as AWS frequently deprecates minor versions.
- Sharing a single KMS key (`aws_kms_key.aurora`) across Aurora, DocumentDB, and ElastiCache is technically valid but not ideal for blast-radius isolation in production. Not technically wrong, just a design consideration.
