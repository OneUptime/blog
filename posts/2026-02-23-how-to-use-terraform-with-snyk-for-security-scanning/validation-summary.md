# Validation Summary: How to Use Terraform with Snyk for Security Scanning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Snyk CLI
- Snyk Infrastructure as Code
- Snyk GitHub Actions
- Terraform
- Terraform plan JSON output
- Terraform Cloud / HCP Terraform run tasks
- HashiCorp AWS and TFE Terraform providers
- GitHub Code Scanning SARIF upload
- jq

## Sources Consulted
- Snyk CLI `iac test` command documentation: https://docs.snyk.io/developer-tools/snyk-cli/commands/iac-test
- Snyk CLI for IaC documentation: https://docs.snyk.io/developer-tools/snyk-cli/scan-and-maintain-projects-using-the-cli/snyk-cli-for-iac
- Snyk Terraform files and Terraform plan scanning documentation: https://docs.snyk.io/cli-ide-and-ci-cd-integrations/snyk-cli/scan-and-maintain-projects-using-the-cli/snyk-cli-for-iac/test-your-iac-files/terraform-files
- Snyk IaC ignores using the `.snyk` policy file: https://docs.snyk.io/developer-tools/snyk-cli/scan-and-maintain-projects-using-the-cli/snyk-cli-for-iac/iac-ignores-using-the-.snyk-policy-file
- Snyk `.snyk` policy file documentation: https://docs.snyk.io/manage-risk/policies/the-.snyk-file
- Snyk IaC custom rules documentation: https://docs.snyk.io/scan-with-snyk/snyk-iac/current-iac-custom-rules
- Snyk IaC Rules SDK install and bundle documentation: https://docs.snyk.io/scan-with-snyk/snyk-iac/current-iac-custom-rules/install-the-sdk and https://docs.snyk.io/scan-with-snyk/snyk-iac/current-iac-custom-rules/writing-rules-using-the-sdk/bundling-rules
- Snyk GitHub Action for Infrastructure as Code: https://github.com/snyk/actions/tree/master/iac
- Snyk Terraform Cloud run task integration documentation: https://docs.snyk.io/scm-ide-and-ci-cd-integrations/snyk-ci-cd-integrations/terraform-cloud-integration-for-snyk-iac-using-run-tasks/set-up-the-terraform-cloud-integration-for-iac
- HashiCorp TFE provider `tfe_organization_run_task` and `tfe_workspace_run_task` resources: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/organization_run_task and https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace_run_task
- HashiCorp AWS provider `aws_s3_bucket_server_side_encryption_configuration` and `aws_db_instance` resources: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- GitHub SARIF upload documentation: https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/uploading-a-sarif-file-to-github

## Issues Found
- The GitHub SARIF upload example used `github/codeql-action/upload-sarif@v2`. Updated it to `@v4`, matching current GitHub documentation.
- The CI example attempted to scan the binary Terraform plan file directly. Snyk requires Terraform plans to be converted with `terraform show -json`, so a conversion step was added and the Snyk scan now targets `tfplan.json`.
- The custom rules section showed an unsupported `.snyk.d/rules/custom-rules.json` format. Replaced it with the supported `.snyk` ignore policy format and Snyk IaC Rules SDK bundle workflow.
- The `.snyk` example omitted the policy schema version and used a date-only expiry. Added `version: v1.25.0` and changed the expiry to a JavaScript date-time string.
- The Terraform plan shell script used `set -e` with `snyk iac test`, which would stop the script before parsing JSON results when Snyk found issues. Adjusted the script to capture the Snyk exit code and continue when scan results were produced.
- The Terraform Cloud run task example used the deprecated `stage` argument. Updated it to `stages = ["post_plan"]`.
- The Terraform Cloud run task example hardcoded a Snyk URL. Changed it to `var.snyk_run_task_url` because Snyk documents using the URL provided by the organization's Terraform Cloud integration settings.
- The monitoring section used `snyk monitor --all-projects` and `command: monitor` for Snyk IaC. Snyk IaC CLI has no equivalent monitor command, and the Snyk IaC GitHub Action supports `test`; updated the section to use recurring `snyk iac test --report` snapshots.
- The conclusion and best practices implied continuous IaC monitoring from the CLI. Updated the wording to distinguish recurring IaC reports and SCM integration from `snyk monitor`.

## Review Notes
The Terraform resource snippets are illustrative and reference resources such as KMS keys, log buckets, subnet groups, and security groups that are not fully defined in the post. That is acceptable for a focused security-scanning guide, but a future expansion could include complete runnable Terraform examples.
