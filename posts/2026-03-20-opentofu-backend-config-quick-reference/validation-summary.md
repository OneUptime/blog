# Validation Summary: How to Use the OpenTofu Backend Configuration Quick Reference

## Status
validated

## Post Type
Reference / Quick Reference Guide

## Technologies Covered
- OpenTofu (1.10+)
- AWS S3 backend (with native S3 locking via `use_lockfile`)
- AWS KMS / IAM (assume role for backend access)
- Azure Blob Storage backend (`azurerm`)
- Azure AD / Entra ID authentication
- Google Cloud Storage backend (`gcs`)
- HTTP backend (GitLab managed Terraform state)
- Local backend
- HCL configuration syntax

## Sources Consulted
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu Azure Blob (azurerm) backend documentation: https://opentofu.org/docs/language/settings/backends/azurerm/
- OpenTofu GCS backend documentation: https://opentofu.org/docs/language/settings/backends/gcs/
- OpenTofu HTTP backend documentation: https://opentofu.org/docs/language/settings/backends/http/
- OpenTofu local backend documentation: https://opentofu.org/docs/language/settings/backends/local/
- OpenTofu 1.10 release/RFC for native S3 locking via conditional writes: https://github.com/opentofu/opentofu/blob/main/rfc/20250211-s3-locking-with-conditional-writes.md

## Issues Found

1. **S3 backend used deprecated top-level `role_arn` and `session_name` arguments.**
   The OpenTofu S3 backend docs explicitly mark `role_arn` and `session_name` (and the other top-level `assume_role_*` arguments) as deprecated in favor of the nested `assume_role = { ... }` block. They still function but the docs direct users to the new form. Updated the example to use the `assume_role` block:
   ```hcl
   assume_role = {
     role_arn     = "arn:aws:iam::123456789012:role/OpenTofuStateRole"
     session_name = "opentofu-state"
   }
   ```

2. **Incorrect claim that the local backend has no locking.**
   The post stated "Local backend has no locking and is not suitable for team use." Per the OpenTofu local backend documentation, the local backend does lock state via system APIs (file locks). The reason it is unsuitable for team use is that the state file lives on local disk and is not shared. Updated the note to:
   "Local backend uses system file locks, but state is not shared, so it is not suitable for team use".

## Review Notes

- `use_lockfile = true` for native S3 locking is correct for OpenTofu 1.10+ and removes the DynamoDB requirement. The S3 bucket should still have object versioning enabled for reliable native locking (informational; not a correction).
- The Azure example uses `use_azuread_auth = true` together with `resource_group_name`. This is valid (the docs only mark `resource_group_name` as required when *not* using Entra ID auth — it is permitted but unnecessary when using Entra ID). Left unchanged because it is not technically wrong.
- The GCS `encryption_key` is correctly described as an optional CSEK (32-byte base64-encoded customer-supplied encryption key).
- All HTTP backend fields (`address`, `lock_address`, `unlock_address`, `username`, `password`, `lock_method`, `unlock_method`, `retry_wait_min`) are valid per the docs.
- `tofu init -migrate-state`, `tofu state list`, `tofu plan`, and `-backend-config=...` flags are all correct and current.
- Partial backend configuration via `-backend-config="key=value"` and `-backend-config=backend.hcl` is documented and works as described.
