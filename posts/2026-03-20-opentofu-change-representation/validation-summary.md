# Validation Summary: How OpenTofu Represents Infrastructure Changes

## Status
validated

## Post Type
Reference/Guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- Terraform plan output format (HCL diff representation)
- OpenTofu JSON plan format (`tofu show -json`)
- `jq` for JSON processing
- AWS provider resources (used as examples: `aws_s3_bucket`, `aws_instance`, `aws_db_instance`)
- Terraform/OpenTofu `lifecycle` block (`create_before_destroy`)

## Sources Consulted
- OpenTofu JSON Format documentation: https://opentofu.org/docs/internals/json-format/ — verified `actions` array values (`no-op`, `create`, `read`, `update`, `delete`, `delete+create`, `create+delete`, `forget`) and change object fields (`before`, `after`, `after_unknown`, `before_sensitive`, `after_sensitive`, `replace_paths`).
- OpenTofu `tofu plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- HashiCorp Terraform plan symbol reference issue: https://github.com/hashicorp/terraform/issues/14379 — confirmed `+`, `-`, `~`, `-/+`, `<=` symbol meanings.
- Terraform issue #17694 (https://github.com/hashicorp/terraform/issues/17694) — `+/-` display for `create_before_destroy` fixed in Terraform 0.12.0 (PR #19642), so the post's claim is correct for current OpenTofu versions.
- Spacelift Terraform plan blog (https://spacelift.io/blog/terraform-plan) — corroborated `+/-` vs `-/+` ordering semantics.

## Issues Found
No technical issues found.

The plan symbols (`+`, `-`, `~`, `-/+`, `+/-`, `<=`), color conventions (green/red/yellow/cyan), JSON `actions` array mappings, `tofu plan -out` / `tofu show -json` workflow, `(sensitive value)` and `(known after apply)` annotations, and `# forces replacement` comments all match official OpenTofu/Terraform documentation and observed CLI output.

## Review Notes
- Minor stylistic note (not a technical error): in the `-/+` replacement example, the `id` attribute is shown as `+ id = (known after apply)`. In real-world plan output, an existing resource being replaced would typically show `~ id = "i-old123" -> (known after apply)` because the attribute had a prior known value. The `+` representation is acceptable in a simplified illustrative context, and the symbol semantics being taught are still correct.
- The post does not mention the `["read"]` action (data source refresh) or `["forget"]` action (resource removal from state without destruction, added in OpenTofu 1.7+) in the JSON actions list. This is acceptable as the focus is on standard create/update/delete flows, but a future revision could mention these for completeness.
- The `<=` symbol for data source reads is shown in the symbol legend but no full example is given — fine for a reference post but could be expanded later.
- The post correctly captures behavior across current OpenTofu releases; nothing is version-locked to deprecated semantics.
