# Validation Summary: How to Use Terraform with Bridgecrew for Compliance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Checkov
- Bridgecrew / Prisma Cloud
- GitHub Actions
- SARIF
- Python custom Checkov policies
- YAML custom Checkov policies
- AWS S3 Terraform resources

## Sources Consulted
- Checkov CLI Command Reference: https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html
- Checkov Hard and Soft Fail documentation: https://www.checkov.io/2.Basics/Hard%20and%20soft%20fail.html
- Checkov Python Custom Policies documentation: https://www.checkov.io/3.Custom%20Policies/Python%20Custom%20Policies.html
- Checkov YAML Custom Policies documentation: https://www.checkov.io/3.Custom%20Policies/YAML%20Custom%20Policies.html
- Checkov Terraform provider check contribution documentation: https://www.checkov.io/6.Contribution/Contribute%20New%20Terraform%20Provider.html
- Checkov GitHub Action metadata: https://raw.githubusercontent.com/bridgecrewio/checkov-action/master/action.yml
- GitHub SARIF upload documentation: https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/uploading-a-sarif-file-to-github
- HashiCorp setup-terraform GitHub Action documentation: https://github.com/hashicorp/setup-terraform
- Terraform AWS provider S3 server-side encryption resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Terraform AWS provider S3 bucket logging resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_logging

## Issues Found
- The post used `--check CIS_AWS` and `--check SOC2`, but Checkov's current CLI documents `--check` as accepting Checkov IDs, Bridgecrew IDs, or severities. Replaced those examples with valid Terraform scan/report commands and a filtered report using explicit Checkov IDs.
- The compliant S3 Terraform example referenced undefined `aws_kms_key.s3` and `aws_s3_bucket.logs` resources. Replaced those references with valid string values for an S3 KMS alias and an existing log bucket name.
- The custom Terraform provider policy imported `BaseProviderCheck` from `checkov.terraform.checks.provider.base_provider_check`, which is not the documented/current import path. Updated it to `checkov.terraform.checks.provider.base_check`.
- The YAML custom policy used `CKV_CUSTOM_003`, while Checkov's YAML policy documentation uses the `CKV2_<provider>_<number>` form. Updated it to `CKV2_CUSTOM_003`.
- The GitHub Actions workflow scanned a Terraform plan with `checkov` in a separate job without installing Checkov in that job. Added an `Install Checkov` step before the plan scan.
- The SARIF upload step used `github/codeql-action/upload-sarif@v2`; GitHub's current documentation uses the current major version `v4`. Updated the workflow to `@v4`.
- The `actions/github-script` snippet called `github.rest.issues.createComment` without awaiting the promise. Added `await` so the PR comment request is reliably completed.

## Review Notes
- Local `checkov` was not preinstalled, so Checkov 3.2.524 was installed into a temporary target directory for CLI behavior checks. Python snippets were also syntax-checked locally.
- Checkov's platform compliance mapping is valid as a platform capability, but local CLI examples should not imply that framework names such as `CIS_AWS` or `SOC2` are accepted by `--check`.
