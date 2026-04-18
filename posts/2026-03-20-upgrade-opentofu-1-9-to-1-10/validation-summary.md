# Validation Summary: How to Upgrade OpenTofu from 1.9 to 1.10

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (tofu CLI)
- tofuenv (OpenTofu version manager)
- HCL (Terraform/OpenTofu configuration language)
- APT (Debian/Ubuntu package manager)
- GitHub Actions (`opentofu/setup-opentofu`)
- Git (tagging / version control)

## Sources Consulted
- OpenTofu official documentation: https://opentofu.org/docs/
- OpenTofu GitHub releases: https://github.com/opentofu/opentofu/releases
- OpenTofu CLI reference (`tofu version`, `tofu providers`, `tofu init`, `tofu validate`, `tofu fmt`, `tofu plan`, `tofu show`, `tofu test`)
- tofuenv repository: https://github.com/tofuutils/tofuenv (install/use semantics, `latest:^X.Y` syntax, `.opentofu-version` file format)
- opentofu/setup-opentofu GitHub Action: https://github.com/opentofu/setup-opentofu
- Sibling validated post `posts/2026-03-20-upgrade-opentofu-latest/` for cross-reference on package names and CLI shapes

## Issues Found
- **Invalid version specifier in rollback section.** The original used `tofuenv use 1.9.x` and `echo "1.9.x" > .opentofu-version`. Neither tofuenv nor the `.opentofu-version` file accepts the literal `1.9.x` wildcard — tofuenv requires a concrete version (e.g., `1.9.1`) or a constraint expression like `latest:^1.9`. Running the snippet as written would fail with "version not installed". Replaced with a concrete `1.9.1` example and added a comment instructing the reader to substitute their previously installed version.

## Review Notes
- `tofu test -verbose` is a valid flag on `tofu test`.
- The `terraform { required_version = ">= 1.10.0" ... }` block is correct — OpenTofu accepts the `terraform` top-level block for backward compatibility.
- `tofuenv install latest:^1.10` is valid tofuenv syntax (mirrors tfenv) and resolves to the latest 1.10.x release.
- The APT snippet `sudo apt-get install -y tofu` assumes the OpenTofu APT repository has already been added to the system; first-time installers will need to follow OpenTofu's repo-bootstrap steps (signing key + sources list) before this command works. This is a reasonable simplification for an upgrade-focused guide but worth noting.
- The display placeholder `# OpenTofu v1.9.x on linux_amd64` in the verification comment is fine since it's commentary, not an executed command.
- The binary install only shows `linux_amd64`; readers on macOS or arm64 will need to substitute the appropriate asset name from the releases page.
- Hardcoded provider version `~> 5.50` for hashicorp/aws is illustrative; readers should verify their actual provider constraints.
