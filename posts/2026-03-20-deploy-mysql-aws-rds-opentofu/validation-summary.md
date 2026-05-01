# Validation Summary: How to Deploy MySQL on AWS RDS with OpenTofu

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- OpenTofu / HCL
- AWS RDS for MySQL
- AWS DB parameter groups
- AWS DB subnet groups
- AWS VPC security groups

## Sources Consulted
- Amazon RDS for MySQL versions: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MySQL.Concepts.VersionMgmt.html
- Amazon RDS CreateDBInstance API reference: https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_CreateDBInstance.html
- Amazon RDS ModifyDBInstance API reference: https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_ModifyDBInstance.html
- Amazon RDS Parameters for MySQL: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.MySQL.Parameters.html
- HashiCorp AWS provider `aws_db_instance` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- HashiCorp AWS provider `aws_db_parameter_group` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_parameter_group
- HashiCorp AWS provider `aws_security_group` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- MySQL 8.0 server character set and collation: https://dev.mysql.com/doc/refman/8.0/en/charset-server.html
- MySQL 8.0 slow query log: https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html
- MySQL 8.0 server system variable reference: https://dev.mysql.com/doc/refman/8.0/en/server-system-variable-reference.html

## Issues Found
- The post pinned `engine_version = "8.0.35"`, which is not a currently supported Amazon RDS for MySQL 8.0 minor version on 2026-05-01. I changed it to `engine_version = "8.0"` so Amazon RDS can use a supported MySQL 8.0 minor version while `auto_minor_version_upgrade = true` remains consistent with the provider's documented behavior.
- I updated the summary sentence to describe the engine version requirement in terms of a supported version rather than a stale pinned patch level.
- No other technical issues found.

## Review Notes
- The example's `backup_window` and `maintenance_window` values are valid and non-overlapping. In Amazon RDS, these windows are interpreted in UTC.
- The inline `ingress` rule in `aws_security_group` is valid, but the current AWS provider documentation recommends separate `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources for new configurations.
- `password = var.db_password` is valid, but the provider documentation notes that `password` is stored in state. A future revision could mention `manage_master_user_password` or `password_wo`.
- Amazon RDS still supports MySQL 8.0 on 2026-05-01, but AWS also lists MySQL 8.4 as a newer supported major version. A future refresh of the tutorial may want to target 8.4 explicitly.
