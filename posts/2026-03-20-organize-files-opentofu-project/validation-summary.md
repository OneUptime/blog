# Validation Summary: How to Organize Files in an OpenTofu Project

## Status
validated

## Post Type
Guide / Best Practices

## Technologies Covered
- OpenTofu (tofu CLI)
- Terraform/OpenTofu HCL configuration language
- AWS provider (hashicorp/aws)
- Infrastructure as Code project structure
- Module composition patterns

## Sources Consulted
- OpenTofu Dependency Lock File documentation: https://opentofu.org/docs/language/files/dependency-lock/
- OpenTofu Command: init: https://opentofu.org/docs/cli/commands/init/
- OpenTofu Command: plan: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu Settings (terraform block): https://opentofu.org/docs/language/settings/
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu Workspaces documentation
- HashiCorp Terraform standard `.gitignore` conventions

## Issues Found

1. **Incorrect `.gitignore` entries (fixed)**: The `.gitignore` listed `.terraform.tfstate` and `.terraform.tfstate.backup` (with leading dots). These files do not exist in standard Terraform/OpenTofu projects — state files are named `terraform.tfstate` and `terraform.tfstate.backup` (no leading dot) and are already covered by the `*.tfstate` pattern. Replaced the incorrect entries with the standard `*.tfstate` and `*.tfstate.*` patterns recommended by HashiCorp's official template, and added `crash.*.log` to match the standard.

2. **Misleading section title (fixed)**: Pattern 3 was titled "Multi-Environment with Workspaces", but the content does not actually use OpenTofu workspaces (which are managed via `tofu workspace new/select/list`). The pattern shown uses separate `.tfvars` files and backend configuration files — a different, valid technique. Renamed the section to "Multi-Environment with Variable Files" to accurately describe the approach.

## Review Notes

- The `terraform { ... }` block syntax is intentionally retained in OpenTofu for compatibility, so its use here is correct.
- The `hashicorp/aws` provider source is still valid in OpenTofu and remains the most common choice; the alternative `opentofu/aws` mirror exists but is not required.
- The `aws_subnet` example references `var.availability_zones`, `var.tags`, and `var.enable_dns_hostnames` which are not declared in the abbreviated `variables.tf` snippet shown. These are illustrative excerpts rather than complete files, so this is acceptable for a structural guide.
- Excluding `*.auto.tfvars` from version control is a stylistic choice; some teams commit non-sensitive auto.tfvars. The post's negation pattern (`!example.auto.tfvars`) handles the common need to ship example files.
- OpenTofu 1.6.0 is the minimum version specified in the documentation example, which is correct as the first stable release of OpenTofu.
