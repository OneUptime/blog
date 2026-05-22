# Validation Summary: How to Integrate Terraform with Compliance Tools

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI and Terraform JSON plan output
- HashiCorp Sentinel for HCP Terraform / Terraform Enterprise policy enforcement
- Open Policy Agent (OPA) and Rego
- Conftest
- Checkov and Checkov GitHub Action
- terraform-compliance
- Regula
- GitHub Actions
- AWS Terraform provider resources for S3, EC2, RDS, EBS, and security groups

## Sources Consulted
- HashiCorp Terraform `show -json` command documentation: https://developer.hashicorp.com/terraform/cli/commands/show
- HashiCorp Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- HashiCorp Sentinel `tfplan/v2` import documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfplan-v2
- HashiCorp Sentinel enforcement levels documentation: https://developer.hashicorp.com/sentinel/docs/concepts/enforcement-levels
- Open Policy Agent Rego `if` keyword documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/if
- Open Policy Agent CLI documentation for `opa eval` and `--fail-defined`: https://www.openpolicyagent.org/docs
- Conftest documentation and examples: https://www.conftest.dev/options/
- Conftest installation documentation: https://www.conftest.dev/install/
- Checkov CLI command reference: https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html
- Checkov SARIF output documentation: https://www.checkov.io/8.Outputs/SARIF.html
- Checkov GitHub Action input reference: https://github.com/bridgecrewio/checkov-action
- GitHub SARIF upload documentation: https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/uploading-a-sarif-file-to-github
- terraform-compliance usage documentation: https://terraform-compliance.com/pages/usage/
- Regula repository and archival notice: https://github.com/fugue/regula
- Terraform AWS provider `aws_s3_bucket_server_side_encryption_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- Terraform AWS provider `aws_s3_bucket_versioning` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_versioning
- Terraform AWS provider `aws_s3_bucket_acl` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_acl

## Issues Found
- The OPA Rego examples used pre-OPA-1.0 partial set syntax (`deny[msg]`). Updated them to current Rego v1 syntax using `import rego.v1` and `deny contains msg if`.
- The OPA `opa eval` commands only printed deny results and would not fail the workflow when violations existed. Added `--fail-defined` and queried `data.<package>.deny[_]` so CI exits non-zero on policy violations.
- The workflow ran `conftest` without installing it. Added an installation step based on the official Conftest release installation instructions.
- The Conftest examples used packages named `terraform.tags` and `terraform.security` but did not pass matching namespaces. Added `--namespace terraform.tags` and `--namespace terraform.security`.
- The Sentinel S3 example checked `server_side_encryption_configuration` and `versioning` directly on `aws_s3_bucket`, which is outdated for current AWS provider usage. Updated the example to check the standalone `aws_s3_bucket_server_side_encryption_configuration` and `aws_s3_bucket_versioning` resources.
- The Checkov custom policy example did not show how to load the custom check directory in the GitHub Action. Added `external_checks_dirs: custom_checks/`.
- The SARIF upload action used `github/codeql-action/upload-sarif@v2`, which is outdated. Updated it to `@v4` per current GitHub documentation.
- The terraform-compliance example passed a generated JSON plan file, but the documented `-p/--planfile` usage expects the saved Terraform plan or state output and performs JSON conversion itself. Updated the examples to pass the saved plan file.
- The Regula section claimed SOC2 and HIPAA framework mapping and used `--input-type tf-plan` against a Terraform source directory. Updated the wording to CIS benchmarks, noted Regula is no longer actively maintained, and changed the command to run against `tfplan.json`.
- The combined pipeline's Conftest invocation used the default namespace and therefore would not evaluate the shown policy packages. Updated it to run both namespaces.

## Review Notes
- The Rego examples were verified locally with OPA 1.16.2.
- The Sentinel S3 policy remains a simplified example: it checks configured encryption and versioning resources in the plan, but a production policy should also correlate created buckets with matching encryption/versioning resources so omitted configuration cannot pass by absence.
