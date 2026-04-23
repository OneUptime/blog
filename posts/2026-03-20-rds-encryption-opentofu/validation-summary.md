# Validation Summary: How to Set Up RDS Encryption with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Provider for Terraform/OpenTofu
- Amazon RDS
- AWS KMS
- AWS CLI
- PostgreSQL on RDS

## Sources Consulted
- Amazon RDS encryption overview: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html
- Amazon RDS KMS key management: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.Keys.html
- Copying a DB snapshot for Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CopySnapshot.html
- Restoring to a DB instance: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_RestoreFromSnapshot.html
- AWS CLI `copy-db-snapshot`: https://docs.aws.amazon.com/cli/latest/reference/rds/copy-db-snapshot.html
- AWS CLI `restore-db-instance-from-db-snapshot`: https://docs.aws.amazon.com/cli/latest/reference/rds/restore-db-instance-from-db-snapshot.html
- AWS CLI `wait db-snapshot-available`: https://docs.aws.amazon.com/cli/latest/reference/rds/wait/db-snapshot-available.html
- AWS provider `aws_db_instance` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- AWS provider `aws_kms_key` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/kms_key.html.markdown
- AWS provider RDS instance implementation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/internal/service/rds/instance.go
- OpenTofu CLI overview: https://opentofu.org/docs/cli/commands/
- OpenTofu `init`: https://opentofu.org/docs/cli/init/
- OpenTofu `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found
- The KMS key example included a custom key policy that was not a reliable RDS example. It referenced `data.aws_caller_identity.current` without declaring the data source, omitted the `kms:DescribeKey` permission AWS documents for using customer managed keys with RDS, and granted access directly to the `rds.amazonaws.com` service principal instead of following AWS’s documented grant model. I removed the custom policy so the example uses the default key policy and relies on the prerequisite IAM permissions.
- The AWS CLI workflow copied and restored snapshots immediately after creating them. In practice, those follow-up commands depend on the snapshots reaching `available`, so I added `aws rds wait db-snapshot-available` after snapshot creation and after snapshot copy.
- The OpenTofu restore example set `storage_encrypted` and `kms_key_id` on a DB instance restored from `snapshot_identifier`. The AWS restore API and the AWS provider’s restore path do not use those fields to encrypt the restored instance; the encryption comes from the encrypted snapshot copy itself. I removed those arguments and clarified that the restored instance inherits encryption from the encrypted snapshot.

## Review Notes
- The post is technically relevant and salvageable; it is a code-based infrastructure tutorial.
- `tofu` and `aws` were not installed in the local review environment, so validation was performed against official AWS, OpenTofu, and AWS provider documentation rather than by executing the snippets.
- The `password` argument in the `aws_db_instance` example remains technically valid, but the AWS provider documents that it is stored in state. A future revision could call that out if the blog wants stronger guidance around secret handling.
