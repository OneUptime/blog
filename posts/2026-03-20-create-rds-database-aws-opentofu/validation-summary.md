# Validation Summary: How to Create an RDS Database with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL2)
- AWS RDS (PostgreSQL 16.3)
- AWS RDS Parameter Group (`postgres16` family)
- AWS DB Subnet Group
- AWS Security Groups (VPC)
- AWS Secrets Manager
- AWS CloudWatch Logs (RDS log exports)
- AWS Enhanced Monitoring (IAM role)
- AWS KMS (storage encryption)
- Terraform `random_password` provider resource
- Infrastructure as Code patterns (Multi-AZ, deletion protection, automated backups)

## Sources Consulted
- Terraform AWS provider `aws_db_instance` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_db_parameter_group` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_parameter_group
- Terraform AWS provider `aws_db_subnet_group` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_subnet_group
- Terraform AWS provider `aws_security_group` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS provider `aws_secretsmanager_secret` / `aws_secretsmanager_secret_version` docs
- Terraform `random_password` resource docs: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- AWS RDS API reference for master password constraints (CreateDBInstance) and engine versions
- HashiCorp HCL2 / OpenTofu language specification (block syntax)

## Issues Found
No technical issues found.

All resource arguments (`aws_db_instance`, `aws_db_parameter_group`, `aws_db_subnet_group`, `aws_security_group`, `aws_secretsmanager_secret*`, `random_password`) match the current AWS / random provider schemas. The `family = "postgres16"` value is correct, `engine_version = "16.3"` was a valid RDS-supported PostgreSQL minor, `enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]` are the valid values for PostgreSQL, and the single-line `output` block syntax is valid HCL2. The `random_password.override_special` allowlist correctly excludes `/`, `"`, `@`, and space — the characters disallowed by RDS PostgreSQL master passwords. `manage_master_user_password = false` paired with an explicit `password` is a supported combination.

## Review Notes
- The comment `manage_master_user_password = false  # Set true to use Secrets Manager` is slightly ambiguous: setting it to `true` would have RDS auto-create and rotate a Secrets Manager secret, but the post then proceeds to manually create one. Both approaches use Secrets Manager — the difference is automation/rotation vs. manual control. Not a technical error, just a wording nuance.
- `delete_automated_backups = true` is the provider default; setting it explicitly is harmless but redundant.
- `multi_az = var.environment == "prod" ? true : false` could be simplified to `multi_az = var.environment == "prod"`, but the ternary is functionally correct.
- `aws_iam_role.rds_monitoring` is referenced for `monitoring_role_arn` but its definition is omitted — readers will need to create that role separately with the AWS-managed `AmazonRDSEnhancedMonitoringRole` policy.
- The `aws_security_group` has no `egress` block. Because the Terraform AWS provider manages all rules, the resulting RDS SG will have no outbound rules — fine for an RDS-only SG (RDS receives connections), but worth noting.
- PostgreSQL 16 has since received newer minors (16.4, 16.5, …); readers planning new deployments may want to track the latest supported minor on AWS RDS.
