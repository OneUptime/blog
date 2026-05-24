# Validation Summary: How to Handle Module Source Authentication in Terraform

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Terraform (module sources, CLI configuration, `.terraformrc`)
- Terraform Cloud / Terraform Enterprise (private module registry, `terraform login`, `TF_TOKEN_*` env vars)
- Git (SSH, HTTPS, credential helpers, `insteadOf` URL rewriting)
- GitHub (deploy keys, OAuth tokens, GitHub Apps, OIDC)
- GitLab (module registry, Git over HTTPS)
- AWS S3 (module source, AWS credentials, IAM roles, OIDC)
- Google Cloud Storage (module source, Application Default Credentials, service account keys)
- GitHub Actions (`actions/checkout`, `aws-actions/configure-aws-credentials`, `actions/create-github-app-token`)
- Bash / shell scripting

## Sources Consulted
- Terraform Module Sources documentation — https://developer.hashicorp.com/terraform/language/modules/sources
- Terraform CLI Configuration File (credentials and `TF_TOKEN_*`) — https://developer.hashicorp.com/terraform/cli/config/config-file
- HashiCorp go-getter README (URL detectors, S3/GCS getters) — https://github.com/hashicorp/go-getter
- Terraform Cloud Account API — https://developer.hashicorp.com/terraform/cloud-docs/api-docs/account
- GitLab Terraform Module Registry — https://docs.gitlab.com/user/packages/terraform_module_registry/
- `actions/create-github-app-token` Marketplace — https://github.com/marketplace/actions/create-github-app-token
- GitHub Apps installation token authentication — https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation
- `aws-actions/configure-aws-credentials` — https://github.com/aws-actions/configure-aws-credentials
- Git credential helpers documentation — https://git-scm.com/docs/gitcredentials

## Issues Found

1. **Incorrect token-age script (fixed).** The "Rotate Credentials Regularly" example used `gh api user --jq '.created_at'`, which returns the GitHub *user account* creation date — not the token's age. The script as written would incorrectly flag every developer's account based on when they signed up for GitHub. Replaced with a tracking-file approach (`stat -c %Y` against `~/.config/terraform-token-rotated`) that actually measures elapsed time since the operator marks the token as rotated.

## Review Notes

- The SCP-style short form `git@github.com:myorg/...?ref=v1.0.0` (shown as a GitHub-specific shorthand) works through go-getter's SSH detector, but HashiCorp's documentation recommends the explicit `git::ssh://` form. The post correctly labels it as a shorthand, so it is acceptable as written.
- `actions/create-github-app-token@v1` was current at one point; the action's latest major is now v3, but v1 references remain functional. Not changed, since pinning to a known-good major is a reasonable user choice.
- The `TF_TOKEN_*` rule is more nuanced than "dots → underscores": hyphens become double underscores and non-ASCII hostnames must be punycode-encoded first. The post's examples (`app_terraform_io`, `terraform_myorg_com`, `gitlab_com`) only contain dots, so they are correct, and the post's note "replace dots with underscores" is accurate for the cases shown.
- `stat -c %Y` in the fixed script is GNU coreutils syntax; on macOS users would need `stat -f %m`. Left as Linux-style since CI runners are typically Linux.
- All Git source URLs, S3/GCS source URLs, registry source addresses, `.terraformrc` credentials block syntax, `terraform login` usage, Terraform Cloud API endpoint, and GitHub Actions workflows verified against current official documentation.
