# Validation Summary: How to Fix Terraform null_resource Always Running

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- Terraform (HCL)
- `null_resource` (hashicorp/null provider)
- `terraform_data` resource (built-in, Terraform 1.4+)
- Terraform provisioners (`local-exec`, including `when = destroy`)
- Terraform built-in functions (`filemd5`, `md5`, `sha256`, `jsonencode`, `fileset`, `templatefile`, `timestamp`, `uuid`)
- Terraform `triggers` / `triggers_replace` mechanics
- Terraform `moved` block (refactoring)
- AWS provider examples (`aws_instance`, `aws_s3_object`)
- Bash scripting for idempotent deployment

## Sources Consulted
- HashiCorp `null_resource` documentation: https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource
- HashiCorp `terraform_data` documentation: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- HashiCorp provisioner documentation (`local-exec`, `when = destroy`, `self`): https://developer.hashicorp.com/terraform/language/resources/provisioners/local-exec and https://developer.hashicorp.com/terraform/language/resources/provisioners/syntax
- HashiCorp `moved` block / refactoring docs: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- HashiCorp built-in functions: https://developer.hashicorp.com/terraform/language/functions
- AWS provider: `aws_s3_object` (current name; replaces deprecated `aws_s3_bucket_object`) and `aws_instance` `user_data`

## Issues Found
- **Incorrect `moved` block claim (Migration Path section)**: The original text said the `moved` block could be used to migrate `null_resource.deploy` → `terraform_data.deploy` and that "Terraform treats them as compatible types for state migration." This is wrong. Terraform's `moved` block requires the `from` and `to` arguments to refer to resources of the **same type**; cross-resource-type moves are not supported and would produce a configuration error. I rewrote the Migration Path section to explain this limitation and document the correct approaches: (1) simply replacing the resource definition and accepting the destroy/create cycle (safe since `null_resource` has no real infrastructure), and (2) using `terraform state rm null_resource.deploy` followed by `terraform apply` if the user wants to avoid destroying the old resource (e.g., to skip a `when = destroy` provisioner).

## Review Notes
- All HCL examples are syntactically valid and use current, non-deprecated APIs (e.g., `aws_s3_object` rather than the deprecated `aws_s3_bucket_object`).
- `terraform_data` was correctly attributed to Terraform 1.4, and the `triggers_replace`, `input`, and `output` arguments are described accurately.
- The `self.triggers.<key>` pattern in the destroy-time provisioner example is the officially recommended approach (destroy-time provisioners can only reference `self`, `count.index`, and `each.key`).
- The illustrative plan output in "The Problem" (`triggers = {} -> (known after apply)`) is a stylized example rather than the typical no-trigger case (a `null_resource` with no triggers and no config changes will not normally re-run on every apply). The fixes that follow address the realistic root causes (dynamic triggers, dependency changes, etc.), so the framing is acceptable.
- `triggers` on `null_resource` is technically a `map(string)`; values that are not already strings (e.g., the `md5(jsonencode(...))` example) return strings already, so the examples are valid.
