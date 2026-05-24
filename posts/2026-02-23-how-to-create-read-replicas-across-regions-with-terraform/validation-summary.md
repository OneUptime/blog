# Validation Summary: How to Create Read Replicas Across Regions with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (AWS provider ~> 5.0)
- AWS RDS (PostgreSQL engine 15.4)
- AWS Aurora Global Database (aurora-postgresql, engine 15.4)
- AWS KMS (cross-region encryption keys)
- AWS VPC / Security Groups / DB Subnet Groups
- AWS CloudWatch (metric alarms: `ReplicaLag`, `AuroraGlobalDBReplicationLag`)
- AWS SNS (alarm actions)

## Sources Consulted
- Terraform AWS provider docs: `aws_db_instance` — https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_instance.html.markdown
- Terraform AWS provider docs: `aws_rds_global_cluster` — https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/rds_global_cluster.html.markdown
- Terraform AWS provider docs: `aws_rds_cluster` — https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/rds_cluster.html.markdown
- Terraform AWS provider docs: `aws_rds_cluster_instance` — https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/rds_cluster_instance.html.markdown
- AWS docs: Amazon CloudWatch metrics for Amazon RDS — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- AWS docs: Amazon CloudWatch metrics for Amazon Aurora — https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraMonitoring.Metrics.html

## Issues Found
No technical issues found.

Verified during review:
- `replicate_source_db` correctly uses the source DB ARN (required for cross-region replicas).
- `kms_key_id` on the cross-region replica references a KMS key in the destination region (KMS keys are region-scoped — the post correctly creates a separate key with `provider = aws.replica`).
- Secondary Aurora cluster in the Global Database omits `master_username` / `master_password` — correct, since these are inherited from the primary when `global_cluster_identifier` is set.
- All `aws_rds_global_cluster` arguments used (`global_cluster_identifier`, `engine`, `engine_version`, `database_name`, `storage_encrypted`) are valid.
- CloudWatch metric `ReplicaLag` is correct for RDS read replicas (units: seconds, threshold of 60s makes sense).
- CloudWatch metric `AuroraGlobalDBReplicationLag` is correct for Aurora Global Database (units: milliseconds, threshold of 5000ms = 5s is appropriate).
- PostgreSQL 15.4, `db.r6g.large`, and `gp3` storage are all valid current values.
- `depends_on` on the secondary Aurora cluster correctly ensures ordering with the primary.

## Review Notes
- Several variables and resources referenced in code blocks (`var.db_password`, `var.primary_subnet_ids`, `var.primary_vpc_id`, `var.primary_vpc_cidr`, `aws_db_subnet_group.primary_aurora`, `aws_security_group.primary_aurora_sg`, etc.) are used but not all declared inline. This is a tutorial-style omission for readability rather than a technical error — readers are expected to wire these into their own VPC modules.
- `aws_rds_cluster_instance.engine_version` is set in the example; this is valid, but Terraform docs note that cluster engine upgrades should be performed on the parent `aws_rds_cluster`. Not incorrect, just worth noting if minor version drift occurs.
- The primary Aurora cluster sets `storage_encrypted = true` but no custom `kms_key_id`, so it will use the default `aws/rds` AWS-managed key. Functional, though a customer-managed key (as used for the standalone RDS example) would be more aligned with the "separate KMS keys per region" best practice mentioned later.
- PostgreSQL 15.4 is a valid engine version as of the post date but RDS engine versions are deprecated periodically — readers should pick a currently supported minor version when applying this.
