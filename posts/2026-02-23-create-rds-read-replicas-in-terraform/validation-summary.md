# Validation Summary: How to Create RDS Read Replicas in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon RDS DB instances
- RDS read replicas
- RDS for PostgreSQL
- AWS CLI
- Amazon CloudWatch
- Amazon RDS Proxy

## Sources Consulted
- Terraform AWS Provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Amazon RDS read replicas documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html
- Amazon RDS read replica creation documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.Create.html
- Amazon RDS for PostgreSQL read replica documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PostgreSQL.Replication.ReadReplicas.html
- Amazon RDS CloudWatch metrics documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- Amazon RDS replication monitoring documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.Monitoring.html
- AWS CLI `promote-read-replica` documentation: https://docs.aws.amazon.com/cli/latest/reference/rds/promote-read-replica.html
- Amazon RDS Proxy documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html
- Amazon RDS read replicas feature page: https://aws.amazon.com/rds/features/read-replicas/
- Amazon RDS DB parameter value documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ParamValuesRef.html

## Issues Found
- The primary PostgreSQL parameter group comment implied that assigning a parameter group explicitly enables replication. RDS configures physical read replica replication automatically, so the comment was corrected to describe primary-specific tuning.
- The PostgreSQL `effective_cache_size` example used `{DBInstanceClassMemory*3/4}`, which returns bytes while PostgreSQL integer memory parameters are interpreted in 8 KB pages. Changed it to `{DBInstanceClassMemory*3/32768}` to represent roughly 75 percent of DB instance class memory in 8 KB pages.
- The promotion section said replica promotion cannot be done through Terraform alone. Terraform's AWS provider supports promotion by removing `replicate_source_db` from a managed replica, so the text now describes both the Terraform path and the AWS CLI operational path.
- The application routing section claimed Amazon RDS Proxy can automatically route read queries to replicas. For standard RDS DB instances in replication configurations, RDS Proxy can associate only with the writer DB instance, not read replicas. The section now says read/write routing must be handled by the application, ORM, or another database-aware proxy for non-Aurora RDS.
- The summary stated a limit of 5 replicas per primary. Current AWS documentation says RDS for PostgreSQL, MySQL, MariaDB, and SQL Server support up to 15 read replicas per source DB instance. Updated the summary accordingly.

## Review Notes
Terraform was not installed in the local environment, so the HCL snippets were reviewed against the official Terraform AWS Provider documentation rather than by running `terraform validate`. The post uses illustrative snippets that reference resources and variables defined elsewhere, which is acceptable for the tutorial format.
