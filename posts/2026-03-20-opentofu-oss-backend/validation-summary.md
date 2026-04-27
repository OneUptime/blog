# Validation Summary: How to Configure the OSS Backend (Alibaba Cloud) in OpenTofu - Opentofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (and Terraform-compatible HCL backend configuration)
- Alibaba Cloud Object Storage Service (OSS)
- Alibaba Cloud TableStore (OTS) — used for state locking
- Alibaba Cloud RAM (Resource Access Management) policies
- Alibaba Cloud STS (Security Token Service)
- aliyun CLI and Tablestore CLI (`ts`)

## Sources Consulted
- OpenTofu OSS backend documentation: https://opentofu.org/docs/language/settings/backends/oss/
- Alibaba Cloud OSS `mb` command reference: https://www.alibabacloud.com/help/en/oss/developer-reference/mb
- Alibaba Cloud OSS `bucket-versioning` command reference: https://www.alibabacloud.com/help/en/oss/developer-reference/bucket-versioning
- Tablestore CLI table operations: https://www.alibabacloud.com/help/en/tablestore/developer-reference/widecolumn-modeled-data-table-operations-with-tablestore-cli
- Aliyun CLI STS API operations: https://www.alibabacloud.com/help/doc-detail/2841085.html
- Common examples of OSS RAM policies: https://www.alibabacloud.com/help/en/oss/user-guide/common-examples-of-ram-policies
- Custom permissions of Tablestore (RAM): https://www.alibabacloud.com/help/en/tablestore/custom-permissions-of-tablestore

## Issues Found
1. **Invalid `server_side_encryption` field in the OSS backend HCL block.** The OpenTofu OSS backend does not support a `server_side_encryption` argument (that field belongs to the S3 backend). The OSS backend only exposes the boolean `encrypt`, which enables AES256 server-side encryption when set to `true`. Removed `server_side_encryption = "AES256"` from the encryption example and added a one-line note that `encrypt = true` enables AES256.
2. **`aliyun oss mb` did not accept `--region`.** The OSS `mb` command uses `-e <endpoint>` to target a region, not `--region`. Changed `aliyun oss mb oss://acme-tofu-state --region cn-hangzhou` to `aliyun oss mb oss://acme-tofu-state -e oss-cn-hangzhou.aliyuncs.com`.
3. **Incorrect `bucket-versioning` syntax.** The status is a positional argument (lowercase `enabled`/`suspended`), and there is no `--payer` flag on this command. Replaced the multi-line invocation with `aliyun oss bucket-versioning --method put oss://acme-tofu-state enabled`.
4. **Invented `aliyun tablestore CreateTable` invocation.** The `--TableMeta.TableName` / `--TableMeta.PrimaryKey.0.Name` style flags are not part of the documented Tablestore CLI. Replaced with the documented Tablestore CLI command: `ts create -t terraform_lock --pk '[{"c":"LockID", "t":"string"}]'`, and noted that the instance must be created first (typically via the console).
5. **Unrealistic Alibaba Cloud account ID in the AssumeRole example.** Alibaba Cloud account IDs are 16 digits. Changed `acs:ram::123456789:role/TofuStateRole` to `acs:ram::1234567890123456:role/TofuStateRole`.

## Review Notes
- The OSS backend configuration field names (`region`, `bucket`, `prefix`, `access_key`, `secret_key`, `tablestore_endpoint`, `tablestore_table`, `encrypt`, `acl`) all match the official OpenTofu documentation.
- Environment variable names (`ALICLOUD_ACCESS_KEY`, `ALICLOUD_SECRET_KEY`, `ALICLOUD_REGION`, `ALICLOUD_SECURITY_TOKEN`) are correct. Aliases such as `ALICLOUD_ACCESS_KEY_ID` / `ALICLOUD_ACCESS_KEY_SECRET` / `ALICLOUD_DEFAULT_REGION` are also accepted but not required to mention.
- The TableStore endpoint format `https://<instance>.<region>.ots.aliyuncs.com` and the `LockID` (String) primary-key requirement are correct per official docs.
- RAM policy actions (`oss:GetObject`, `oss:PutObject`, `oss:DeleteObject`, `oss:ListObjects`, `ots:GetRow`, `ots:PutRow`, `ots:UpdateRow`, `ots:DeleteRow`) and the resource ARN formats for OSS and OTS are correct. For broader bucket-level operations such as `oss:ListObjects`, users may also need the bare bucket ARN (`acs:oss:*:*:acme-tofu-state`); the example narrows scope to the `production/` prefix, which is acceptable for this guide.
- The post does not show the optional `key` argument (default `terraform.tfstate`); this is fine since the default is sensible.
