# Validation Summary: How to Migrate Databases Between Regions with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS RDS
- AWS KMS
- AWS CLI
- HashiCorp AWS provider
- HCL

## Sources Consulted
- OpenTofu `timestamp` function: https://opentofu.org/docs/language/functions/timestamp/
- AWS provider docs for `aws_db_instance`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- AWS provider docs for `aws_db_snapshot_copy`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_snapshot_copy.html.markdown
- Amazon RDS User Guide, Copying a DB snapshot: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CopySnapshot.html
- Amazon RDS User Guide, Encrypting Amazon RDS resources: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html
- Amazon RDS User Guide, Creating a read replica: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.Create.html
- Amazon RDS User Guide, Promoting a read replica to be a standalone DB instance: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.Promote.html
- Amazon RDS API Reference, `RestoreDBInstanceFromDBSnapshot`: https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_RestoreDBInstanceFromDBSnapshot.html
- AWS CLI reference, `create-db-instance-read-replica`: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance-read-replica.html
- AWS CLI reference, `promote-read-replica`: https://docs.aws.amazon.com/cli/latest/reference/rds/promote-read-replica.html

## Issues Found
- The post used `timestamp()` directly in `db_snapshot_identifier`. OpenTofu documents that `timestamp()` changes every second and causes diffs on every run when used in resource arguments. I replaced it with a stable snapshot identifier so the example is idempotent.
- The `aws_db_snapshot_copy` example used `source_region`, which is not a supported input argument in the current AWS provider docs for this resource. I removed it.
- The restore example implied that snapshot-restore encryption could be overridden with `storage_encrypted` and `kms_key_id` on `aws_db_instance`. AWS RDS expects KMS re-encryption to happen during the snapshot copy step, not during `RestoreDBInstanceFromDBSnapshot`, so I removed those lines from the restore example.
- The read replica section was too broad. AWS requires automated backups on the source DB instance, and cross-Region replicas depend on engine support. I tightened the wording to reflect those requirements.
- The cutover example used `tofu apply -var="db_endpoint=${NEW_DB_ENDPOINT}"`, but the post never defines such a variable and that command is not generally valid as written. I replaced it with a generic instruction to update application connection strings.
- The summary described cross-Region read replicas as "near-zero RPO". Because RDS read replicas are asynchronous, I changed the wording to the more accurate "lower RPO/RTO".

## Review Notes
- This post is accurate for Amazon RDS DB instances, not Aurora DB clusters. Aurora migrations use different resources and workflows.
- Cross-Region snapshot copies can require destination-Region option-group handling for engines that rely on nondefault option groups or TDE, especially Oracle and SQL Server.
