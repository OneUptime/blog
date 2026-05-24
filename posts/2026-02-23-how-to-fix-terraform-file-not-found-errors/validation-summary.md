# Validation Summary: How to Fix Terraform File Not Found Errors

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- Terraform (HCL configuration language)
- Terraform built-in functions: `file()`, `templatefile()`, `fileexists()`, `fileset()`, `trimsuffix()`
- Terraform path references: `path.module`, `path.root`, `path.cwd`
- Terraform `tls` provider (hashicorp/tls): `tls_private_key`, `tls_self_signed_cert`
- AWS provider resources: `aws_instance`, `aws_iam_server_certificate`, `aws_ssm_parameter`
- Terraform Cloud / remote execution
- `null_resource` and `local-exec` provisioner

## Sources Consulted
- Terraform path references documentation: https://developer.hashicorp.com/terraform/language/expressions/references#filesystem-and-workspace-info
- `file` function documentation: https://developer.hashicorp.com/terraform/language/functions/file
- `templatefile` function documentation: https://developer.hashicorp.com/terraform/language/functions/templatefile
- `fileexists` function documentation: https://developer.hashicorp.com/terraform/language/functions/fileexists
- `fileset` function documentation: https://developer.hashicorp.com/terraform/language/functions/fileset
- `trimsuffix` function documentation: https://developer.hashicorp.com/terraform/language/functions/trimsuffix
- hashicorp/tls provider documentation: https://registry.terraform.io/providers/hashicorp/tls/latest/docs (for `tls_private_key` and `tls_self_signed_cert`)
- AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs (for `aws_iam_server_certificate`, `aws_ssm_parameter`)
- Terraform CLI `output` command documentation (verified `-raw` flag): https://developer.hashicorp.com/terraform/cli/commands/output

## Issues Found
No technical issues found.

All technical claims and code samples were verified:
- The three path references (`path.module`, `path.root`, `path.cwd`) and their semantics are correctly described.
- The `file()` and `templatefile()` error messages match the actual format Terraform emits.
- The note that `file()` runs at plan time (so it cannot read files generated during apply) is accurate.
- `tls_private_key` arguments (`algorithm`, `rsa_bits`) and output (`private_key_pem`) are correct.
- `tls_self_signed_cert` arguments (`private_key_pem`, `subject` block with `common_name`, `validity_period_hours`, `allowed_uses`) and output (`cert_pem`) are correct.
- `aws_iam_server_certificate` arguments (`certificate_body`, `private_key`) are correct.
- `fileset(path, pattern)` signature and use with `for_each` is correct.
- `trimsuffix()` usage is correct.
- The `terraform output -raw` flag is valid.

## Review Notes
- The case-sensitivity claim about macOS is a reasonable simplification. macOS's default filesystem (APFS) is case-insensitive by default but can be configured case-sensitive; readers using a case-sensitive macOS volume would still see the Linux behavior. This level of detail is not necessary for the guide.
- The hashicorp/tls provider's `tls_self_signed_cert` `subject` block accepts other DN components (e.g., `organization`, `organizational_unit`) — the example only uses `common_name`, which is valid and minimal.
- The `null_resource` example in Fix 3 is intentionally an anti-pattern; the post correctly steers users toward native Terraform resources instead.
- `path.cwd` and `path.root` are typically equal unless Terraform is invoked from a different directory with `-chdir`. The post's example diagram simplifies this, which is fine for the audience.
