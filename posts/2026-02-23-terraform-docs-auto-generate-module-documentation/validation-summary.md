# Validation Summary: How to Use terraform-docs to Auto-Generate Module Documentation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform modules
- terraform-docs
- pre-commit
- GitHub Actions
- YAML
- Markdown

## Sources Consulted
- terraform-docs installation documentation: https://terraform-docs.io/user-guide/installation/
- terraform-docs Markdown CLI reference: https://terraform-docs.io/reference/markdown/
- terraform-docs Markdown table reference: https://terraform-docs.io/reference/markdown-table/
- terraform-docs output configuration documentation: https://terraform-docs.io/user-guide/configuration/output/
- terraform-docs content configuration documentation: https://terraform-docs.io/user-guide/configuration/content/
- terraform-docs sections configuration documentation: https://terraform-docs.io/user-guide/configuration/sections/
- terraform-docs settings configuration documentation: https://terraform-docs.io/user-guide/configuration/settings/
- terraform-docs sort configuration documentation: https://terraform-docs.io/user-guide/configuration/sort/
- terraform-docs recursive submodules documentation: https://terraform-docs.io/how-to/recursive-submodules/
- terraform-docs pre-commit hooks documentation: https://terraform-docs.io/how-to/pre-commit-hooks/
- terraform-docs GitHub Action documentation: https://terraform-docs.io/how-to/github-action/
- terraform-docs GitHub Action README: https://github.com/terraform-docs/gh-actions
- terraform-docs plugin SDK module and input type reference: https://pkg.go.dev/github.com/terraform-docs/plugin-sdk/terraform

## Issues Found
- The Linux install command said it downloaded the latest release but used the older v0.18.0 GitHub release asset. Updated it to the current documented v0.24.0 download URL format.
- The README injection example used nested triple backticks incorrectly and closed the inner HCL fence as `bash`. Changed the outer fence to four backticks and closed the inner HCL fence correctly.
- The generated output example claimed the shown output came only from the displayed variables file, but the Requirements and Outputs sections require matching provider requirements and output blocks. Adjusted the wording to make that dependency clear.
- The pre-commit hook pinned v0.18.0 and omitted the module path that terraform-docs should scan. Updated the revision to v0.24.0 and added `./modules/vpc` to the hook arguments.
- The GitHub Actions example used the broad `terraform-docs/gh-actions@v1` reference while the current action README documents v1.4.1. Updated the action reference to `terraform-docs/gh-actions@v1.4.1`.
- The custom template example used invalid nested Markdown fences, referenced non-existent `.Module.Source`, and tested `.Default` truthiness instead of input requiredness. Fixed the fences, used a static example source path, and switched the template condition to `.Required`.
- The tips section said an empty description makes the generated table empty. Changed this to say the generated description column will be empty.
- Removed a stray empty bash code block at the end of the post.

## Review Notes
The article remains version-specific to terraform-docs v0.24.0 as of this validation. The generated-output table is illustrative rather than exact default output; terraform-docs may include anchors or additional columns depending on formatter settings.
