# Validation Summary: How to Generate Documentation for OpenTofu Modules with terraform-docs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu modules
- Terraform module syntax
- terraform-docs CLI
- terraform-docs YAML configuration
- pre-commit hooks
- CI/CD documentation generation

## Sources Consulted
- terraform-docs official installation guide: https://terraform-docs.io/user-guide/installation/
- terraform-docs CLI reference: https://terraform-docs.io/reference/terraform-docs/
- terraform-docs Markdown reference: https://terraform-docs.io/reference/markdown/
- terraform-docs Markdown table reference: https://terraform-docs.io/reference/markdown-table/
- terraform-docs formatter configuration: https://terraform-docs.io/user-guide/configuration/formatter/
- terraform-docs output configuration: https://terraform-docs.io/user-guide/configuration/output/
- terraform-docs sections configuration: https://terraform-docs.io/user-guide/configuration/sections/
- terraform-docs pre-commit hook guide: https://terraform-docs.io/how-to/pre-commit-hooks/
- terraform-docs GitHub releases: https://github.com/terraform-docs/terraform-docs/releases
- OpenTofu standard module structure: https://opentofu.org/docs/language/modules/develop/structure/
- OpenTofu input variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu output values: https://opentofu.org/docs/language/values/outputs/

## Issues Found
- The Linux install command used `releases/latest/download/terraform-docs-linux-amd64.tar.gz`, which currently redirects to a missing release asset. Updated it to the current v0.22.0 Linux AMD64 asset name from the official release.
- The README injection command used `terraform-docs . --output-mode inject`, which does not identify an output file unless the earlier `.terraform-docs.yml` is present and configured. Updated it to the explicit documented form using `markdown table`, `--output-file README.md`, and `--output-mode inject`.
- The pre-commit example pinned terraform-docs `v0.17.0` and only passed `./` as the hook argument. Updated it to the current `v0.22.0` release and passed the formatter, output file, output mode, and module path explicitly.

## Review Notes
The remaining CLI commands, YAML configuration keys, section names, formatter value, output template markers, and CI/CD command are consistent with current terraform-docs documentation. The post focuses on `.tf` files such as `variables.tf` and `outputs.tf`, which matches OpenTofu's standard module structure.
