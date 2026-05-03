# Validation Summary: How to Configure RDS Parameter Groups with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- AWS RDS (PostgreSQL, MySQL, Aurora)
- Terraform AWS Provider (`hashicorp/aws`)
- `aws_db_parameter_group`, `aws_db_instance`, `aws_rds_cluster_parameter_group` resources

## Sources Consulted
- Terraform AWS Provider docs: `aws_db_parameter_group` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_parameter_group)
- Terraform AWS Provider docs: `aws_db_instance` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance)
- Terraform AWS Provider docs: `aws_rds_cluster_parameter_group` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_parameter_group)
- AWS RDS Parameter Groups documentation (https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.html)
- PostgreSQL `shared_buffers` documentation (https://www.postgresql.org/docs/15/runtime-config-resource.html) — value is in 8KB units by default
- MySQL Server System Variables (https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html) for `character_set_server`, `collation_server`, `slow_query_log`, `long_query_time`

## Issues Found
- **Incorrect unit conversion in `shared_buffers` comment**: The comment said `262144` was "256MB in 8KB pages", but 262144 × 8KB = 2,097,152 KB = 2GB. (256MB would be 32,768 pages.) Fixed the comment to read `# 2GB in 8KB pages` to match the value, since 2GB is a more typical production tuning value than 256MB.

## Review Notes
- All resource names (`aws_db_parameter_group`, `aws_db_instance`, `aws_rds_cluster_parameter_group`) and argument names (`family`, `name`, `description`, `parameter`, `apply_method`, `parameter_group_name`, `tags`) are correct per the current Terraform AWS provider.
- Family identifiers (`postgres15`, `mysql8.0`, `aurora-postgresql15`) are valid RDS parameter group families.
- `apply_method` values `"immediate"` and `"pending-reboot"` are the only valid values per the provider docs.
- PostgreSQL boolean parameters such as `log_connections` accept `"1"`/`"0"` (as well as `"on"`/`"off"`); the post's choice is valid.
- MySQL `slow_query_log` accepts `0`/`1` and `long_query_time` is in seconds — both correctly used.
- Engine version `15.4` is a real PostgreSQL minor version available on RDS. Note that minor versions evolve over time and readers may need a newer minor version when running this in the future.
- Setting `name` on the parameter group prevents in-place replacement when changes that force re-creation occur; in production users may prefer `name_prefix` to allow create-before-destroy. This is a stylistic note, not a bug.
