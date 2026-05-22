# Validation Summary: How to Use Checkov for Compliance Scanning

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Checkov
- Terraform
- Terraform plan JSON scanning
- YAML custom policies
- Python custom policies
- GitHub Actions
- GitLab CI
- SARIF, JSON, and JUnit XML scan outputs

## Sources Consulted
- Checkov CLI Command Reference: https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html
- Checkov Installing Checkov: https://www.checkov.io/2.Basics/Installing%20Checkov.html
- Checkov Terraform Plan Scanning: https://www.checkov.io/7.Scan%20Examples/Terraform%20Plan%20Scanning.html
- Checkov Suppressing and Skipping Policies: https://www.checkov.io/2.Basics/Suppressing%20and%20Skipping%20Policies.html
- Checkov YAML Custom Policies: https://www.checkov.io/3.Custom%20Policies/YAML%20Custom%20Policies.html
- Checkov Python Custom Policies: https://www.checkov.io/3.Custom%20Policies/Python%20Custom%20Policies.html
- Checkov GitHub Action metadata: https://github.com/bridgecrewio/checkov-action/blob/v12/action.yml
- Checkov Policy Index: https://www.checkov.io/5.Policy%20Index/all.html
- Checkov 3.2.529 CLI help output from the PyPI package

## Issues Found
- The post used `--compliance-framework cis_aws`, but that flag is not present in the current Checkov CLI reference or Checkov 3.2.529 help output. I replaced those examples with supported `--framework`, `--check`, `--list`, and `--output` commands that still demonstrate scoped audit/compliance checks.
- The YAML custom policy example used `guidelines`; Checkov YAML policy metadata documents the optional key as `guideline`. I changed the key to `guideline`.

## Review Notes
The remaining commands, suppression syntax, Terraform plan scan workflow, custom policy structure, CI examples, and output options are consistent with the current Checkov documentation reviewed. The post correctly describes compliance mappings at a high level, but teams should still curate the exact Checkov check IDs for their audit scope because the open-source CLI does not expose a generic `--compliance-framework` selector.
