# Validation Summary: How to Configure RDS Option Groups with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- AWS RDS
- RDS option groups
- RDS DB instances
- MySQL
- AWS CLI
- Terraform AWS Provider / OpenTofu AWS provider compatibility

## Sources Consulted
- Amazon RDS User Guide, Working with option groups: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithOptionGroups.html
- Amazon RDS User Guide, Options for MySQL DB instances: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.MySQL.Options.html
- Amazon RDS User Guide, MySQL memcached support: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.MySQL.Options.memcached.html
- Amazon RDS User Guide, MariaDB Audit Plugin support for MySQL: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.MySQL.Options.AuditPlugin.html
- Amazon RDS User Guide, MySQL on Amazon RDS versions: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MySQL.Concepts.VersionMgmt.html
- AWS CLI Command Reference, `describe-option-group-options`: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-option-group-options.html
- HashiCorp Terraform AWS Provider docs, `aws_db_option_group`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_option_group.html.markdown
- HashiCorp Terraform AWS Provider docs, `aws_db_instance`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_instance.html.markdown
- OpenTofu documentation, Basic CLI Features: https://opentofu.org/docs/cli/commands/
- OpenTofu documentation, `tofu init`: https://opentofu.org/docs/v1.8/cli/commands/init/
- OpenTofu documentation, `tofu plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu documentation, `tofu apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found
1. **Invalid PostgreSQL option-group example**: The original Step 3 created an `aws_db_option_group` for `engine_name = "postgres"`. Amazon RDS documentation states that PostgreSQL does not use option groups. I replaced this with a valid empty custom MySQL option group and preserved the PostgreSQL note by clarifying that PostgreSQL uses parameter groups and `CREATE EXTENSION` instead.

2. **Outdated MySQL engine version**: The original Step 4 used `engine_version = "8.0.35"`. According to the current Amazon RDS MySQL version support page as of April 23, 2026, the documented supported MySQL 8.0 minor versions include `8.0.45`, `8.0.44`, `8.0.43`, `8.0.42`, `8.0.41`, `8.0.40`, `8.0.39`, and `8.0.37`; `8.0.35` is not listed. I updated the example to `8.0.45`, which is a currently supported RDS MySQL 8.0 version and remains compatible with the `MARIADB_AUDIT_PLUGIN` option.

## Review Notes
- `MEMCACHED` is documented for RDS MySQL 5.7 and 8.0, but not for MySQL 8.4. Keeping the examples on the MySQL 8.0 option-group family is important for this post.
- `MARIADB_AUDIT_PLUGIN` is documented for all MySQL 8.4 versions and MySQL 8.0.28 and later, so the corrected `8.0.45` instance example remains within the supported range.
- The `tofu init`, `tofu plan`, and `tofu apply` commands are correct per the OpenTofu documentation, but they were not executed locally because the OpenTofu CLI is not installed in this workspace.
