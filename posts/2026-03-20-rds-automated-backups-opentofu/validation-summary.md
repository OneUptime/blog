# Validation Summary: How to Set Up RDS Automated Backups with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS RDS
- Amazon CloudWatch
- AWS CLI
- PostgreSQL on Amazon RDS

## Sources Consulted
- Amazon RDS User Guide, Introduction to backups: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.html
- Amazon RDS User Guide, Enabling automated backups: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.Enabling.html
- Amazon RDS User Guide, Restoring a DB instance to a specified time: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html
- Amazon RDS User Guide, Sharing a DB snapshot for Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ShareSnapshot.html
- Amazon RDS User Guide, Sharing encrypted snapshots for Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/share-encrypted-snapshot.html
- Amazon RDS User Guide, Copying a DB snapshot for Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CopySnapshot.html
- Amazon RDS User Guide, Amazon CloudWatch metrics for Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- Amazon RDS for PostgreSQL release notes: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- AWS CLI Command Reference, `restore-db-instance-to-point-in-time`: https://docs.aws.amazon.com/cli/latest/reference/rds/restore-db-instance-to-point-in-time.html
- AWS CLI Command Reference, `modify-db-snapshot-attribute`: https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-snapshot-attribute.html
- HashiCorp AWS provider docs, `aws_db_instance`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_instance.html.markdown
- HashiCorp AWS provider docs, `aws_db_snapshot` data source: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/d/db_snapshot.html.markdown
- HashiCorp AWS provider docs, `aws_db_snapshot_copy`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_snapshot_copy.html.markdown

## Issues Found
- The post said automated backups could be shared across accounts directly and used `modify-db-snapshot-attribute` against an automated snapshot. AWS only allows sharing manual DB snapshots. I changed the example to copy the latest automated snapshot to a manual snapshot with `aws_db_snapshot_copy` and then share that copy.
- The post used `aws_db_instance.main.id` where the AWS provider documents `id` as the DBI resource ID, not the DB instance identifier expected by the RDS snapshot lookup and CloudWatch metric dimension. I changed those references to `aws_db_instance.main.identifier`.
- The monitoring section said the `TransactionLogsDiskUsage` metric detects a missed backup window. AWS documents that metric as PostgreSQL transaction log disk usage. I corrected the section title, comments, alarm name, and resource name to match the metric's actual behavior.
- The restore monitoring example labeled `StatusInfos` as `Progress`, which is misleading because it is status detail rather than a progress counter. I changed the query label to `Details`.
- The PITR wording was slightly too broad at the current edge of the retention window. I updated the introduction and conclusion to reflect restoration up to the latest restorable time.

## Review Notes
- The example pins `engine_version = "16.2"`. That version is documented in the current Amazon RDS for PostgreSQL release notes, but exact engine-version availability can vary by Region and account context.
- For encrypted cross-account snapshot sharing, the target account must also have access to the customer-managed KMS key. The post now notes this caveat.
