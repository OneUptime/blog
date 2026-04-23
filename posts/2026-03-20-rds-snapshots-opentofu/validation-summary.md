# Validation Summary: How to Create RDS Snapshots with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- AWS Provider for Terraform/OpenTofu
- Amazon RDS
- RDS manual snapshots
- Cross-region snapshot copy
- Cross-account snapshot sharing

## Sources Consulted
- OpenTofu `timestamp` function: https://opentofu.org/docs/language/functions/timestamp/
- AWS provider docs for `aws_db_snapshot`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_snapshot.html.markdown
- AWS provider docs for `aws_db_snapshot_copy`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_snapshot_copy.html.markdown
- AWS provider docs for `aws_db_instance`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- AWS provider source for RDS snapshot schema and identifiers: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/internal/service/rds/snapshot.go
- AWS provider source for RDS snapshot copy schema: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/internal/service/rds/snapshot_copy.go
- Null provider docs for `null_resource`: https://raw.githubusercontent.com/hashicorp/terraform-provider-null/main/docs/resources/resource.md
- Amazon RDS backup and restore overview: https://docs.aws.amazon.com/AmazonRDS/latest/gettingstartedguide/managing-backup-restore.html
- Sharing a DB snapshot for Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ShareSnapshot.html
- Sharing encrypted snapshots for Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/share-encrypted-snapshot.html
- Copying a DB snapshot for Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CopySnapshot.html
- Deleting a DB instance: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_DeleteInstance.html
- Amazon RDS for PostgreSQL updates: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html

## Issues Found
- The post used `aws_db_instance.main.id` where the AWS provider expects the DB instance identifier for `db_instance_identifier`. I changed those references to `aws_db_instance.main.identifier` because the provider documents `identifier` as the instance name and `id` is no longer the right field for this use.
- The snapshot identifier examples used `timestamp()` inside managed resource arguments. OpenTofu documents that `timestamp()` changes every run and causes diffs on every apply, so I replaced those identifiers with a stable `var.snapshot_suffix` and added that prerequisite.
- The `aws_db_snapshot_copy` example used `source_region`, but the provider documents `source_region` as a computed attribute, not a configurable argument. I replaced it with the supported `destination_region` argument and kept the destination-region provider alias explicit.
- The cross-account sharing example used `null_resource` plus `local-exec` and the AWS CLI even though the AWS provider natively supports snapshot sharing with `shared_accounts`. I replaced the imperative example with the provider-supported configuration and added the AWS-documented caveat that snapshots encrypted with the default AWS managed KMS key can't be shared across accounts.
- The restore example said `skip_final_snapshot` was required for snapshot restores. That is incorrect; it only controls whether a final snapshot is taken when the restored instance is later deleted. I corrected the comment and made the snapshot reference explicit.
- The final-snapshot-before-destroy example enabled `deletion_protection = true`, which AWS documents as preventing deletion. I changed it to `false` so the example matches the stated destroy workflow, and I made the final snapshot identifier use the stable suffix so the example does not depend on a reused hard-coded name.

## Review Notes
- The post is technically relevant and salvageable; it is a code-based infrastructure guide.
- `tofu` and the AWS CLI were not installed in the local review environment, so validation was performed against official OpenTofu, AWS provider, and AWS RDS documentation rather than by executing the snippets.
- The Step 2 example assumes an aliased provider named `aws.dr_region` is configured elsewhere for the destination Region; the post now states that assumption directly.
- For encrypted shared snapshots, AWS allows sharing only with specific accounts and the target account typically copies the shared snapshot before restoring from it.
