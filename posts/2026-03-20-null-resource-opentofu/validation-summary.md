# Validation Summary: How to Use null_resource in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- HashiCorp `null` provider (`hashicorp/null`)
- HCL (HashiCorp Configuration Language)
- `null_resource` resource
- `terraform_data` resource (modern alternative)
- Provisioners (`local-exec`, `remote-exec`)
- AWS provider resources (`aws_instance`, `aws_db_instance`) used in examples
- Ansible (referenced in a `local-exec` example)

## Sources Consulted
- Null Provider — Terraform Registry: https://registry.terraform.io/providers/hashicorp/null/latest/docs
- `null_resource` resource docs: https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource
- `terraform_data` resource — OpenTofu: https://opentofu.org/docs/language/resources/tf-data/
- `terraform_data` resource — HashiCorp Developer: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- `local-exec` provisioner: https://developer.hashicorp.com/terraform/language/resources/provisioners/local-exec
- `remote-exec` provisioner: https://developer.hashicorp.com/terraform/language/resources/provisioners/remote-exec
- `connection` block: https://developer.hashicorp.com/terraform/language/resources/provisioners/connection
- `plantimestamp()` function — OpenTofu: https://opentofu.org/docs/language/functions/plantimestamp/
- `filemd5()` function — OpenTofu: https://opentofu.org/docs/language/functions/filemd5/
- OpenTofu Releases — GitHub: https://github.com/opentofu/opentofu/releases
- Terraform 1.4 release notes (introduced `terraform_data`): https://www.hashicorp.com/en/blog/terraform-1-4-improves-the-cli-experience-for-terraform-cloud

## Issues Found
1. **Incorrect version claim for `terraform_data` in OpenTofu.** The post originally said "OpenTofu 1.4+ provides `terraform_data`...". OpenTofu's first release was 1.6.0 (January 2024) — there is no OpenTofu 1.4. The `terraform_data` resource was introduced in **Terraform 1.4** (March 2023), and OpenTofu inherited it from the forked Terraform codebase. Updated the wording to "OpenTofu provides `terraform_data` (inherited from Terraform 1.4+) as a cleaner alternative..." which is accurate.

## Review Notes
- All HCL examples are syntactically valid: `required_providers` block, `triggers` map, `provisioner "local-exec"` with heredoc command, `provisioner "remote-exec"` with `inline` list, and `connection` block all match current documentation.
- The `hashicorp/null` provider version constraint `~> 3.2` is current (latest stable is 3.2.x).
- `plantimestamp()` is correctly noted as an alternative to `timestamp()`; it was introduced in Terraform 1.5 and is available in all OpenTofu versions.
- `filemd5()` is correctly used to detect changes in a file's contents to drive `triggers`.
- For `terraform_data`, `triggers_replace` accepts any value type (not strictly a list); the post's example using a list is valid.
- Future caveat: HashiCorp's docs note that provisioners (both `local-exec` and `remote-exec`) are considered a last resort, and that `terraform_data` is the recommended replacement for `null_resource`. The post already nudges readers toward `terraform_data` in the "Modern Alternative" section, which is good guidance.
