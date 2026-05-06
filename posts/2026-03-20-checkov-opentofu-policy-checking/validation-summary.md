# Validation Summary: How to Use Checkov with OpenTofu for Policy Checking

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Checkov
- OpenTofu / Terraform HCL scanning
- Custom Checkov Python policies
- Custom Checkov YAML policies
- GitHub Actions
- AWS Terraform resources used in examples

## Sources Consulted
- Checkov CLI Command Reference: https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html
- Checkov Python Custom Policies: https://www.checkov.io/3.Custom%20Policies/Python%20Custom%20Policies.html
- Checkov YAML Custom Policies: https://www.checkov.io/3.Custom%20Policies/YAML%20Custom%20Policies.html
- Checkov repository README: https://github.com/bridgecrewio/checkov
- Checkov policy index: https://github.com/bridgecrewio/checkov/blob/main/docs/5.Policy%20Index/all.md
- Checkov GitHub Action README: https://github.com/bridgecrewio/checkov-action
- Checkov GitHub Action metadata: https://github.com/bridgecrewio/checkov-action/blob/master/action.yml

## Issues Found
- The `--compliance` and `--list-compliance` commands shown in the built-in scanning section are not part of the current Checkov CLI. I replaced them with supported built-in check listing and selection examples.
- The severity example said "Show only specific severity", but in the current CLI `--check MEDIUM,HIGH,CRITICAL` effectively means MEDIUM and above. I corrected the example to match current behavior.
- Python-based external checks require the documented `policies/__init__.py` loader pattern so Checkov can discover the custom module. I added that required snippet.
- The custom-check command that targeted `CKV_MYORG_1` omitted `--external-checks-dir`, so the custom check would not load. I added the missing flag.
- YAML custom policies use `CKV2_...` IDs. I updated the YAML examples and downstream references from `CKV_MYORG_2` / `CKV_MYORG_3` to `CKV2_CUSTOM_1` / `CKV2_CUSTOM_2`.
- The original VPC Flow Logs YAML policy used an unsupported `filter` structure and does not load on the current Checkov release. I replaced it with a valid connection-based policy that checks `aws_vpc` to `aws_flow_log` connectivity.
- `CKV_AWS_57` was labeled and used as the S3 versioning check, but the current policy index shows `CKV_AWS_57` is the S3 public-WRITE ACL check and `CKV_AWS_21` is the S3 versioning check. I corrected the config snippet and inline suppression example.
- The config example combined `output: [cli, sarif]` with a single `output-file-path`. Current Checkov expects `console,<file>` when CLI output and a file output are both configured. I corrected it to `console,checkov-results.sarif`.
- The GitHub Action example used `external_checks_dir`, but the current action input is `external_checks_dirs`. I corrected the input name, updated the custom check IDs, and pinned the example to the current documented major tag `@v12`.

## Review Notes
- Checkov currently scans OpenTofu code through the `terraform` framework; there is no separate `opentofu` framework flag in the current CLI.
- The corrected examples were also runtime-validated locally against Checkov 3.2.526 in a temporary environment.
