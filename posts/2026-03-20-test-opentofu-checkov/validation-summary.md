# Validation Summary: How to Test OpenTofu Configurations with Checkov

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Checkov
- Terraform-compatible HCL
- AWS Terraform provider resources
- Checkov YAML custom policies
- Checkov Python custom policies
- GitHub Actions
- SARIF code scanning output

## Sources Consulted
- Checkov installation and CLI command reference: https://www.checkov.io/2.Basics/Installing%20Checkov.html and https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html
- Checkov README and supported IaC frameworks, including OpenTofu: https://github.com/bridgecrewio/checkov
- Checkov suppressing and skipping policies documentation: https://www.checkov.io/2.Basics/Suppressing%20and%20Skipping%20Policies.html
- Checkov YAML custom policy documentation and examples: https://www.checkov.io/3.Custom%20Policies/YAML%20Custom%20Policies.html and https://www.checkov.io/3.Custom%20Policies/Examples.html
- Checkov Python custom policy documentation: https://www.checkov.io/3.Custom%20Policies/Python%20Custom%20Policies.html
- Checkov GitHub Action documentation: https://github.com/bridgecrewio/checkov-action
- Checkov SARIF output documentation: https://www.checkov.io/8.Outputs/SARIF.html
- GitHub SARIF upload documentation: https://docs.github.com/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/uploading-a-sarif-file-to-github
- Terraform AWS provider documentation for `aws_s3_bucket_logging`, `aws_s3_bucket_server_side_encryption_configuration`, and `aws_security_group`: https://github.com/hashicorp/terraform-provider-aws/tree/main/website/docs/r
- Local verification with Checkov 3.2.524 installed in `/tmp/checkov-review-target`

## Issues Found
- Corrected the `CKV_AWS_20` example description. Current Checkov identifies this as public READ ACL exposure, not a generic "ACL is private" check.
- Corrected the S3 versioning check ID in `.checkov.yaml` from `CKV_AWS_57` to `CKV_AWS_21`. `CKV_AWS_57` checks public WRITE ACL exposure.
- Updated the suppression example to suppress `CKV_AWS_260` on public port 80, which matches Checkov's unrestricted HTTP security group check. The previous `CKV_AWS_25` check applies to public RDP/3389 and did not match the HTTPS example.
- Updated the YAML custom policy ID to the documented `CKV2_CUSTOM_1` style for graph/YAML policies.
- Updated the Python custom policy instantiation from `scanner = ...` to `check = ...`, matching Checkov's documented custom policy pattern, and noted the `__init__.py` requirement for loading Python checks from a custom directory.
- Added `external-checks-dir` to the Checkov configuration snippet so the shown custom policy directory is actually loaded.
- Changed `output-file-path` to `console,checkov-results.sarif` so the multi-output config writes CLI output to the console and SARIF to the intended file instead of creating a directory named `checkov-results.sarif`.
- Added GitHub Actions permissions required for SARIF upload: `contents: read`, `security-events: write`, and `actions: read`.
- Replaced the undefined `aws_s3_bucket.log_bucket.id` reference in the S3 logging example with a literal target bucket name.

## Review Notes
The S3 access logging snippet is still intentionally compact; in a full deployment, the target logging bucket must exist and grant the S3 logging service permission to write logs. All adjusted Checkov examples were verified with the current Checkov CLI.
