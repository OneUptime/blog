# Validation Summary: How to Create RDS PostgreSQL Instances with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS RDS
- PostgreSQL
- AWS Secrets Manager
- AWS CloudWatch Logs
- AWS KMS
- IAM database authentication

## Sources Consulted
- OpenTofu command docs: https://opentofu.org/docs/cli/commands/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `init` command: https://opentofu.org/docs/v1.7/cli/commands/init/
- AWS RDS `CreateDBInstance` API: https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_CreateDBInstance.html
- Amazon RDS DB instance storage: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html
- gp3 storage on Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIOPS.gp3.html
- Database authentication with Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/database-authentication.html
- RDS for PostgreSQL log exports: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.Concepts.PostgreSQL.html
- SQL statistics for RDS PostgreSQL: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.UsingDashboard.AnalyzeDBLoad.AdditionalMetrics.PostgreSQL.html
- Performance Insights overview: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.html
- PostgreSQL extensions on Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.Extensions.html
- AWS provider `aws_db_instance` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- AWS provider `aws_db_parameter_group` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_parameter_group.html.markdown
- AWS provider `aws_secretsmanager_secret` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/secretsmanager_secret.html.markdown
- AWS provider `aws_secretsmanager_secret_version` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/secretsmanager_secret_version.html.markdown
- Random provider `random_password` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-random/main/docs/resources/password.md

## Issues Found
- The `random_password` comment implied that RDS broadly disallows special characters. I corrected the comment to reflect that the snippet is avoiding characters disallowed by RDS master password rules, not that special characters are generally unsupported.
- The `shared_preload_libraries` parameter block omitted `apply_method = "pending-reboot"`. I added it because this parameter requires a reboot on RDS PostgreSQL, and the provider otherwise defaults parameter changes to `immediate`.
- The snippet pinned `engine_version = "16.2"`, which is an older PostgreSQL 16 minor. I changed it to `engine_version = "16"` and set `auto_minor_version_upgrade = true` so the example stays current within the PostgreSQL 16 family.
- The `iops` line and comment were misleading for `gp3`. I removed the explicit `iops = 3000` line because gp3 already includes a 3,000 IOPS baseline for this storage size on RDS PostgreSQL, and the original comment incorrectly said IOPS only applies to `io1`/`io2`.
- The conclusion described IAM auth as passwordless access "from AWS services" and said to enable `pg_stat_statements` "via parameter group". I corrected this to IAM database authentication using temporary auth tokens and creating the `pg_stat_statements` extension in the database for query statistics.

## Review Notes
- AWS has announced the end-of-life date for the Performance Insights console experience as June 30, 2026. The post is still technically valid as of 2026-04-23, but future revisions should steer readers toward Database Insights terminology and migration guidance.
- This pattern stores credentials in AWS Secrets Manager, but the password is still recorded in OpenTofu state because both `aws_db_instance.password` and `aws_secretsmanager_secret_version.secret_string` are stateful inputs in the current provider model.
