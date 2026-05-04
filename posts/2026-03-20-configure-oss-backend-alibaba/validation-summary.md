# Validation Summary: How to Configure the OSS Backend (Alibaba Cloud) in OpenTofu

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTofu (state backend configuration)
- Alibaba Cloud Object Storage Service (OSS)
- Alibaba Cloud Table Store (OTS) — used for state locking
- Alibaba Cloud RAM (policies and roles)
- Alibaba Cloud KMS (referenced for SSE-KMS)
- Alibaba Cloud CLI (`aliyun`) and `ossutil`
- HCL (Terraform/OpenTofu configuration language)

## Sources Consulted
- OpenTofu OSS backend documentation: https://opentofu.org/docs/language/settings/backends/oss/
- OpenTofu OSS backend source (schema): https://github.com/opentofu/opentofu/tree/main/internal/backend/remote-state/oss (`backend.go`)
- aliyun-cli OSS bucket-versioning source: https://github.com/aliyun/aliyun-cli/blob/master/oss/lib/bucket_versioning.go
- Alibaba Cloud OSS docs — bucket-versioning command: https://www.alibabacloud.com/help/en/oss/developer-reference/bucket-versioning
- Alibaba Cloud OSS docs — `mb` command: https://www.alibabacloud.com/help/en/oss/developer-reference/mb
- Alibaba Cloud CLI options & flags: https://www.alibabacloud.com/help/en/cli/command-line-options
- ossutil project: https://github.com/aliyun/ossutil

## Issues Found
1. **Unsupported `kms_key_id` argument in the OSS backend block.** The post listed `kms_key_id` as an optional argument in Step 3 and showed a full "KMS-based encryption" example using `kms_key_id = "your-kms-key-id"`. The OpenTofu OSS backend schema (`backend.go`) does not declare a `kms_key_id` (or any KMS-related) field — only a boolean `encrypt`. Using `kms_key_id` would cause `tofu init` to fail with an "unsupported argument" error. **Fix:** Removed the commented-out `kms_key_id` line from the Step 3 example, removed the bogus KMS-based HCL backend block, and replaced it with a short paragraph explaining that the backend only supports SSE-OSS via `encrypt`, and that SSE-KMS for state objects must be configured at the bucket level (default encryption) rather than in the backend block.

2. **Incorrect `aliyun oss bucket-versioning` syntax.** The post used `--method put ... --configuration '<?xml ...><VersioningConfiguration><Status>Enabled</Status></VersioningConfiguration>'`. Per the official `bucket-versioning` documentation and the aliyun-cli source, the CLI takes a positional argument (`enabled` or `suspended`) rather than an XML body via `--configuration`. **Fix:** Changed the command to `aliyun oss bucket-versioning --method put oss://my-terraform-state enabled`.

## Review Notes
- The OSS backend's supported arguments (`region`, `bucket`, `prefix`, `key`, `tablestore_endpoint`, `tablestore_table`, `encrypt`, `endpoint`, `access_key`, `secret_key`, etc.) and the supported environment variables (`ALICLOUD_ACCESS_KEY`, `ALICLOUD_SECRET_KEY`, `ALICLOUD_REGION`) used in the post all match the current OpenTofu schema.
- The Table Store endpoint format (`<instance>.<region>.ots.aliyuncs.com`) is correct.
- The `Version: "1"` policy version, `acs:oss:*:*:bucket` resource ARN format, and the OSS / OTS action names (`oss:GetObject`, `oss:PutObject`, `oss:DeleteObject`, `oss:ListObjects`, `oss:GetBucketInfo`, `ots:GetRow`, `ots:PutRow`, `ots:DeleteRow`) are valid Alibaba Cloud RAM constructs and are sufficient for the backend's read/write/lock operations.
- `aliyun oss mb oss://... --region cn-hangzhou` is acceptable: `--region` is a recognized global flag of the Alibaba Cloud CLI / ossutil.
- The `aliyun ots CreateTable` invocation with `--instance-name`, `--table-meta`, and `--reserved-throughput` JSON arguments matches the Tablestore REST-API-style invocation exposed by the aliyun CLI; users still need to create the OTS instance separately (the post correctly notes this via the console).
- `tofu init` and `tofu state list` are correct OpenTofu commands.
- Minor future improvement: the second "Optional: endpoint" line under Step 3 is redundant when `region` is already set; it's not wrong, just unnecessary unless using a custom endpoint (e.g., VPC-internal). Left as-is to avoid restructuring.
