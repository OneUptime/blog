# Validation Summary: How to Scan OpenTofu Configurations with Trivy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform
- Trivy
- GitHub Actions
- SARIF
- Infrastructure as Code security scanning

## Sources Consulted
- Trivy installation documentation: https://trivy.dev/docs/latest/getting-started/installation/
- Trivy first steps and CLI target/scanner model: https://trivy.dev/docs/latest/getting-started/
- Trivy `config` CLI reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_config/
- Trivy Terraform IaC coverage documentation: https://trivy.dev/docs/latest/coverage/iac/terraform/
- Trivy reporting documentation: https://trivy.dev/docs/latest/configuration/reporting/
- Trivy filtering and `.trivyignore` documentation: https://trivy.dev/docs/latest/configuration/filtering/
- Trivy repository CLI reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_repository/
- Trivy Action README: https://github.com/aquasecurity/trivy-action
- GitHub SARIF upload documentation: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/uploading-a-sarif-file-to-github
- Trivy supply chain advisory GHSA-69fq-xp46-6x23 / CVE-2026-33634: https://osv.dev/vulnerability/GHSA-69fq-xp46-6x23
- Trivy source for OpenTofu file detection support: https://github.com/aquasecurity/trivy/blob/8e23717841930061d69b8f598f54c652e444737a/pkg/iac/detection/detect.go#L284-L294

## Issues Found
- The post description claimed Trivy scans OpenTofu/Terraform configurations for vulnerabilities. The `trivy config` command is documented as scanning config files for misconfigurations, so the description was narrowed to security misconfigurations in infrastructure-as-code.
- The macOS install command used the older/custom Homebrew tap form `brew install aquasecurity/trivy/trivy`. Official Trivy docs now use `brew install trivy`, and the Trivy advisory notes the official Homebrew formula as the safe documented path, so the command was updated.
- The Linux install command omitted `sudo` while installing into `/usr/local/bin` and did not match the current official install-script example. It was updated to the documented `sudo sh -s -- -b /usr/local/bin v0.70.0` form.
- The severity threshold section said the command would fail on HIGH and CRITICAL findings, but `--severity` only filters displayed findings. Added `--exit-code 1` so Trivy exits non-zero when matching findings are present.
- The GitHub Actions example used `aquasecurity/trivy-action@master`. The official Trivy Action docs and the 2026 Trivy supply-chain advisory identify `0.35.0` as the current safe action version, so the workflow was updated to `aquasecurity/trivy-action@0.35.0`.
- The GitHub Actions example uploaded SARIF with `github/codeql-action/upload-sarif@v3`. GitHub's current SARIF documentation uses `upload-sarif@v4`, and GitHub has announced the upcoming deprecation of CodeQL Action v3, so the example was updated to v4.
- After adding `exit-code: '1'` to the Trivy Action step, the SARIF upload step needed `if: always()` so results are still uploaded when Trivy finds blocking issues. Added that condition.

## Review Notes
The local `trivy` CLI was not installed in the review environment, so command verification was performed against current official documentation and the Trivy source repository. OpenTofu support is present in Trivy source through `.tofu` and `.tofu.json` Terraform scanner file detection, although the public coverage page still names the scanner as Terraform.
