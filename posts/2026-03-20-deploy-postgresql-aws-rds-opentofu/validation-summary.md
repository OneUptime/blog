# Validation Summary: How to Deploy PostgreSQL on AWS RDS with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS RDS
- PostgreSQL
- Terraform AWS Provider
- AWS VPC Security Groups

## Sources Consulted
- AWS RDS for PostgreSQL release notes: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- Common DBA tasks for Amazon RDS for PostgreSQL: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.html
- SQL statistics for RDS PostgreSQL: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.UsingDashboard.AnalyzeDBLoad.AdditionalMetrics.PostgreSQL.html
- Overview of Performance Insights on Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.html
- Terraform AWS Provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS Provider `aws_db_parameter_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_parameter_group
- Terraform AWS Provider `aws_security_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group

## Issues Found
- The post pinned `engine_version = "15.4"`. AWS now marks PostgreSQL 15.4 on RDS as having reached the end of standard support, so I updated the example to `15.17`, which is a current supported PostgreSQL 15 minor release as of 2026-05-01.
- The description claimed the post provisions PostgreSQL "extensions". The example only configures RDS and a DB parameter group; it does not run `CREATE EXTENSION` inside the database. I corrected the description to refer to `pg_stat_statements` configuration instead.
- The introduction said OpenTofu can declare "every aspect" of the PostgreSQL configuration as code. That overstates what this example does, because it manages the RDS instance and parameter-group settings, not all in-database configuration. I narrowed the wording accordingly.
- The summary implied the custom parameter group is used to load `pg_stat_statements`. For RDS PostgreSQL 11 and later, AWS loads `pg_stat_statements` by default. I updated the summary so it accurately describes the parameter group as making the setting explicit while configuring slow query logging.

## Review Notes
- The `aws_db_instance`, `aws_db_parameter_group`, and `aws_security_group` blocks are syntactically valid for the current Terraform AWS Provider documentation.
- `performance_insights_enabled = true` is still technically valid on 2026-05-01, but AWS has announced Performance Insights end-of-life on June 30, 2026. A future content refresh should update this guidance toward CloudWatch Database Insights.
- The example uses `password = var.db_password`, which is supported, but provider docs note that this stores the password in Terraform state. Future revisions could mention `manage_master_user_password` or `password_wo` for stronger secret handling.
- The security group example uses inline `ingress` rules. Provider docs still support this pattern, but now recommend the standalone `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources as the preferred approach.
