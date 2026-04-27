# Validation Summary: How to Understand the OpenTofu Write-Plan-Apply Workflow

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (HCL configuration, CLI, state, workflow)
- Terraform-compatible HCL syntax (`terraform` block, providers, backends)
- AWS provider (`hashicorp/aws` ~> 5.0)
- AWS resources (`aws_vpc`, `aws_subnet`)
- S3 remote state backend
- Bash workflow scripting
- GitHub Actions (`opentofu/setup-opentofu@v1`, `actions/checkout@v4`, `actions/upload-artifact@v4`, `actions/download-artifact@v4`)

## Sources Consulted
- OpenTofu CLI commands documentation: https://opentofu.org/docs/cli/commands/
- OpenTofu `plan` reference: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `fmt` reference: https://opentofu.org/docs/cli/commands/fmt/
- OpenTofu language settings (`terraform` block): https://opentofu.org/docs/language/settings/
- OpenTofu state docs (default `terraform.tfstate`): https://opentofu.org/docs/language/state/
- `opentofu/setup-opentofu` GitHub Action: https://github.com/opentofu/setup-opentofu
- OpenTofu releases on GitHub (version verification)

## Issues Found
- **Non-existent OpenTofu version `1.9.0`** in the GitHub Actions workflow. The OpenTofu release line jumped from `1.8.x` directly to `1.10.x` — there is no `1.9.x` series. As of 2026-04-27 the current stable is `1.11.6`. Fixed by changing `tofu_version: "1.9.0"` to `tofu_version: "1.11.6"`.

## Review Notes
- The post uses the `terraform { ... }` settings block, which OpenTofu still accepts for compatibility. OpenTofu also offers an optional `tofu { ... }` block (since 1.8) for OpenTofu-only settings, but using `terraform` is fully valid and more portable.
- The provider source `hashicorp/aws` resolves correctly through OpenTofu's registry (`registry.opentofu.org/hashicorp/aws`) — no source change is required for OpenTofu users.
- The `plan` job in the CI/CD example does not pin a `tofu_version`, so it will pull `latest` from the setup action; if reproducibility across jobs is desired, consider pinning the same version in every job.
- All CLI flags (`-out`, `-input=false`, `-var-file`, `-check`, `-recursive`) and `tofu state list` / `tofu state show` subcommands are accurate.
- The `apply` job re-runs `tofu init` after downloading the saved plan, which is required because `.terraform/` is not part of the artifact — this is correct.
