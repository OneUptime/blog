# Validation Summary: How to Deploy PostgreSQL on AWS RDS with OpenTofu - A Practical Guide

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- OpenTofu / HCL
- Amazon RDS for PostgreSQL
- AWS VPC security groups and DB subnet groups
- AWS KMS
- AWS Secrets Manager

## Sources Consulted
- AWS provider `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_db_parameter_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_parameter_group
- AWS provider `aws_db_subnet_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_subnet_group
- AWS provider `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS provider `aws_kms_key`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_key
- AWS provider `aws_kms_alias`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_alias
- AWS provider `aws_secretsmanager_secret`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret
- AWS provider `aws_secretsmanager_secret_version`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version
- Available PostgreSQL database versions for Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.DBVersions.html
- Amazon RDS for PostgreSQL release notes: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- Amazon RDS parameter groups overview: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/parameter-groups-overview.html
- Password management with Amazon RDS and AWS Secrets Manager: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html
- OpenTofu write-only attributes: https://opentofu.org/docs/v1.11/language/ephemerality/write-only-attributes/

## Issues Found
- `engine_version = "15.4"` pinned an outdated PostgreSQL minor release. AWS now marks RDS PostgreSQL 15.4 as end of standard support, and AWS allows specifying only the major version. I changed it to `engine_version = "15"` so RDS selects a current supported PostgreSQL 15 minor version.
- The comment on `password = var.db_password` incorrectly claimed OpenTofu write-only usage and the wrong minimum version. I updated the comment to reflect that `password` is stored in state and that write-only usage requires `password_wo` on OpenTofu 1.11+.
- `shared_preload_libraries` is a static RDS for PostgreSQL parameter. I added `apply_method = "pending-reboot"` so the parameter group example matches how static parameter changes are applied.
- The conclusion treated Performance Insights as a stable long-term recommendation without caveat. I updated it to note the Performance Insights console end-of-life on June 30, 2026 and the transition toward CloudWatch Database Insights. I also clarified that the shown `password` plus `secret_string` pattern still stores the secret in OpenTofu state.

## Review Notes
- The manual Secrets Manager resource is valid, but it does not provide RDS-managed password generation or rotation. A future revision could show `manage_master_user_password = true` if the goal is stronger production defaults.
- The security group example uses inline `ingress` and `egress` rules. The AWS provider still supports this, but current provider guidance prefers `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule`.
