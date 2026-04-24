# Validation Summary: How to Use Pre-Commit Hooks for OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu CLI
- pre-commit
- terraform-docs
- GitHub Actions
- YAML configuration

## Sources Consulted
- OpenTofu `tofu fmt` documentation: https://opentofu.org/docs/cli/commands/fmt/
- OpenTofu `tofu validate` documentation: https://opentofu.org/docs/cli/commands/validate/
- pre-commit official documentation: https://pre-commit.com/
- terraform-docs pre-commit hook guide: https://terraform-docs.io/how-to/pre-commit-hooks/
- terraform-docs output configuration: https://terraform-docs.io/user-guide/configuration/output/
- terraform-docs installation guide: https://terraform-docs.io/user-guide/installation/
- `opentofu/setup-opentofu` action README: https://github.com/opentofu/setup-opentofu
- `actions/setup-python` README: https://github.com/actions/setup-python
- `actions/checkout` README: https://github.com/actions/checkout

## Issues Found
- The original post did not describe pre-commit hooks. It showed an OpenTofu deployment workflow with `tofu init`, `plan`, `apply`, state inspection, and a CI apply job, which did not match the title or description. I replaced those sections with a real `.pre-commit-config.yaml`, supported `pre-commit` commands, and a `terraform-docs` hook configuration.
- The original prerequisites incorrectly required cloud credentials. OpenTofu documents `tofu validate` as checking configuration without accessing remote services, and recommends `tofu init -backend=false` to initialize for validation without a configured backend. I removed the credential requirement and updated the setup flow.
- The original GitHub Actions example automated infrastructure planning and apply rather than enforcing local hook parity in CI. I replaced it with a CI workflow that installs Python, OpenTofu, and `pre-commit`, initializes OpenTofu for validation, and runs `pre-commit run --all-files --show-diff-on-failure`.
- The original article had no technically correct path for documentation generation. I added the official `terraform-docs` pre-commit hook usage and a `.terraform-docs.yml` example using the documented `inject` mode template markers.
- The original troubleshooting and verification commands were about runtime infrastructure operations rather than hook behavior. I replaced them with current `pre-commit` commands such as `validate-config`, `run --all-files`, and `autoupdate`, and updated the hook configuration to use `language: unsupported`, which is the current replacement for `language: system` in pre-commit 4.4+.

## Review Notes
- The local environment did not have `tofu`, `pre-commit`, or `terraform-docs` installed, so validation was performed against official documentation and syntax review rather than by executing the commands locally.
- The `tofu validate` hook assumes the working directory has already been initialized for validation. If a configuration uses variables in module source addresses or requires specific input values during validation, the hook may need additional `-var` or `-var-file` arguments.
- The pinned `terraform-docs` hook revision was set to `v0.22.0`, which is the current stable version shown in the official terraform-docs installation documentation as of April 24, 2026.
