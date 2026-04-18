# Validation Summary: How to Update CI/CD Pipelines from Terraform to OpenTofu

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- OpenTofu (CLI, docker image, GitHub Action)
- Terraform
- GitHub Actions (`opentofu/setup-opentofu`, `actions/checkout`, `aws-actions/configure-aws-credentials`, `actions/github-script`)
- GitLab CI
- Atlantis
- Terragrunt
- Environment variables (`TF_*`)

## Sources Consulted
- opentofu/setup-opentofu repository and releases: https://github.com/opentofu/setup-opentofu
- OpenTofu container registry: https://github.com/opentofu/opentofu/pkgs/container/opentofu
- Atlantis documentation: https://www.runatlantis.io/docs/
- Terragrunt documentation: https://terragrunt.gruntwork.io/docs/ and https://docs.terragrunt.com/reference/hcl/attributes/
- OpenTofu environment variables documentation

## Issues Found
1. **`opentofu/setup-opentofu@v1`** — The currently documented/recommended version tag is `@v2` (v2.0.0 released 2026-03-16). Updated all three occurrences to `@v2`.
2. **`ATLANTIS_TERRAFORM_VERSION=opentofu`** — This variable does not exist. The correct Atlantis configuration to use OpenTofu is `ATLANTIS_DEFAULT_TF_DISTRIBUTION=opentofu` (available v0.24.0+). Corrected the variable name and added the version note.
3. **`OPENTOFU_VERSION=1.9.0`** — There is no such OpenTofu-specific environment variable documented in OpenTofu. Removed the fabricated entry along with the "OpenTofu-specific (new)" header.
4. **Template literal syntax in github-script body** — The PR-comment body used unescaped backticks inside a JavaScript template literal, which would break parsing. Escaped the inner backticks (`` \` ``) so the template literal is syntactically valid.

## Review Notes
- The Docker image tag `ghcr.io/opentofu/opentofu:1.9` is a valid, pullable tag — verified via registry manifest.
- Terragrunt's `terraform_binary = "tofu"` still works and is documented, though current Terragrunt versions default to invoking `tofu` automatically, so the override is often redundant. Kept as-is since the post's claim is accurate.
- All listed `TF_*` environment variables (`TF_LOG`, `TF_LOG_PATH`, `TF_VAR_*`, `TF_CLI_ARGS_*`, `TF_PLUGIN_CACHE_DIR`) are confirmed to work with OpenTofu.
- Future consideration: OpenTofu also supports its own variables like `TOFU_CLI_ARGS_*` and `TF_ENCRYPTION`, which could be worth mentioning alongside the shared `TF_*` set.
