# Validation Summary: How to Store Terraform State in Ceph RGW S3

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform (S3 backend)
- Ceph RGW (RADOS Gateway)
- Rook (Ceph operator for Kubernetes)
- AWS CLI (for S3 operations)
- radosgw-admin CLI

## Sources Consulted
- Terraform S3 Backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform workspace state storage behavior: https://developer.hashicorp.com/terraform/language/state/workspaces
- Ceph RGW S3 compatibility documentation: https://docs.ceph.com/en/latest/radosgw/s3/

## Issues Found

1. **Deprecated `endpoint` parameter**: The `endpoint` parameter in the Terraform S3 backend was deprecated in Terraform 1.6+ in favor of the `endpoints` block syntax (`endpoints = { s3 = "..." }`). Updated both backend configuration blocks to use the current syntax.

2. **Deprecated `force_path_style` parameter**: The `force_path_style` parameter was deprecated in Terraform 1.6+ in favor of `use_path_style`. Updated both backend configuration blocks.

3. **Missing `skip_requesting_account_id`**: When using a non-AWS S3 endpoint, `skip_requesting_account_id = true` is needed to prevent Terraform from attempting AWS STS calls. Added this to both backend configuration blocks.

4. **Incorrect workspace state path**: The comment stated the workspace state path as `terraform-state/prod/kubernetes/env:/staging/terraform.tfstate`. Terraform's S3 backend stores workspace state using the `workspace_key_prefix` (default: `env:`) prepended to the workspace name, followed by the key. The correct path is `terraform-state/env:/staging/prod/kubernetes/terraform.tfstate`.

5. **Misleading summary claim**: The summary stated that `force_path_style = true` is "the only Ceph-specific requirement." In reality, multiple skip flags (`skip_credentials_validation`, `skip_requesting_account_id`, `skip_metadata_api_check`, `skip_region_validation`) are also required for non-AWS S3 endpoints. Updated the summary to accurately reflect all required settings.

## Review Notes
- The `radosgw-admin user create` command and AWS CLI bucket commands are correct.
- The environment variable approach (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`) is valid and correctly demonstrated.
- The post correctly notes that DynamoDB-based state locking is not available with Ceph RGW and mentions community solutions as an alternative.
