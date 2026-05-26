# Validation Summary: How to Create Aurora PostgreSQL Cluster in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Provider for Terraform
- Amazon Aurora PostgreSQL
- Amazon RDS cluster, cluster instance, custom endpoint, subnet group, security group, and parameter group resources
- PostgreSQL extensions including pg_stat_statements, pg_cron, pgAudit, PostGIS, pgcrypto, uuid-ossp, and pg_trgm
- IAM database authentication

## Sources Consulted
- Terraform AWS Provider `aws_rds_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform AWS Provider `aws_rds_cluster_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_instance
- Terraform AWS Provider `aws_rds_cluster_endpoint` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_endpoint
- Terraform AWS Provider `aws_db_parameter_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_parameter_group
- Terraform AWS Provider `aws_rds_cluster_parameter_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_parameter_group
- Amazon Aurora PostgreSQL release notes and version list: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraPostgreSQLReleaseNotes/AuroraPostgreSQL.Updates.html
- Amazon Aurora PostgreSQL parameters: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.Reference.ParameterGroups.html
- Amazon Aurora features and architecture overview: https://aws.amazon.com/documentation-overview/aurora/
- Amazon Aurora pg_cron documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/PostgreSQL_pg_cron.html
- Amazon Aurora pgAudit setup documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Appendix.PostgreSQL.CommonDBATasks.pgaudit.basic-setup.html
- Amazon RDS/Aurora PostgreSQL extensions documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.Extensions.html

## Issues Found
- The post said the first Terraform-counted cluster instance becomes the writer. Terraform and Aurora do not permanently designate primary and replica instances this way; Aurora manages writer election and failover. Updated the wording to describe the index and tags as deployment conventions, and noted that promoted readers keep their own instance class.
- The `instance_count` variable allowed values below 3 even though the custom reporting endpoint references `aws_rds_cluster_instance.postgres[1]` and `[2]`. Added Terraform variable validation requiring at least 3 instances for this example.
- The cluster parameter group included `checkpoint_timeout`, which is not listed as an Aurora PostgreSQL cluster parameter in the current AWS Aurora PostgreSQL parameter documentation. Replaced it with `cron.database_name = "myapp"` so the pg_cron setup matches the example database instead of silently using the default `postgres` database.
- The custom `admin` endpoint was described as writer-only. Aurora custom endpoints with static members are pinned to selected DB instances and do not automatically follow writer failovers. Updated the comment to make that behavior clear.
- The IAM database authentication section said it avoids managing database passwords generally, while the cluster still uses a master password in the Terraform example. Narrowed the claim to application database users.
- The extension SQL enabled pg_cron and configured pgAudit parameters but omitted `CREATE EXTENSION pgaudit`. Added the pgAudit extension command and updated the shared preload note.

## Review Notes
- The Terraform resources and argument names used in the examples are current in the AWS provider documentation.
- Aurora PostgreSQL 16.2 is a released Aurora PostgreSQL-compatible version, though newer PostgreSQL 16 minor versions are available as of this review. Keeping the pinned version is technically valid, but future readers should confirm regional availability with `aws rds describe-db-engine-versions`.
