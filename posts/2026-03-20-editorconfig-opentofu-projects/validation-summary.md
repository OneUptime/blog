# Validation Summary: How to Set Up EditorConfig for OpenTofu Projects

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- EditorConfig
- Visual Studio Code
- JetBrains IDEs
- `eclint`
- `pre-commit`
- Git attributes

## Sources Consulted
- OpenTofu style conventions: https://opentofu.org/docs/language/syntax/style/
- OpenTofu files and directories: https://opentofu.org/docs/language/files/
- OpenTofu `fmt` command: https://opentofu.org/docs/v1.9/cli/commands/fmt/
- EditorConfig documentation: https://editorconfig.org/
- EditorConfig specification: https://spec.editorconfig.org/
- EditorConfig for VS Code marketplace page: https://www.marketplace.visualstudio.com/itemdetails?itemName=EditorConfig.EditorConfig
- OpenTofu VS Code extension repository: https://github.com/opentofu/vscode-opentofu
- JetBrains EditorConfig documentation: https://www.jetbrains.com/help/idea/editorconfig.html
- JetBrains Terraform and HCL documentation: https://www.jetbrains.com/help/idea/terraform.html
- `eclint` package documentation: https://www.npmjs.com/package/eclint
- `editorconfig-checker` documentation: https://github.com/editorconfig-checker/editorconfig-checker
- `editorconfig-checker.python` pre-commit wrapper: https://github.com/editorconfig-checker/editorconfig-checker.python

## Issues Found
- The VS Code section recommended the HashiCorp Terraform extension and Terraform-specific settings. I replaced those with the official OpenTofu extension and its current `opentofu` / `opentofu-vars` formatter settings because the OpenTofu extension now has its own documented configuration and bundled language server.
- The core `.editorconfig` example only matched `*.tf` files. I updated it to match both `*.tf` and `*.tofu`, and added `*.tofu` to `.gitattributes`, because OpenTofu officially supports both native file extensions.
- The Markdown example used an inline `#` comment on the same line as `trim_trailing_whitespace = false`. Current EditorConfig spec does not support inline comments, so I moved the comment onto its own line.
- The JetBrains section included unsupported or unverified `ij_terraform_hcl_*` properties. I removed that snippet and replaced it with the documented Terraform and HCL plugin prerequisite plus the built-in EditorConfig support steps.
- The `editorconfig-checker.python` hook revision was pinned to `2.7.3`, which is outdated. I updated it to `3.6.1` and corrected the exclude regex to `\.terraform/.*` so it matches the literal `.terraform` directory.
- The introduction and conclusion slightly overstated LF line endings as something OpenTofu strictly expects. I adjusted the wording to reflect the official docs: UTF-8 is required, CRLF is accepted, and LF is the idiomatic convention.

## Review Notes
- The `eclint` commands are valid according to current CLI help, but `eclint` pulls in older npm dependencies when installed with `npx` or `npm`. The commands still work as documented.
- The post still references `.tfvars`, which remains correct for OpenTofu even though the post is OpenTofu-focused.
