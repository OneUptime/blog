# Validation Summary: How to Create RDS Read Replicas with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible)
- AWS RDS (PostgreSQL)
- AWS Provider (`aws_db_instance` resource)
- AWS CLI (`aws rds` commands)
- HCL configuration language

## Sources Consulted
- AWS Terraform Provider documentation for `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS RDS User Guide — Working with Read Replicas: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html
- AWS CLI Reference for `rds promote-read-replica`: https://docs.aws.amazon.com/cli/latest/reference/rds/promote-read-replica.html
- AWS CLI Reference for `rds describe-db-instances`: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instances.html
- OpenTofu provider compatibility documentation: https://opentofu.org/docs/

## Issues Found
No technical issues found.

The key technical claims were verified:
- `replicate_source_db` correctly accepts the identifier for same-region replicas and the ARN for cross-region replicas (per AWS provider docs).
- The requirement that `backup_retention_period > 0` on the source DB for read replicas is accurate.
- Read replicas correctly inherit `engine`, `engine_version`, storage, and authentication credentials from the source — `db_name`, `username`, and `password` should not be set on the replica.
- The provider alias pattern for creating cross-region resources is the standard OpenTofu/Terraform approach.
- AWS CLI commands and flags (`--db-instance-identifier`, `--query`) are correct.
- PostgreSQL 15.4 is a valid RDS-supported version, and `db.t3.medium` is a valid instance class.

## Review Notes
- For cross-region encrypted source databases, AWS additionally requires specifying a `kms_key_id` on the replica. The post's cross-region example does not encrypt and so does not need this, but readers replicating an encrypted primary should be aware.
- The `final_snapshot_identifier` value `"primary-db-final"` would conflict on re-create unless changed; this is an inherent RDS constraint, not a post error.
- The bash code block uses multiple consecutive spaces between the command and its flags. This is functionally fine (the shell collapses whitespace) but is unusual formatting.
- The post does not discuss replica monitoring (replica lag via `ReplicaLag` CloudWatch metric) or `auto_minor_version_upgrade` settings, which are useful follow-ups but outside the scope.
