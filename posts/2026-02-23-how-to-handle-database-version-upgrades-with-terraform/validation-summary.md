# Validation Summary: How to Handle Database Version Upgrades with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HashiCorp)
- AWS Provider (`hashicorp/aws` ~> 5.0)
- AWS RDS (PostgreSQL)
- AWS Aurora (aurora-postgresql)
- AWS CloudWatch Metric Alarms
- AWS SNS Topics
- AWS RDS Blue/Green Deployments (conceptual)

## Sources Consulted
- Terraform AWS provider `aws_db_instance` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_db_snapshot` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_snapshot
- Terraform AWS provider `aws_rds_cluster` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform AWS provider `aws_rds_cluster_instance` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_instance
- Terraform AWS provider `aws_db_parameter_group` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_parameter_group
- Terraform AWS provider `aws_rds_cluster_parameter_group` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_parameter_group
- Terraform AWS provider `aws_cloudwatch_metric_alarm` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- AWS RDS User Guide - Upgrading the PostgreSQL DB engine: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.PostgreSQL.html
- AWS CLI `aws rds describe-db-engine-versions` reference: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-engine-versions.html

## Issues Found
No technical issues found.

All Terraform resource definitions, argument names, and AWS concepts are accurate:
- `aws_db_instance` arguments (`identifier`, `engine`, `engine_version`, `instance_class`, `allocated_storage`, `username`, `password`, `auto_minor_version_upgrade`, `allow_major_version_upgrade`, `apply_immediately`, `parameter_group_name`, `maintenance_window`, `db_subnet_group_name`, `vpc_security_group_ids`, `storage_encrypted`, `skip_final_snapshot`, `final_snapshot_identifier`, `multi_az`, `snapshot_identifier`, `backup_retention_period`) are correct.
- `aws_rds_cluster` arguments (including `master_username`, `master_password`, `db_cluster_parameter_group_name`) are correct.
- `aws_rds_cluster_instance` uses `db_parameter_group_name` for the instance-level parameter group, which is the correct argument name.
- Parameter group families `postgres15` and `aurora-postgresql15` are valid.
- Engine names `postgres` and `aurora-postgresql` are valid.
- The distinction between minor and major version upgrades and the role of `auto_minor_version_upgrade` and `allow_major_version_upgrade` is accurately described.
- The `aws rds describe-db-engine-versions` CLI command and its flags are valid.
- The CloudWatch alarm definition uses correct namespace (`AWS/RDS`), metric (`CPUUtilization`), and dimension (`DBInstanceIdentifier`).

## Review Notes
- The PostgreSQL version examples (14.9, 15.4, 15.5) are valid AWS RDS-supported versions historically, though they are not the latest available. For a production guide written in 2026, readers should refer to AWS to determine current supported versions before using these examples literally.
- The post correctly notes that the RDS Blue/Green deployment is "managed through AWS" — at the time of review there is an `aws_rds_cluster` blue/green workflow but no first-class, broadly supported Terraform resource that fully manages an RDS Blue/Green deployment lifecycle end-to-end, so the post's pragmatic guidance to manage it via AWS and reconcile state via `terraform import` is reasonable.
- The `lifecycle { ignore_changes = [snapshot_identifier] }` pattern on the test instance is correctly used to prevent Terraform from re-restoring after creation.
- Minor stylistic suggestion (not changed): centralizing `db_subnet_group_name` and `vpc_security_group_ids` references that are introduced but not defined in-snippet would clarify the examples — these are intentionally treated as already existing in the wider config.
