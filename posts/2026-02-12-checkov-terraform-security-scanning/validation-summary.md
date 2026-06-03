# Validation Summary: How to Use Checkov for Terraform Security Scanning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Checkov
- Terraform
- AWS S3
- GitHub Actions
- SARIF code scanning uploads
- pre-commit
- YAML and Python custom Checkov policies

## Sources Consulted
- Checkov CLI Command Reference: https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html
- Checkov Terraform Plan Scanning: https://www.checkov.io/7.Scan%20Examples/Terraform%20Plan%20Scanning.html
- Checkov Terraform Scanning and External Modules: https://www.checkov.io/7.Scan%20Examples/Terraform.html
- Checkov Suppressing and Skipping Policies: https://www.checkov.io/2.Basics/Suppressing%20and%20Skipping%20Policies.html
- Checkov YAML Custom Policies: https://www.checkov.io/3.Custom%20Policies/YAML%20Custom%20Policies.html
- Checkov pre-commit Hooks: https://www.checkov.io/4.Integrations/pre-commit.html
- bridgecrewio/checkov-action README: https://github.com/bridgecrewio/checkov-action
- GitHub Docs, Uploading a SARIF file: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/uploading-a-sarif-file-to-github
- HashiCorp Terraform JSON plan format: https://developer.hashicorp.com/terraform/internals/json-format
- Terraform AWS Provider S3 encryption resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration

## Issues Found
- The S3 logging example referenced `aws_s3_bucket.logs.id` without defining a log bucket. Added a minimal `aws_s3_bucket.logs` resource and changed the comment from "all security checks passing" to "the common findings fixed" so the snippet is valid without claiming the log bucket itself is fully hardened.
- The GitHub Actions SARIF workflow omitted permissions required for SARIF upload in many repositories. Added `contents: read`, `security-events: write`, and `actions: read`, matching GitHub's SARIF upload guidance.
- The Checkov action example used a single SARIF output path while the official action example pairs `cli,sarif` with `console,results.sarif`. Updated the output settings so console output and SARIF file generation are both explicit.
- The SARIF upload action version was behind the current documented major version. Updated `github/codeql-action/upload-sarif` from `v3` to `v4`.
- The YAML custom policy used `category: "General"`, which is not one of Checkov's documented category values. Changed it to `GENERAL_SECURITY`.
- The compliance framework examples used `--check-type`, which is not a current Checkov CLI option. Replaced those commands with valid `--check` examples for explicit policy IDs and severity filtering.

## Review Notes
- Checkov and Terraform were not installed in the workspace. I installed Checkov `3.2.532` into `/tmp` only to inspect current CLI help, and did not modify project dependencies.
- The pre-commit example pins an older Checkov release. It is syntactically valid, but future maintenance should update `rev` to a current Checkov tag or a reviewed commit SHA.
