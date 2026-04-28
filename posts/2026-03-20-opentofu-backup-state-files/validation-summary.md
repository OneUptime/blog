# Validation Summary: How to Back Up OpenTofu State Files - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- OpenTofu (state management, `tofu state pull`/`push` commands)
- Terraform state file format
- AWS S3 (bucket versioning, lifecycle configuration, `s3api` CLI)
- AWS provider for OpenTofu/Terraform (`aws_s3_bucket_versioning`, `aws_s3_bucket_lifecycle_configuration`)
- Google Cloud Storage (GCS bucket versioning)
- Google provider for OpenTofu/Terraform (`google_storage_bucket`)
- Bash scripting and `jq` for JSON inspection

## Sources Consulted
- OpenTofu CLI documentation: https://opentofu.org/docs/cli/commands/state/
- OpenTofu local state backup behavior: https://opentofu.org/docs/language/state/backends/
- AWS provider `aws_s3_bucket_versioning`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- AWS provider `aws_s3_bucket_lifecycle_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- AWS CLI `s3api` reference: `aws s3api list-object-versions`, `copy-object`, `get-object`
- Google provider `google_storage_bucket`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket

## Issues Found
No technical issues found.

## Review Notes
- The `aws_s3_bucket_lifecycle_configuration` rule omits a `filter` block. This is technically valid (the rule applies to all objects when no filter or prefix is specified), but newer AWS provider versions (v5.x) may emit a warning recommending an explicit `filter {}` block. The example as written will function correctly.
- The post implicitly assumes an `aws_s3_bucket.state` resource is defined elsewhere (referenced by `aws_s3_bucket.state.id`). This is reasonable for a focused example.
- The `tofu state push` command accepts state files regardless of extension (`.json` or `.tfstate`) as long as the content is valid Terraform/OpenTofu state JSON. The post's use of `.json` extension is correct.
- Backup files saved via `tofu state pull` contain the full state JSON, so `jq '.resources | length'` correctly returns the resource count.
- The local state `.backup` file is overwritten on each successful state operation, so the post's advice to "keep it until the next successful operation" is accurate.
