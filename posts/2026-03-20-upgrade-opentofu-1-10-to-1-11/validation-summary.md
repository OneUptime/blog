# Validation Summary: How to Upgrade OpenTofu from 1.10 to 1.11

## Status
validated

## Post Type
Tutorial / Upgrade Guide

## Technologies Covered
- OpenTofu 1.10 / 1.11
- tofuenv (OpenTofu version manager)
- Terraform HCL (versions.tf, required_providers)
- AWS and AzureRM Terraform providers
- GitHub Actions (opentofu/setup-opentofu action)
- Bash / shell tooling (curl, sha256sum, unzip, git)

## Sources Consulted
- OpenTofu releases on GitHub: https://github.com/opentofu/opentofu/releases (verified v1.11.0 released 2025-12-09 and v1.11.6 latest)
- opentofu/setup-opentofu action source: https://github.com/opentofu/setup-opentofu (verified `tofu_version` input and `@v1` tag still valid; `@v2` released 2026-03-16 is now also available)
- tofuenv README: https://github.com/tofuutils/tofuenv (verified `latest:<regex>` install syntax)
- OpenTofu source code at v1.11.6, internal/command/arguments/test.go (verified `-verbose` flag for `tofu test`)
- OpenTofu CLI command references for `init -upgrade`, `validate`, `fmt -recursive`, `plan -out`, `apply`

## Issues Found
No technical issues found. All CLI commands, flags, HCL syntax, version constraints, and the GitHub Actions workflow are accurate for OpenTofu 1.11.

## Review Notes
- OpenTofu v1.11.0 was released on 2025-12-09 and the current patch is v1.11.6 (released 2026-04-08). The post pins `1.11.0` throughout, which is valid; readers may prefer the latest patch in practice.
- The `opentofu/setup-opentofu@v1` action reference still works, but `@v2` was published on 2026-03-16 and is now the recommended major version. Either will function with the same `tofu_version` input.
- The `sudo apt-get upgrade tofu` step assumes the OpenTofu APT repository has already been configured; this is one of several install options listed and is not incorrect.
- Placeholders like `1.10.x` in the rollback section are intentionally generic; readers must substitute a real patch version (e.g., `1.10.9`).
