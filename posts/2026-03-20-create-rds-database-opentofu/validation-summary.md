# Validation Summary: How to Create an RDS Database with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- AWS RDS (Relational Database Service)
- PostgreSQL (engine version 15.4)
- AWS VPC (subnets, security groups)
- AWS IAM (referenced for enhanced monitoring role)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- AWS provider documentation for `aws_db_instance`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_instance.html.markdown
- AWS provider documentation for `aws_db_subnet_group` and `aws_security_group` (Terraform Registry)
- AWS RDS documentation for storage types (gp3 supported), engine versions, and monitoring intervals

## Issues Found
No technical issues found.

All resource names, argument names, and values verified against the official AWS Terraform provider documentation:
- `aws_db_subnet_group`: `name` and `subnet_ids` arguments are correct.
- `aws_security_group`: ingress block syntax with `from_port`, `to_port`, `protocol`, and `security_groups` is valid; PostgreSQL port 5432 is correct.
- `aws_db_instance`: all arguments (`identifier`, `engine`, `engine_version`, `instance_class`, `allocated_storage`, `storage_type`, `db_name`, `username`, `password`, `db_subnet_group_name`, `vpc_security_group_ids`, `multi_az`, `publicly_accessible`, `deletion_protection`, `skip_final_snapshot`, `final_snapshot_identifier`, `backup_retention_period`, `backup_window`, `maintenance_window`, `monitoring_interval`, `monitoring_role_arn`, `tags`) are valid.
- `storage_type = "gp3"` confirmed as a valid value.
- `monitoring_interval = 60` is a valid value (allowed values: 0, 1, 5, 10, 15, 30, 60).
- `backup_retention_period = 7` is within the allowed range (0–35).
- Output attribute `endpoint` is documented as "address:port" — correct.
- `db_name` attribute (rather than the deprecated `name`) is used correctly.
- The combination of `skip_final_snapshot = false` with `final_snapshot_identifier` is the correct, required pairing.

## Review Notes
- The "Enable Enhanced Monitoring" section shows a second `aws_db_instance "main"` block with `# ... other settings ...` as a partial snippet meant to be merged into the main resource. This is a common documentation convention; readers familiar with HCL will understand, but a more cautious presentation would explicitly say "add these arguments to the existing `aws_db_instance.main` resource."
- The post description mentions "parameter groups" but the post does not actually create an `aws_db_parameter_group` resource. Not a technical error — just a minor description-vs-content mismatch.
- PostgreSQL 15.4 was released August 2023 and is still supported on RDS, though newer minor versions (15.5+) and major version 16.x are available. This is not incorrect, just not the absolute newest.
- The enhanced monitoring snippet references `aws_iam_role.rds_monitoring.arn` without showing the IAM role definition. The role would need the `AmazonRDSEnhancedMonitoringRole` managed policy. Acceptable for a focused tutorial.
- For production use, readers should consider using `manage_master_user_password = true` (Secrets Manager integration) instead of passing the password as a variable, but the variable approach shown is technically valid.
