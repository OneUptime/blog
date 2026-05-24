# Validation Summary: How to Handle Database Migration with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL, AWS provider)
- AWS Database Migration Service (DMS) — replication instance, endpoints, replication tasks, table mappings, task settings
- AWS RDS (PostgreSQL target, Blue/Green deployment)
- AWS VPC / Subnets / Security Groups
- AWS CloudWatch metric alarms (AWS/DMS namespace)
- PostgreSQL (psql CLI)
- MySQL (as source engine)

## Sources Consulted
- Terraform AWS provider — `aws_rds_blue_green_deployment` design decision: https://hashicorp.github.io/terraform-provider-aws/design-decisions/rds-bluegreen-deployments/
- Terraform AWS provider — `aws_db_instance` (`blue_green_update` block, introduced in v4.42.0): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider — `aws_dms_endpoint` (`postgres_settings` block fields: `after_connect_script`, `execute_timeout`, `max_file_size`): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dms_endpoint
- Terraform AWS provider — `aws_dms_replication_instance`, `aws_dms_replication_subnet_group`, `aws_dms_replication_task` (table mappings & task settings JSON schemas)
- AWS DMS documentation — table mapping `selection` and `transformation` rule structure, replication task settings (TargetMetadata, FullLoadSettings, Logging, ControlTablesSettings, ErrorBehavior)
- AWS CloudWatch metrics for AWS/DMS — `CDCLatencySource`, `FullLoadThroughputRowsSource`, dimensions `ReplicationInstanceIdentifier` / `ReplicationTaskIdentifier`

## Issues Found
1. **Non-existent resource `aws_rds_blue_green_deployment`.** The post defined a standalone `aws_rds_blue_green_deployment` resource with arguments like `blue_green_deployment_name`, `source_arn`, `target_engine_version`, and `target_db_parameter_group_name`. This resource does not exist in the Terraform AWS provider. The provider implements RDS Blue/Green deployments as an *implementation detail* of `aws_db_instance` updates, triggered by the `blue_green_update { enabled = true }` nested block (added in AWS provider v4.42.0). Updating the post:
   - Removed the fictional `aws_rds_blue_green_deployment` resource.
   - Replaced it with guidance/snippet showing how to add `blue_green_update { enabled = true }` to the existing `aws_db_instance.target` and bump `engine_version` / `parameter_group_name` to trigger the Blue/Green update.
   - Kept the `aws_db_parameter_group.pg16` resource which is correct.

## Review Notes
- Other technical content was verified and is correct:
  - `aws_dms_replication_instance` arguments (`replication_instance_class = "dms.r5.large"`, `engine_version = "3.5.1"`, `multi_az`, `allocated_storage`, `auto_minor_version_upgrade`, `publicly_accessible`) are all valid.
  - `aws_dms_endpoint` `postgres_settings` block with `after_connect_script`, `execute_timeout`, and `max_file_size` are valid argument names.
  - `aws_dms_replication_task` `migration_type = "full-load-and-cdc"` is a valid value, and the JSON structure for `table_mappings` (selection / transformation rules with `rule-type`, `rule-id`, `rule-name`, `object-locator`, `rule-action`) matches the AWS DMS schema.
  - `replication_task_settings` keys (`TargetMetadata`, `FullLoadSettings`, `Logging`, `ControlTablesSettings`, `ErrorBehavior`) and their nested fields match AWS DMS documentation.
  - CloudWatch metric names (`CDCLatencySource`, `FullLoadThroughputRowsSource`) and dimensions (`ReplicationInstanceIdentifier`, `ReplicationTaskIdentifier`) under the `AWS/DMS` namespace are correct.
  - PostgreSQL major versions 15 and 16 are valid RDS engine versions; instance class `db.r6g.xlarge` and storage type `gp3` are valid.
  - The `null_resource` + `local-exec` PGPASSWORD pattern is syntactically valid (note: passing secrets through the environment is preferable to the command line — the snippet does both; the command-line `PGPASSWORD=...` prefix is technically redundant given the `environment` block, but harmless).
- Minor caveats (not changed, as they are correct but worth knowing):
  - `engine_version = "15"` and `"16"` pin only the major version; RDS will pick the latest available minor. This is intentional in many setups but readers may want to be aware.
  - DMS engine version `3.5.1` was correct at time of writing; newer minor versions (e.g., 3.5.x) may be available — `auto_minor_version_upgrade = true` covers this.
  - The DMS security group's outbound rule to `0.0.0.0/0` on port 3306 is broad; tighter CIDR scoping is recommended for production but the example value is syntactically valid.
