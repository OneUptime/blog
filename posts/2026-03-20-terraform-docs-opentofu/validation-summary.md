# Validation Summary: How to Set Up OpenTofu Documentation with terraform-docs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- terraform-docs
- HCL
- GitHub Actions
- Infrastructure as Code module documentation

## Sources Consulted
- terraform-docs installation documentation: https://terraform-docs.io/user-guide/installation/
- terraform-docs configuration documentation: https://terraform-docs.io/user-guide/configuration/
- terraform-docs markdown table command reference: https://terraform-docs.io/reference/markdown-table/
- terraform-docs root command reference: https://terraform-docs.io/reference/terraform-docs/
- terraform-docs insert output to file documentation: https://terraform-docs.io/how-to/insert-output-to-file/
- terraform-docs formatter configuration documentation: https://terraform-docs.io/user-guide/configuration/formatter/
- terraform-docs version constraint configuration documentation: https://terraform-docs.io/user-guide/configuration/version/
- terraform-docs settings configuration documentation: https://terraform-docs.io/user-guide/configuration/settings/
- terraform-docs OpenTofu `.tofu` support release note: https://github.com/terraform-docs/terraform-docs/releases/tag/v0.20.0
- OpenTofu files and directories documentation: https://opentofu.org/docs/language/files/
- OpenTofu environment variables documentation: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu validate command documentation: https://opentofu.org/docs/cli/commands/validate/
- OpenTofu fmt command documentation: https://opentofu.org/docs/cli/commands/fmt/
- OpenTofu refresh command documentation: https://opentofu.org/docs/cli/commands/refresh/
- OpenTofu setup GitHub Action documentation: https://github.com/opentofu/setup-opentofu
- GitHub artifact actions v3 deprecation notice: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions

## Issues Found
- The post title and description promised a terraform-docs tutorial, but the body showed a generic OpenTofu deployment workflow and did not install, configure, or run terraform-docs. I replaced the unrelated plan/apply workflow with terraform-docs installation, README injection, output checking, and configuration examples.
- The prerequisites required cloud credentials even though terraform-docs documentation generation does not require provider API access. I replaced that with a terraform-docs prerequisite and a documented module interface prerequisite.
- The original GitHub Actions workflow deployed infrastructure and used `actions/upload-artifact@v3` and `actions/download-artifact@v3`, which are deprecated on GitHub.com. I replaced it with a documentation validation workflow that installs terraform-docs v0.22.0 and checks generated README output.
- The troubleshooting section recommended `tofu refresh`, which OpenTofu documents as deprecated and unsafe for routine use. I replaced it with terraform-docs regeneration checks and `tofu init -backend=false` plus `tofu validate`.
- The article did not account for terraform-docs' limited `.tofu` parsing support. I added a note recommending `.tf` files for module interface content when full generated sections are needed.

## Review Notes
The rewritten examples use `.tf` module files, README injection markers, and `terraform-docs markdown table --output-file README.md --output-mode inject`, matching terraform-docs documentation. The local environment does not have `tofu` or `terraform-docs` installed, so commands were checked against official documentation rather than executed locally.
