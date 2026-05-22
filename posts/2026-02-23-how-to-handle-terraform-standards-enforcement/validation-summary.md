# Validation Summary: How to Handle Terraform Standards Enforcement

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- TFLint
- pre-commit
- Checkov
- Open Policy Agent and Rego
- Sentinel for HCP Terraform and Terraform Enterprise
- GitHub Actions

## Sources Consulted
- HashiCorp Terraform CLI documentation: https://developer.hashicorp.com/terraform/cli
- HashiCorp tfplan/v2 Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfplan-v2
- HashiCorp Sentinel language documentation: https://developer.hashicorp.com/sentinel/docs/language
- TFLint documentation and configuration reference: https://github.com/terraform-linters/tflint
- TFLint Terraform ruleset documentation: https://github.com/terraform-linters/tflint-ruleset-terraform
- TFLint AWS ruleset documentation: https://github.com/terraform-linters/tflint-ruleset-aws
- pre-commit-terraform hook definitions: https://github.com/antonbabenko/pre-commit-terraform
- pre-commit-hooks hook definitions: https://github.com/pre-commit/pre-commit-hooks
- Open Policy Agent policy language and CLI documentation: https://www.openpolicyagent.org/docs
- HCP Terraform OPA policy documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/define-policies/opa

## Issues Found
- The pre-commit example listed `detect_aws_credentials` and `detect_private_key` under the `antonbabenko/pre-commit-terraform` repository. Those hooks belong to `pre-commit/pre-commit-hooks` and use hyphenated IDs, so the configuration was split into the correct repository with `detect-aws-credentials` and `detect-private-key`.
- The TFLint configuration used the deprecated `module = true` setting. It was replaced with the current `call_module_type = "local"` setting from TFLint's configuration documentation.
- The AWS TFLint ruleset version was pinned to an old release. It was updated to `v0.47.0`, which is current as of the review date and includes the documented AWS rules referenced in the post.
- The OPA/Rego examples used pre-OPA-v1 partial set syntax such as `deny[msg]`. They were updated to Rego v1 syntax with `import rego.v1` and `deny contains msg if`.
- The S3 encryption Rego example checked the old inline `server_side_encryption_configuration` attribute on `aws_s3_bucket`. It was updated to account for the separate `aws_s3_bucket_server_side_encryption_configuration` resource used by current AWS provider configurations.
- The OPA CI command queried `data.terraform.security`, which would be defined as a package object and would not correctly fail only on policy violations. It now queries each `deny[_]` result with `--fail-defined`.
- The GitHub Actions workflow invoked Terraform, TFLint, Checkov, and OPA without installing them. Setup/install steps were added for each tool.
- The PR comment step required `standards-results.json`, but no previous step generated that file. The script now checks for the file and falls back to a workflow-log message if it is absent.
- The Python metrics helper indexed `files_checked` directly for every category, which would raise `KeyError` for categories such as `naming` and `security`. The lookup now uses `.get()` consistently.
- The Sentinel code block was marked as `python`. The fence was corrected to `sentinel`.

## Review Notes
- The workflow remains a generic example. Real CI usage still needs cloud credentials, backend configuration, and Terraform variable handling appropriate to the target environment.
