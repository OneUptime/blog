# Validation Summary: How to Configure COS Backend for Terraform State (Tencent Cloud)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform COS backend
- Tencent Cloud Object Storage (COS)
- Tencent Cloud Terraform provider
- COSCLI
- Tencent Cloud CAM/IAM policies
- COS versioning, encryption, logging, lifecycle, and replication

## Sources Consulted
- Terraform COS backend documentation: https://developer.hashicorp.com/terraform/language/backend/cos
- Terraform backend configuration documentation: https://developer.hashicorp.com/terraform/language/backend
- TencentCloud Terraform provider `tencentcloud_cos_bucket` resource: https://registry.terraform.io/providers/tencentcloudstack/tencentcloud/latest/docs/resources/cos_bucket
- Tencent Cloud COSCLI overview: https://intl.cloud.tencent.com/document/product/436/43249
- Tencent Cloud COSCLI bucket creation (`mb`): https://www.tencentcloud.com/pt/document/product/436/43252
- Tencent Cloud COSCLI bucket versioning: https://www-sg.tencentcloud.com/document/product/436/69256
- Tencent Cloud COSCLI copy/download (`cp`) with `--version-id`: https://www-sg.tencentcloud.com/document/product/436/43256
- Tencent Cloud COS bucket policy documentation: https://intl.cloud.tencent.com/document/product/436/45235
- Tencent Cloud COS policy condition syntax documentation: https://intl.cloud.tencent.com/document/product/436/46205
- Tencent Cloud COS lifecycle documentation: https://intl.cloud.tencent.com/document/product/436/54316

## Issues Found
- The post originally said the COS backend does not have built-in state locking. Terraform's COS backend documentation states that it supports state locking through the `tencentcloud-terraform-lock` tag key, so the locking section and summary were corrected.
- The post used `tccli cos ...` commands for bucket creation, versioning, object version listing, object recovery, logging, and replication. COS documentation uses COSCLI commands for these workflows, so the bucket creation and versioning/recovery examples were replaced with valid `coscli` commands. Logging and replication were changed to Terraform provider examples where the original CLI examples were not valid TCCLI syntax.
- The post showed a `kms_key_id` argument inside the Terraform `backend "cos"` block. Terraform's COS backend only documents `encrypt` for AES256 SSE-COS and does not support `kms_key_id`, so the SSE-KMS example was changed to configure bucket-level KMS encryption with `tencentcloud_cos_bucket`.
- The bucket policy used uppercase policy element keys. Tencent Cloud COS policy syntax requires lowercase elements such as `statement`, `principal`, `effect`, `action`, and `resource`, so the JSON policy was corrected.
- The partial backend configuration examples passed credentials through `-backend-config` and a backend config file. Terraform documents that backend config values are stored in `.terraform` and plan files, so the examples were changed to pass only the bucket through backend config and keep credentials in environment variables.

## Review Notes
Terraform was not installed in the local environment, so snippets were reviewed statically against official Terraform and Tencent Cloud documentation. The replication and logging examples assume the bucket is managed by Terraform; for an existing bucket, import it before applying those resource attributes.
