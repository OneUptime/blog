# Validation Summary: How to Use the terraform force-unlock Command

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Terraform CLI
- Terraform state locking
- Terraform remote state backends
- Amazon S3 and DynamoDB
- Azure Blob Storage
- Consul
- Google Cloud Storage
- PostgreSQL
- GitHub Actions

## Sources Consulted
- Terraform `force-unlock` command reference: https://developer.hashicorp.com/terraform/cli/commands/force-unlock
- Terraform state locking documentation: https://developer.hashicorp.com/terraform/language/state/locking
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform AzureRM backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- Terraform Consul backend documentation: https://developer.hashicorp.com/terraform/language/backend/consul
- Terraform PostgreSQL backend documentation: https://developer.hashicorp.com/terraform/language/backend/pg
- Terraform S3 backend implementation: https://github.com/hashicorp/terraform/blob/main/internal/backend/remote-state/s3/client.go
- Terraform GCS backend implementation: https://github.com/hashicorp/terraform/blob/main/internal/backend/remote-state/gcs/client.go
- Terraform PostgreSQL backend implementation: https://github.com/hashicorp/terraform/blob/main/internal/backend/remote-state/pg/client.go

## Issues Found
- The S3 section only described DynamoDB locking and treated it as the current/default S3 locking behavior. Current Terraform supports native S3 lock files with `use_lockfile = true`, while DynamoDB-based locking is deprecated. Updated the section to describe native `.tflock` locking first and label DynamoDB locking as deprecated.
- The DynamoDB examples used a `LockID` ending in `-md5`. Terraform uses the bucket/state path as the lock item `LockID`; the `-md5` suffix is used for a separate digest item. Updated the example `delete-item` and `get-item` keys.
- The PostgreSQL section claimed Terraform uses a `locks` table and that force-unlock deletes a row. The PostgreSQL backend uses advisory locks and official documentation notes that force-unlock is not supported because those locks are released when the database session ends. Replaced the incorrect SQL delete example with a `pg_locks` inspection query.

## Review Notes
Terraform CLI was not installed in the local workspace, so command syntax was validated against official HashiCorp documentation and Terraform source code rather than local `terraform --help` output.
