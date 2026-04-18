# Validation Summary: How to Update CI/CD Pipelines from Terraform to OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- OpenTofu (CLI, versions 1.8.0)
- Terraform (CLI, versions 1.7.0)
- GitHub Actions (`opentofu/setup-opentofu`, `hashicorp/setup-terraform`, `aws-actions/configure-aws-credentials`, `actions/checkout`)
- GitLab CI (`.gitlab-ci.yml`, stages, `before_script`, `when: manual`, `only`)
- Shell/bash installation scripts (curl, wget, tar)

## Sources Consulted
- OpenTofu setup action repository: https://github.com/opentofu/setup-opentofu (action.yml input parameters)
- OpenTofu releases: https://github.com/opentofu/opentofu/releases (tarball structure and version availability)
- HashiCorp setup-terraform action: https://github.com/hashicorp/setup-terraform
- GitLab CI/CD documentation on default stages and stage declaration requirements
- AWS `configure-aws-credentials` action: https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- **GitLab CI missing `stages:` declaration**: The original `.gitlab-ci.yml` example used custom stages `plan` and `apply` on the jobs but did not declare them in a top-level `stages:` block. GitLab CI's default stages are `.pre`, `build`, `test`, `deploy`, `.post`; using any custom stage name without declaring it causes the pipeline to fail with "chosen stage does not exist". Added `stages:\n  - plan\n  - apply` immediately after the `variables:` block so the example runs as written.

All other elements verified correct:
- `opentofu/setup-opentofu@v1` with input `tofu_version: 1.8.0` is valid (v1.0.8 is the latest v1 release and supports arbitrary OpenTofu versions via the releases API).
- `hashicorp/setup-terraform@v3` with `terraform_version: 1.7.0` is a valid configuration (Terraform 1.7.0 released January 2024).
- OpenTofu release tarball structure confirmed: `tofu` binary is at the root alongside `LICENSE`, `README.md`, `CHANGELOG.md`, so `tar -xzf ... tofu` and subsequent `mv tofu /usr/local/bin/` work as shown.
- Release URL pattern (`https://github.com/opentofu/opentofu/releases/download/v${VERSION}/tofu_${VERSION}_linux_amd64.tar.gz`) is correct.
- `actions/checkout@v4` and `aws-actions/configure-aws-credentials@v4` are current major versions.
- `tofu` subcommands (`init`, `validate`, `plan -out`, `apply -auto-approve`, `version`) all match the OpenTofu CLI, which mirrors Terraform's interface.

## Review Notes
- `opentofu/setup-opentofu@v2` is now available and would be the more current pin; `@v1` still works but is effectively legacy. Similarly, `hashicorp/setup-terraform@v4` is the current major version. These were left as-is because the post's pinned versions are still functional.
- The custom install script uses `sudo mv tofu /usr/local/bin/` which works on most Linux runners but may require adjustment for rootless/container-based CI environments.
- Consider adding `-lock-timeout` flags or remote state backend configuration notes in a follow-up — useful in real CI/CD but out of scope for this migration-focused post.
