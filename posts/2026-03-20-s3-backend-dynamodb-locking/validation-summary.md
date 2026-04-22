# Validation Summary: How to Configure S3 Backend with DynamoDB Locking in OpenTofu (2)

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTofu S3 backend
- DynamoDB state locking and consistency checks
- AWS S3
- AWS DynamoDB
- AWS IAM policies
- AWS CLI
- Terraform/OpenTofu HCL
- HashiCorp AWS provider `aws_dynamodb_table`

## Sources Consulted
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu state locking documentation: https://opentofu.org/docs/language/state/locking/
- OpenTofu `force-unlock` command documentation: https://opentofu.org/docs/cli/commands/force-unlock/
- OpenTofu S3 backend implementation source for DynamoDB lock and digest records: https://raw.githubusercontent.com/opentofu/opentofu/main/internal/backend/remote-state/s3/client.go
- HashiCorp AWS provider `aws_dynamodb_table` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/dynamodb_table.html.markdown
- AWS CLI `dynamodb scan` command reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/scan.html
- AWS CLI `dynamodb get-item` command reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/get-item.html
- AWS CLI `dynamodb delete-item` command reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/delete-item.html
- Amazon DynamoDB on-demand capacity mode documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/on-demand-capacity-mode.html
- Amazon DynamoDB point-in-time recovery documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Point-in-time-recovery.html
- Amazon DynamoDB encryption at rest documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/EncryptionAtRest.html

## Issues Found
- The backend example and cross-region section implied `dynamodb_endpoint` should be used to place the DynamoDB lock table in a different AWS Region. OpenTofu's current S3 backend documentation defines `region` as the AWS Region for both the S3 bucket and DynamoDB table when DynamoDB locking is used, and `dynamodb_endpoint` is a deprecated custom endpoint setting. Updated the text and comments to require one configured backend region for both resources.
- The DynamoDB record example showed `Info` and `Digest` on the same item and used a `sha256` placeholder. OpenTofu stores the active lock as a `LockID` plus `Info` item and stores the state digest separately under `LockID` suffixed with `-md5`. Updated the example to show both records accurately.
- The `scan` command for active locks would also show non-lock digest rows. Added `--filter-expression "attribute_exists(Info)"` so the command lists active lock records.

## Review Notes
OpenTofu 1.10 and later support native S3 locking with `use_lockfile`, while current OpenTofu documentation states that both native S3 locking and DynamoDB locking remain fully supported. DynamoDB encryption at rest is always enabled by AWS; the explicit `server_side_encryption { enabled = true }` block configures DynamoDB to use the default AWS managed KMS key when no custom key is provided.
