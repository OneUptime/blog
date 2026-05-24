# Validation Summary: How to Fix Error Modifying RDS Instance InvalidDBInstanceState

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (HashiCorp)
- Terraform AWS Provider (`aws_db_instance` resource)
- AWS RDS (Relational Database Service)
- AWS CLI (`aws rds` commands)
- MySQL (referenced engine version 8.0.35)

## Sources Consulted
- AWS RDS DB Instance Status documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/accessing-monitoring.html#Overview.DBInstance.Status
- Terraform AWS Provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS CLI `rds describe-db-instances` reference: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instances.html
- AWS CLI `rds describe-events` reference: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-events.html
- AWS CLI `rds start-db-instance` / `reboot-db-instance` references
- Terraform timeouts and lifecycle meta-arguments documentation

## Issues Found
No technical issues found.

Verified specifically:
- All RDS DB instance states listed (available, backing-up, modifying, rebooting, starting, stopping, stopped, storage-optimization, maintenance, upgrading) match the official AWS RDS status values.
- The `InvalidDBInstanceState` error code and message format are accurate.
- AWS CLI commands (`describe-db-instances`, `describe-events`, `start-db-instance`, `reboot-db-instance`) use correct subcommands, flags (`--db-instance-identifier`, `--source-identifier`, `--source-type`, `--duration`, `--query`, `--output`), and JMESPath queries.
- The `--duration` flag for `describe-events` is correctly interpreted as minutes (1440 = 24 hours).
- Terraform `aws_db_instance` arguments (`identifier`, `backup_window`, `maintenance_window`, `instance_class`, `allocated_storage`, `engine_version`, `apply_immediately`) are all valid.
- Backup window format (`hh24:mi-hh24:mi`) and maintenance window format (`ddd:hh24:mi-ddd:hh24:mi`) are correct.
- `timeouts` block with `create`/`update`/`delete` keys is the correct schema for `aws_db_instance`.
- `lifecycle { ignore_changes = [...] }` syntax is correct.
- The claim that Terraform has no native argument to stop/start an RDS instance via `aws_db_instance` is accurate (no `state` argument exists for this).
- The `watch -n 10` Linux command syntax is valid.
- Instance classes `db.t3.medium` and `db.t3.large` are valid RDS classes.
- MySQL engine version `8.0.35` is a real release.

## Review Notes
- The post correctly qualifies "you can only modify an instance when it is in the `available` state (with some exceptions)" — this caveat is important since certain modifications (like tag changes) can be performed in other states.
- The advice to use `null_resource` with `local-exec` to stop/start RDS instances works but should be used cautiously; a dedicated automation tool (Lambda, Systems Manager) is often a better long-term pattern. This is a stylistic suggestion, not a correctness issue.
- The post does not specify a Terraform AWS provider version. As of mid-2026, the documented resource schema and arguments remain valid in current provider versions (v5.x and v6.x).
