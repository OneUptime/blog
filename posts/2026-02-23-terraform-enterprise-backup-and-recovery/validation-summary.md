# Validation Summary: How to Handle Terraform Enterprise Backup and Recovery

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform Enterprise
- PostgreSQL backup and restore
- AWS RDS snapshots
- AWS S3 replication and sync
- Terraform AWS provider
- Azure Blob Storage CLI
- Bash and cron
- OpenSSL encryption

## Sources Consulted
- HashiCorp Terraform Enterprise backup and restore documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/manage/backup-restore
- HashiCorp Terraform Enterprise data storage settings overview: https://developer.hashicorp.com/terraform/enterprise/deploy/configuration/storage
- HashiCorp Terraform Enterprise Docker deployment documentation: https://developer.hashicorp.com/terraform/enterprise/deploy/docker
- HashiCorp Terraform Enterprise Admin Settings API: https://developer.hashicorp.com/terraform/enterprise/api-docs/admin/settings
- HashiCorp Terraform Enterprise Admin Organizations API: https://developer.hashicorp.com/terraform/enterprise/api-docs/admin/organizations
- HashiCorp Terraform Enterprise Admin Workspaces API: https://developer.hashicorp.com/terraform/enterprise/api-docs/admin/workspaces
- Terraform AWS provider `aws_s3_bucket_replication_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_replication_configuration
- AWS S3 replication documentation for SSE-KMS encrypted objects: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-config-for-kms-objects.html
- AWS CLI `rds modify-db-instance` documentation: https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-instance.html
- AWS CLI `rds create-db-snapshot` documentation: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-snapshot.html
- AWS CLI `s3 sync` documentation: https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html
- PostgreSQL `pg_dump` documentation: https://www.postgresql.org/docs/current/app-pgdump.html
- PostgreSQL `pg_restore` documentation: https://www.postgresql.org/docs/current/app-pgrestore.html
- Microsoft Azure CLI `az storage blob copy start-batch` documentation: https://learn.microsoft.com/en-us/cli/azure/storage/blob/copy

## Issues Found
- The post said TFE stores data in exactly three places. Updated this to scope the statement to external-services deployments and added an external Vault caveat, because Terraform Enterprise can use external Vault and its data must be part of recovery planning.
- PostgreSQL custom-format backups were named `.sql.gz`, which implies a plain SQL gzip file. Changed the examples to use a `.dump` extension because `pg_dump --format=custom` produces a pg_restore archive, not a plain SQL script.
- The S3 replication Terraform example enabled versioning only on the destination bucket. Added source bucket versioning and an explicit dependency because S3 replication requires versioning on both source and destination buckets before the replication configuration is applied.
- The S3 replication example configured a replica KMS key but did not opt in to replicate SSE-KMS encrypted source objects. Added `source_selection_criteria` with `sse_kms_encrypted_objects` enabled.
- The Azure Blob copy command provided the destination account name but no destination credential. Added `--account-key "${DESTINATION_KEY}"` so the command is self-contained.
- The configuration backup script claimed to export workspace configurations but only exported organizations. Added the official `/api/v2/admin/workspaces` endpoint.
- The full backup script used `set -e` while checking `$?` after commands. Rewrote those checks as `if ! command; then` blocks so failures are logged by the script before exiting.
- The cron setup command replaced the user's entire crontab. Changed it to append the backup job to the existing crontab.
- The restore example referenced the old backup filename pattern. Updated it to match the custom-format `.dump` backup filename.

## Review Notes
The examples assume a Terraform Enterprise deployment using external PostgreSQL and object storage. Disk-mode deployments and backup/restore API workflows have different operational details, and production recovery procedures should also verify TFE and PostgreSQL version compatibility before restore.
