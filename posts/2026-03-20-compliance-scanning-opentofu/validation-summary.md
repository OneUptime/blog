# Validation Summary: How to Run Compliance Scanning on OpenTofu Configurations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Checkov
- Open Policy Agent (OPA) / Rego
- Conftest
- GitHub Actions
- AWS infrastructure resources in HCL
- SARIF
- `jq`

## Sources Consulted
- Checkov CLI Command Reference: https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html
- Checkov Terraform plan scanning docs: https://www.checkov.io/7.Scan%20Examples/Terraform%20Plan%20Scanning.html
- Checkov overview/docs: https://www.checkov.io/1.Welcome/What%20is%20Checkov.html
- Checkov policy index: https://github.com/bridgecrewio/checkov/blob/main/docs/5.Policy%20Index/all.md
- Checkov source for `--output-file-path` behavior: https://github.com/bridgecrewio/checkov/blob/main/checkov/common/util/ext_argument_parser.py
- Checkov source for generated output filenames: https://github.com/bridgecrewio/checkov/blob/main/checkov/common/runners/runner_registry.py
- Checkov GitHub Action README: https://github.com/bridgecrewio/checkov-action
- OpenTofu `show` command docs: https://opentofu.org/docs/v1.6/cli/commands/show/
- OpenTofu JSON output format docs: https://opentofu.org/docs/internals/json-format/
- `opentofu/setup-opentofu` action docs: https://github.com/opentofu/setup-opentofu
- Conftest docs: https://www.conftest.dev/
- Conftest installation docs: https://www.conftest.dev/install/
- Conftest options/docs for GitHub output and policy namespace behavior: https://www.conftest.dev/options/
- OPA upgrade docs for Rego v1 syntax requirements: https://www.openpolicyagent.org/docs/v0-upgrade
- OPA style guide: https://www.openpolicyagent.org/docs/style-guide
- GitHub docs for SARIF uploads and required permissions: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/uploading-a-sarif-file-to-github
- GitHub runner image docs for `ubuntu-latest` Homebrew availability: https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md

## Issues Found
- The Checkov CLI examples used unsupported or undocumented compliance selectors such as `--compliance HIPAA`, `--compliance SOC2`, `CIS_AWS_1.2`, and `PCI_DSS_3.2` in `--check` / `.checkov.yaml`. I replaced them with valid Checkov check IDs and adjusted the surrounding text to describe Checkov accurately.
- The Checkov CLI examples used `--output-file`, which is not the documented flag. I changed the commands to use `-o json` with `--output-file-path`, and updated the example report path to `reports/results_json.json` to match Checkov’s documented and implemented filename behavior.
- Several Checkov IDs in the HCL examples were incorrect for the resources shown. I corrected them from `CKV_AWS_23`, `CKV_AWS_86`, `CKV_AWS_157`, and `CKV_AWS_133` to `CKV_AWS_19`, `CKV_AWS_17`, `CKV_AWS_293`, and `CKV_AWS_16`.
- The Rego policy example used pre-v1 rule syntax (`deny[msg] { ... }`) and an imprecise comment about public subnets. I updated it to current Rego v1 syntax with `import rego.v1`, `deny contains msg if`, and corrected the comment to match the actual `publicly_accessible` check.
- The GitHub Actions example pinned `bridgecrewio/checkov-action` to `@master`. I updated it to the versioned action reference shown in the action’s current documentation.
- The GitHub Actions example installed Conftest with `brew install conftest` on `ubuntu-latest` without first adding Homebrew to `PATH`. I added the required `brew shellenv` step based on the current runner image docs.
- The SARIF upload workflow omitted the `security-events: write` permission required by GitHub’s SARIF upload documentation. I added the required permissions block and updated the upload action reference to the current documented major version.
- The conclusion overstated framework-specific built-in coverage in a way I could not verify from official Checkov documentation. I narrowed that wording to a documented claim about broad cloud security and compliance coverage.

## Review Notes
- The workflow still scans source OpenTofu/HCL with Checkov using the `terraform` framework and uses the generated plan JSON for Conftest/OPA. That is technically valid, but a future revision could also show Checkov plan-file scanning with `terraform_plan` for readers who want plan-context checks.
- The post still references HIPAA and SOC 2 conceptually, but the validated implementation now treats those as custom-policy use cases rather than built-in Checkov CLI framework filters.
