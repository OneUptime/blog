# Validation Summary: How to Use Terraform with Wiz for Cloud Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Wiz CLI
- Wiz cloud security platform
- Terraform
- Terraform Cloud / HCP Terraform run tasks
- HashiCorp TFE Terraform provider
- Wiz Terraform provider
- AWS RDS, EC2, IAM, S3, and security groups
- GitHub Actions and SARIF upload

## Sources Consulted
- Wiz CLI v1 local help from `https://wizcli.app.wiz.io/v1/wizcli-linux-amd64`
- Wiz CLI v0 local help from `https://wizcli.app.wiz.io/latest/wizcli-linux-amd64`
- Wiz CLI overview and v1 migration references surfaced by the CLI: `https://docs.wiz.io/wiz-docs/docs/wiz-cli-overview` and `https://docs.wiz.io/docs/introducing-wiz-cli-v1`
- Terraform Registry documentation for `hashicorp/tfe` `tfe_workspace_run_task`: `https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace_run_task`
- Terraform Registry documentation for `hashicorp/tfe` `tfe_organization_run_task`: `https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/organization_run_task`
- Terraform Registry documentation for `rhizo-co/wiz` provider and resources: `https://registry.terraform.io/providers/rhizo-co/wiz/latest/docs`
- Terraform Registry documentation for `rhizo-co/wiz` `wiz_cicd_scan_policy`: `https://registry.terraform.io/providers/rhizo-co/wiz/latest/docs/resources/cicd_scan_policy`
- GitHub CodeQL action SARIF upload documentation: `https://github.com/github/codeql-action/tree/main/upload-sarif`
- AWS provider resource behavior checked against Terraform Registry documentation for `aws_db_instance`, `aws_instance`, `aws_security_group`, `aws_s3_bucket_public_access_block`, `aws_iam_role`, and `aws_iam_policy`: `https://registry.terraform.io/providers/hashicorp/aws/latest/docs`

## Issues Found
- The Wiz CLI install URL and examples used the older v0 command surface. Updated the install URL to the v1 binary and changed examples from `wizcli iac scan --path ...` to `wizcli scan dir ...`.
- The post used `wizcli auth`, which is not part of the Wiz CLI v1 command set. Updated examples to use `WIZ_CLIENT_ID` and `WIZ_CLIENT_SECRET`, which v1 scan commands accept through environment variables.
- The Terraform plan scan used the invalid flag `--type tf-plan`. Updated it to v1 syntax with `--types Terraform`.
- The Wiz CLI output examples used v0-style `--format` and `--output` flags. Updated JSON and SARIF examples to v1 output flags such as `--json-output-file` and `--sarif-output-file`.
- The GitHub Actions workflow used `github/codeql-action/upload-sarif@v2`. Updated it to `@v3`.
- The Terraform Cloud workspace run task used the deprecated `stage` argument. Updated it to `stages = ["post_plan"]`.
- The Wiz Terraform provider example used an outdated provider version constraint and an unsupported generic `wiz_automation_rule` resource shape. Updated the example to use the current `rhizo-co/wiz` provider namespace, `~> 1.1`, and a documented `wiz_cicd_scan_policy` resource.
- The guardrails section described Wiz admission policies for Terraform deployments. Adjusted the wording because admission policy enforcement is specific to supported deployment lifecycles such as admission controllers, while the shown Terraform resources simply align infrastructure with Wiz policies.

## Review Notes
- The Terraform snippets are illustrative and reference resources and variables defined outside the snippets, such as KMS keys, roles, VPCs, and security groups.
- The Wiz Terraform provider is community-published and its latest documented release is older than the current review date, but the corrected resource schema matches the published Terraform Registry documentation.
- Terraform was not installed in the local environment, so full `terraform validate` execution was not available. The examples were reviewed against provider documentation and for HCL syntax consistency.
