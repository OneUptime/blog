# Validation Summary: How to Create Database Users and Permissions with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS provider for Terraform
- Amazon RDS for PostgreSQL
- RDS IAM database authentication
- AWS IAM policies and roles
- AWS Secrets Manager
- Terraform Random provider
- Terraform PostgreSQL provider
- PostgreSQL roles, grants, and default privileges

## Sources Consulted
- AWS RDS IAM database authentication documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html
- AWS RDS supported IAM database authentication engines: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RDS_Fea_Regions_DB-eng.Feature.IamDatabaseAuthentication.html
- AWS RDS PostgreSQL release notes and version support: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- Terraform AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_secretsmanager_secret_rotation` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_rotation
- Terraform Random provider `random_password` documentation: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- Terraform PostgreSQL provider documentation: https://registry.terraform.io/providers/cyrilgdn/postgresql/latest/docs
- Terraform PostgreSQL provider `postgresql_role` documentation: https://registry.terraform.io/providers/cyrilgdn/postgresql/latest/docs/resources/postgresql_role
- Terraform PostgreSQL provider `postgresql_grant` documentation: https://registry.terraform.io/providers/cyrilgdn/postgresql/latest/docs/resources/postgresql_grant
- Terraform PostgreSQL provider `postgresql_default_privileges` documentation: https://registry.terraform.io/providers/cyrilgdn/postgresql/latest/docs/resources/postgresql_default_privileges
- PostgreSQL privileges documentation: https://www.postgresql.org/docs/current/ddl-priv.html
- PostgreSQL `ALTER DEFAULT PRIVILEGES` documentation: https://www.postgresql.org/docs/current/sql-alterdefaultprivileges.html

## Issues Found
- The RDS instance used `var.db_password`, while the Secrets Manager section generated and stored `random_password.master_password`. Updated the RDS instance and PostgreSQL provider examples to use `random_password.master_password.result` so the stored secret matches the actual master credential.
- The provider setup used `random_password` resources later in the post but did not declare the Random provider. Added `hashicorp/random` to `required_providers`.
- The example pinned RDS PostgreSQL to minor version `15.4`, which AWS now marks as past standard support. Changed the example to `engine_version = "15"` so RDS selects an available current minor version for PostgreSQL 15.
- The IAM `rds-db:connect` policy ARNs referenced database users that did not match the IAM-authenticated PostgreSQL roles created later. Updated the ARNs to `iam_readonly_user`, `iam_app_user`, and `iam_admin_user`.
- The admin IAM policy referenced a database user that was not created. Added a matching `postgresql_role` for `iam_admin_user` with `rds_iam` and `rds_superuser` roles.

## Review Notes
The snippets are still illustrative and assume surrounding infrastructure exists, such as subnet groups, security groups, and the Secrets Manager rotation Lambda. The PostgreSQL provider must be able to reach the database endpoint from wherever Terraform runs.
