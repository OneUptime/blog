# Validation Summary: How to Create Linode Object Storage with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Linode Object Storage (S3-compatible)
- Linode Terraform Provider (`linode/linode`)
- AWS Terraform Provider (`hashicorp/aws`) used against an S3-compatible endpoint
- AWS S3 API (object lifecycle, virtual-hosted/path-style endpoints)

## Sources Consulted
- Terraform Registry / GitHub docs for the Linode provider:
  - `linode_object_storage_bucket` (https://github.com/linode/terraform-provider-linode/blob/main/docs/resources/object_storage_bucket.md)
  - `linode_object_storage_key` (https://github.com/linode/terraform-provider-linode/blob/main/docs/resources/object_storage_key.md)
- Linode Object Storage API documentation (permissions enum for keys, cluster/region naming)
- HashiCorp AWS provider docs for `provider "aws"` custom `endpoints` block and `aws_s3_object` resource

## Issues Found
- **Invalid permission value listed in comment.** The inline comment on the `linode_object_storage_key.bucket_access.permissions` line listed `write_only` as one of the valid options. The Linode Object Storage API and provider only accept `read_only` and `read_write`; `write_only` is not a valid permission. Fixed the comment to read `# read_only, read_write`.

## Review Notes
- The `cluster` argument on `linode_object_storage_bucket` and on the `bucket_access` block of `linode_object_storage_key` is supported but **deprecated** in current versions of the Linode provider in favor of `region` (e.g., `cluster = "us-east-1"` → `region = "us-east"`). The post's examples will still work, but readers writing new code may want to migrate to `region` going forward. This is a deprecation note, not a correctness issue, so no change was made to the code.
- The endpoint URL pattern `https://${cluster}.linodeobjects.com/${label}` uses path-style addressing, which Linode Object Storage supports. Virtual-hosted style (`https://${label}.${cluster}.linodeobjects.com`) is also supported and is generally preferred for S3 client compatibility, but path-style is correct.
- The AWS provider configuration for an S3-compatible endpoint is correct for v5.x: `skip_credentials_validation`, `skip_requesting_account_id`, and the `endpoints { s3 = ... }` block are the modern arguments. Depending on the user's environment, `skip_metadata_api_check = true` and/or `s3_use_path_style = true` may also be needed, but neither is strictly required for Linode Object Storage in most setups.
- `aws_s3_object` is the current (non-deprecated) S3 object resource in AWS provider v5.x; the older `aws_s3_bucket_object` resource was correctly avoided.
- The `lifecycle_rule` block's `id`, `enabled`, and nested `expiration { days = ... }` arguments are all valid for `linode_object_storage_bucket`.
