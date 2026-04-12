# Validation Summary: How to Use Amazon RDS for MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL (5.7, 8.0, 8.4 LTS)
- Amazon RDS
- AWS CLI
- Terraform (AWS provider, `aws_db_instance` resource)
- VPC networking (subnets, security groups)
- RDS Enhanced Monitoring
- RDS Performance Insights

## Sources Consulted
- AWS CLI `rds` command reference: https://docs.aws.amazon.com/cli/latest/reference/rds/
- AWS RDS `create-db-instance` documentation: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- AWS RDS `create-db-parameter-group` documentation: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-parameter-group.html
- AWS RDS `modify-db-parameter-group` documentation: https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-parameter-group.html
- AWS RDS `create-db-instance-read-replica` documentation: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance-read-replica.html
- AWS RDS MySQL engine versions: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MySQL.Concepts.VersionMgmt.html
- AWS IAM ARN format reference: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference-arns.html
- Terraform `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance

## Issues Found

1. **Incomplete MySQL version list (line 13)**: The post stated RDS supports "MySQL versions 5.7 and 8.0". MySQL 8.4 LTS is also available on Amazon RDS, and MySQL 5.7 is under extended support only (with additional charges). Updated to "MySQL versions 5.7 (extended support), 8.0, and 8.4 LTS".

2. **Invalid IAM ARN account ID (line 94)**: The monitoring role ARN `arn:aws:iam::123456789:role/rds-monitoring-role` used a 9-digit account ID. AWS account IDs are always exactly 12 digits. Fixed to `arn:aws:iam::123456789012:role/rds-monitoring-role`.

3. **Terraform code block language marker (line 120)**: The Terraform HCL block used `` ```text `` instead of `` ```hcl ``, which prevents proper syntax highlighting. Changed to `` ```hcl ``.

## Review Notes
- The `max_connections` parameter in the parameter group example uses `ApplyMethod=pending-reboot`, but `max_connections` is a dynamic parameter in RDS MySQL that can be applied immediately. Using `pending-reboot` is valid but means the change won't take effect until the next reboot. This is not an error but is worth noting for readers.
- The `--engine-version 8.0` flag uses a major version only. AWS CLI accepts this and selects the default minor version, so this is correct behavior.
- The `innodb_buffer_pool_size` formula `{DBInstanceClassMemory*3/4}` uses the correct RDS parameter formula syntax for dynamic sizing.
- All AWS CLI commands use correct flags and syntax for their respective operations.
- The Terraform `aws_db_instance` resource attributes are all valid and correctly named.
