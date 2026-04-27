# Validation Summary: How to Create Unique Resource Names with Random Suffixes in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL2 language)
- `random_id` resource (hashicorp/random provider)
- AWS provider — `aws_s3_bucket`
- Azure provider — `azurerm_storage_account`, `azurerm_key_vault`
- HCL built-in functions: `lower`, `replace`, `substr`, `format`, `lookup`, `range`, `regex`, `can`
- Lifecycle `precondition` blocks

## Sources Consulted
- HCL native syntax spec — https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md (body grammar requires Newline-terminated attributes; semicolons are not valid separators)
- Terraform `substr` function docs — https://developer.hashicorp.com/terraform/language/functions/substr (signature is `substr(str, offset, length)`)
- `random_id` resource docs — https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/id
- `aws_s3_bucket` resource docs — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket (`bucket` argument takes the name, not a `s3://` URI)
- Azure resource name rules (Microsoft.KeyVault and Microsoft.Storage) — https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules

## Issues Found
1. **Invalid HCL syntax — semicolon-separated attributes (Step 1)**: The `variable "suffix"` block was written as `{ type = string; default = "" }`. HCL2 grammar requires each attribute to be Newline-terminated within a block body; semicolons are not valid attribute separators. Fixed by splitting the two attributes onto separate lines inside a multi-line block.
2. **Incorrect S3 bucket name format (Step 2)**: The `local.names.bucket` value was prefixed with `s3://`. The `bucket` argument on `aws_s3_bucket` (and any S3 bucket name) is just the bare name — the `s3://` URI scheme is for client tooling, not the resource argument. The actual `aws_s3_bucket.assets` resource a few lines below correctly omitted the prefix, so the local was inconsistent with how it would be used. Removed the `s3://` prefix to match the bucket name format.

## Review Notes
- The Azure Key Vault precondition regex (`^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]$`) enforces start-with-letter and end-with-letter-or-digit, but does not enforce Azure's "no consecutive hyphens" rule. The post does not claim it does, so this is not an error — just a tightening opportunity if a future revision wants strict parity with Azure rules.
- The storage_name construction in Step 1 truncates first (`substr` to 24) then strips hyphens. If the inputs contain hyphens, this can produce names shorter than 24 characters. Logically correct since Azure requires no hyphens, but worth being aware of.
- `random_id` with `byte_length = 4` produces an 8-hex-char suffix as claimed. The `keepers` block correctly ties regeneration to project/environment changes.
- All other technical claims (Azure storage 3-24 chars lowercase alphanumeric, Key Vault 3-24 chars, `format("%s-%02d", ...)` zero-padding, `substr` offset/length semantics) verified against official docs.
