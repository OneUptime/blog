# Validation Summary: Using Private Module Registries in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform / Terraform Cloud / Terraform Enterprise
- HCL (HashiCorp Configuration Language)
- Gitea (self-hosted registry option)
- Git (as a module source)
- Homebrew (for CLI installation)
- AWS (in module examples: VPC, EKS, RDS)

## Sources Consulted
- HashiCorp Terraform CLI Configuration: https://developer.hashicorp.com/terraform/cli/config/config-file
- HashiCorp `terraform login` docs: https://developer.hashicorp.com/terraform/cli/commands/login
- OpenTofu `tofu login` docs: https://opentofu.org/docs/cli/commands/login/
- HashiCorp Module Sources docs: https://developer.hashicorp.com/terraform/language/modules/sources
- HashiCorp `tfe` provider docs: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs
- HashiCorp Homebrew tap: https://github.com/hashicorp/homebrew-tap
- Gitea Terraform package docs: https://docs.gitea.com/usage/packages/terraform

## Issues Found

1. **Incorrect environment variable for terraform CLI authentication.** The "Publishing to Terraform Cloud Registry" section showed `export TFE_TOKEN="your-token"` as an alternative to `terraform login`. `TFE_TOKEN` is read by the `tfe` Terraform provider (and tooling like the Terraform Cloud Operator), **not** by the terraform CLI itself for registry/backend authentication. The documented CLI-level env var is `TF_TOKEN_<hostname>`. Replaced `TFE_TOKEN` with `TF_TOKEN_app_terraform_io` for consistency with the rest of the post and with the official CLI configuration documentation.

2. **Misleading "TFC CLI" comment.** The same code block had a comment "# Install the TFC CLI" above `brew install hashicorp/tap/terraform`. There is no separate "TFC CLI" — Terraform Cloud is operated via the same `terraform` (or `tofu`) binary. Updated the comment to "# Install the Terraform CLI (or use OpenTofu's `tofu login`)" to clarify this and acknowledge OpenTofu's equivalent.

## Review Notes

- The `terraform { ... }` block in the Self-Hosted Registry with Gitea section is empty (only contains a comment). It doesn't configure anything. The reference module source syntax is still correct per the Terraform Registry Protocol, but the block could either be filled in or removed in a future revision.
- Gitea's Terraform module registry support is relatively recent (landed in a late 2025 / 2026 Gitea release). The module-source format used in the post (`<host>/<namespace>/<module>/<provider>`) follows the standard Terraform Registry Protocol and is correct for any compliant registry. Readers using older Gitea versions may need an alternative (e.g., Git source).
- Since this is an OpenTofu post, readers may prefer `tofu login` and `~/.tofurc` over `terraform login` and `~/.terraformrc`. The post mentions both `~/.terraformrc or ~/.tofurc` correctly in the CLI Configuration File section.
- The first code block under "Terraform Cloud/Enterprise Private Registry" has a comment "# Configure the registry hostname" but the snippet itself only declares the AWS provider. The module reference below it implicitly addresses the registry via the source URL. Not technically incorrect, but the comment could be clearer.
- Module source format `app.terraform.io/<NAMESPACE>/<MODULE>/<PROVIDER>`, `credentials.tfrc.json` schema and path, and Git source syntax (`git::https://...`, `git::ssh://...`, `//subdir?ref=tag`) all verified correct against official docs.
