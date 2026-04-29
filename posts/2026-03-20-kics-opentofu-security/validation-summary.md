# Validation Summary: How to Use KICS for OpenTofu Security Scanning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- KICS
- OpenTofu
- HCL / Terraform-compatible IaC configuration
- GitHub Actions
- SARIF
- AWS provider examples

## Sources Consulted
- KICS getting started documentation: https://docs.kics.io/latest/getting-started/
- KICS running documentation: https://docs.kics.io/latest/running-kics/
- KICS supported platforms documentation: https://docs.kics.io/develop/platforms/
- KICS results and exit code documentation: https://docs.kics.io/latest/results/
- KICS GitHub Action README: https://github.com/Checkmarx/kics-github-action
- OpenTofu files and directories documentation: https://opentofu.org/docs/language/files/
- OpenTofu settings documentation: https://opentofu.org/docs/language/settings/
- OpenTofu `show` command documentation: https://opentofu.org/docs/cli/commands/show/
- OpenTofu `version` command documentation: https://opentofu.org/docs/cli/commands/version/
- GitHub documentation for uploading SARIF files: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/uploading-a-sarif-file-to-github

## Issues Found
- The original post content did not actually explain KICS scanning. It described an OpenTofu deployment workflow built around `tofu init`, `tofu plan`, `tofu apply`, state inspection, and GitHub Actions deployment. I replaced those examples with KICS scan commands, KICS report handling, and a KICS-focused GitHub Actions workflow.
- The original prerequisites and environment setup were inaccurate for KICS. KICS does not require cloud credentials for direct static scans of local source files, so I changed the setup to use the documented KICS Docker image and made cloud credentials conditional on generating a real OpenTofu plan.
- The original configuration example was not tied to a scannable security finding. I replaced it with a valid OpenTofu/Terraform-style AWS security group example that KICS can flag using documented Terraform queries.
- The original workflow automation section was for infrastructure deployment, not security scanning. I replaced it with a KICS GitHub Action example that produces JSON and SARIF output and uploads SARIF using GitHub's documented `upload-sarif` action.
- The original verification and troubleshooting sections were about OpenTofu state and drift, not KICS. I changed them to focus on KICS reports, variable resolution, supported scan inputs, and documented KICS exit codes.
- The post originally implied generic OpenTofu configuration scanning without qualification. Based on the official docs, I clarified that direct KICS support is documented for Terraform `.tf` files and Terraform plan JSON, while OpenTofu supports both `.tf` and `.tofu`. The post now explicitly tells readers to scan `.tf` source files directly or export an OpenTofu plan to JSON when working from OpenTofu.
- I added a warning that `tofu show -json` includes sensitive values in plain text, because the official OpenTofu `show` documentation states this and the post now recommends plan-JSON scanning as a supported workflow.

## Review Notes
- KICS documentation currently describes direct Terraform scanning for `.tf`, `terraform.tfvars`, and `*.auto.tfvars` files. It does not document direct scanning of OpenTofu-specific `.tofu` files. The corrected post avoids claiming that `.tofu` files are scanned directly.
- The recommendation to use KICS with OpenTofu source files stored as `.tf` is an inference from two official sources: OpenTofu supports `.tf` files for its configuration language, and KICS supports Terraform HCL scanning for `.tf` files.
- Uploading SARIF to private or internal GitHub repositories requires GitHub Code Security to be enabled. The workflow example itself is valid, but repository settings can still affect whether SARIF upload succeeds.
