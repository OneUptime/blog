# Validation Summary: How to Implement Terraform Policy as Code

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform / OpenTofu
- tflint (with tflint-ruleset-aws and tflint-ruleset-terraform)
- Checkov
- Open Policy Agent (OPA) / Rego
- Conftest
- GitHub Actions
- GitLab CI
- pre-commit (antonbabenko/pre-commit-terraform)
- AWS provider resources (aws_instance, aws_s3_bucket, aws_db_instance, aws_ebs_volume, aws_lb_listener, aws_security_group_rule, etc.)

## Sources Consulted
- Checkov CLI Command Reference: https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html
- tflint configuration docs: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/config.md
- tflint autofix docs: https://github.com/terraform-linters/tflint/blob/master/docs/user-guide/autofix.md
- tflint v0.47.0 release notes: https://github.com/terraform-linters/tflint/releases/tag/v0.47.0
- tflint-ruleset-aws docs: https://github.com/terraform-linters/tflint-ruleset-aws/tree/master/docs/rules
- tflint-ruleset-aws v0.31.0 release: https://github.com/terraform-linters/tflint-ruleset-aws/releases/tag/v0.31.0
- tflint-ruleset-terraform rules: https://github.com/terraform-linters/tflint-ruleset-terraform/blob/main/docs/rules/README.md
- Conftest v0.50.0 release: https://github.com/open-policy-agent/conftest/releases/tag/v0.50.0
- OPA Rego documentation: https://www.openpolicyagent.org/docs/latest/policy-language/
- Conftest docs: https://www.conftest.dev/
- pre-commit-terraform: https://github.com/antonbabenko/pre-commit-terraform
- terraform-linters/setup-tflint action: https://github.com/terraform-linters/setup-tflint
- hashicorp/setup-terraform action: https://github.com/hashicorp/setup-terraform

## Issues Found
1. **Misleading tflint rule comment**: In the AWS-Specific Rules section, the rule `aws_db_instance_default_parameter_group` was commented as `# Require encryption`. This rule has nothing to do with encryption — it disallows use of the default DB parameter group (which cannot be modified). Updated the comment to accurately reflect what the rule checks: `# Disallow default DB parameter groups (they cannot be modified)`.

2. **Invalid Checkov CLI flag**: In the GitHub Actions CI example, the Checkov step used `--output-file checkov.sarif`. This is not a valid Checkov flag — the correct flag is `--output-file-path` which accepts a directory path, and Checkov writes a `results_<format>.<ext>` file (e.g. `results_sarif.sarif`) into it. Updated the `run` line to `checkov -d . --output sarif --output-file-path .` and updated the subsequent `sarif_file:` value in the `upload-sarif` step from `checkov.sarif` to `results_sarif.sarif`.

## Review Notes
- The Rego policies use `import future.keywords.in`, `import future.keywords.contains`, and `import future.keywords.if`. These are correct for OPA versions prior to 1.0 and remain backward-compatible. Conftest v0.50.0 (cited in the post, released 2024-03-07) predates OPA 1.0, so this is appropriate for the version named.
- The `test_*` rules in `terraform_test.rego` use the legacy body syntax (`test_name { ... }`) without the `if` keyword. This is intentional and correct for the imports used (only `future.keywords.in` is imported in the test file). Users on OPA v1.0+ may need to update to `if`-style test rules.
- tflint's `call_module_type` config option (used in the post) was introduced in tflint v0.50.0, replacing the older `module` option. The post correctly pairs it with that version.
- The `hashicorp/terraform` Docker image referenced in the GitLab CI example was discontinued after Terraform's license change to BSL, but the image is still available for older versions. Users wanting newer Terraform versions may want to use the official `hashicorp/terraform` image with care or migrate to OpenTofu.
- All Checkov check IDs cited (CKV_AWS_18, CKV_AWS_19, CKV_AWS_21, CKV_AWS_52, CKV_AWS_145) are valid and the descriptions are accurate.
- The pre-commit-terraform `v1.88.0` revision and the `--args=--config=` / `--args=--quiet` / `--args=--compact` argument-passing style are standard usage.
