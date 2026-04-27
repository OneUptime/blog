# Validation Summary: How to Use Workspaces with Remote Backends in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu / Terraform (workspaces + backends)
- AWS S3 backend
- Google Cloud Storage (GCS) backend
- Azure Blob Storage (azurerm) backend
- PostgreSQL (pg) backend
- AWS IAM policies
- Bash / AWS CLI

## Sources Consulted
- OpenTofu / Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- OpenTofu / Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/backend/gcs
- OpenTofu / Terraform azurerm backend documentation: https://developer.hashicorp.com/terraform/language/backend/azurerm
- OpenTofu / Terraform pg backend documentation: https://developer.hashicorp.com/terraform/language/backend/pg
- Backend source: `internal/backend/remote-state/s3/backend_state.go` (`path.Join(workspaceKeyPrefix, name, keyName)`)
- Backend source: `internal/backend/remote-state/azure/backend_state.go` (`keyName + "env:" + name`)
- Backend source: `internal/backend/remote-state/gcs/backend_state.go` (`path.Join(prefix, name+".tfstate")`)
- Backend source: `internal/backend/remote-state/pg/backend.go` (CREATE TABLE definition)
- AWS S3 IAM action reference: https://docs.aws.amazon.com/AmazonS3/latest/userguide/list_amazons3.html

## Issues Found

1. **S3 default workspace path layout was wrong (first tree).** The post claimed staging state lives at `infrastructure/env:/staging/terraform.tfstate`. The actual S3 backend constructs the path as `path.Join(workspace_key_prefix, workspace_name, key)`, which prepends `env:/` at the bucket root, not inside the key prefix. Corrected the tree to show `env:/staging/infrastructure/terraform.tfstate` and `env:/production/infrastructure/terraform.tfstate`.

2. **`aws s3 ls` example listed the wrong prefix.** Listing `s3://acme-tofu-state/infrastructure/` would not return the per-workspace state files because they live at the bucket root under `env:/`. Changed the listing to recurse from the bucket root and updated the expected output to the correct paths.

3. **Backup script used the wrong workspace path.** The script copied from `s3://$BUCKET/$PREFIX/env:/$WS/terraform.tfstate`. Corrected to `s3://$BUCKET/env:/$WS/$PREFIX/terraform.tfstate` so it actually fetches the file the S3 backend writes.

4. **IAM policy had a wrong Resource ARN and an inapplicable condition.** The Resource pointed at `arn:aws:s3:::acme-tofu-state/infrastructure/env:/staging/*`, which does not match where state is stored. Also, the `s3:prefix` condition key only applies to `s3:ListBucket` / `s3:ListBucketVersions`, not to `s3:GetObject` / `s3:PutObject` — including it on object actions would cause the statement to never match. Updated the Resource to `arn:aws:s3:::acme-tofu-state/env:/staging/infrastructure/*` and removed the inapplicable `Condition` block. The Resource ARN itself provides the path-based isolation the post intends.

5. **PostgreSQL query referenced wrong identifiers.** The post selected `length(state)` from `terraform_state`. The pg backend actually creates `terraform_remote_state.states` with a `data` column (per the backend's CREATE TABLE). Updated the SQL accordingly.

6. **Conclusion described the S3 layout incorrectly.** It said S3 puts `env:/workspace-name/` "under the key prefix"; in reality the workspace prefix is prepended at the bucket root, ahead of the entire key. Rewrote the sentence to describe the actual layout (`<workspace_key_prefix>/<workspace_name>/` prepended at the bucket root).

## Review Notes
- The Azure path concatenation is genuinely separator-less (`keyName + "env:" + name`), which is what the post showed — kept as-is.
- The custom `workspace_key_prefix = "workspaces"` example was already correct (`workspaces/staging/infrastructure/terraform.tfstate`) and matches the `path.Join` behavior.
- The S3 backend has been evolving — newer Terraform/OpenTofu releases continue to support the `workspace_key_prefix` setting and the default `"env:"` value, so the corrected paths apply to current versions.
- The pg backend's `schema_name` is configurable; the post's query assumes the default `terraform_remote_state`, which is the most common case.
