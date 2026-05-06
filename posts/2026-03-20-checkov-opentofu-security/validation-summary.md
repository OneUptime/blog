# Validation Summary: How to Use Checkov for OpenTofu Security Scanning

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Checkov
- OpenTofu
- AWS provider for OpenTofu
- GitHub Actions

## Sources Consulted
- OpenTofu CLI `validate` command: https://opentofu.org/docs/v1.9/cli/commands/validate/
- OpenTofu CLI `init` command: https://opentofu.org/docs/v1.11/cli/commands/init/
- OpenTofu CLI `show` command: https://opentofu.org/docs/v1.9/cli/commands/show/
- OpenTofu JSON output format: https://opentofu.org/docs/internals/json-format/
- Checkov CLI command reference: https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html
- Checkov Terraform plan scanning docs: https://www.checkov.io/7.Scan%20Examples/Terraform%20Plan%20Scanning.html
- Checkov policy suppression docs: https://www.checkov.io/2.Basics/Suppressing%20and%20Skipping%20Policies.html
- Checkov official repository README: https://github.com/bridgecrewio/checkov
- Checkov GitHub Action README: https://github.com/bridgecrewio/checkov-action
- GitHub `actions/checkout` README: https://github.com/actions/checkout
- GitHub `actions/upload-artifact` README: https://github.com/actions/upload-artifact

## Issues Found
- The original post title and body did not match. It claimed to explain Checkov scanning, but most of the content was an OpenTofu deploy/apply workflow with no actual Checkov installation, scan command, or automation. I replaced the deployment-focused material with verified Checkov setup, source scanning, optional plan scanning, and CI usage.
- The original prerequisites were incomplete for the topic. Checkov itself was not listed as a prerequisite, while cloud credentials were presented as always required. I corrected this so Checkov is required, and cloud credentials are only required when generating a plan file to scan.
- The original command examples were not aligned with official OpenTofu validation guidance. I changed the workflow to use `tofu init -backend=false` and `tofu validate` before scanning, which matches OpenTofu's documented validation flow.
- The original "core feature" section showed `tofu init`, `tofu plan`, `tofu show`, and `tofu apply`, which do not demonstrate Checkov scanning. I replaced them with `checkov -d . --framework terraform` and an optional `tofu show -json` plus `checkov -f tfplan.json --repo-root-for-plan-enrichment .` workflow based on official Checkov and OpenTofu documentation.
- The original GitHub Actions example was technically mismatched with the article and used deprecated artifact actions (`actions/upload-artifact@v3` and `actions/download-artifact@v3`) in a deployment pipeline rather than a security scan. I replaced it with a verified `bridgecrewio/checkov-action@v12` workflow and updated checkout to the current documented major version.
- The original monitoring and troubleshooting sections focused on OpenTofu state inspection and `tofu refresh`, which is deprecated in OpenTofu documentation and unrelated to Checkov scanning. I rewrote those sections to use current Checkov commands and removed the deprecated guidance.
- The original best-practices section was generic OpenTofu variable/style advice rather than remediation relevant to the scan results. I updated it to show concrete AWS S3 hardening changes that Checkov can validate, specifically versioning and server-side encryption configuration.

## Review Notes
- `tofu show -json` can expose sensitive values in plan or state output, so scanning generated plan JSON should be done in a secure environment.
- Checkov supports OpenTofu templates, but the CLI framework selector is still `terraform`, so the corrected examples use `--framework terraform`.
