# Validation Summary: How to Use Terraform with Prisma Cloud for Security

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- HCP Terraform / Terraform Cloud run tasks
- Prisma Cloud
- Checkov
- GitHub Actions
- CodeQL SARIF upload action
- Palo Alto Networks Prisma Cloud Terraform provider
- AWS Terraform resources

## Sources Consulted
- Checkov CLI Command Reference: https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html
- Checkov Terraform Plan Scanning: https://www.checkov.io/7.Scan%20Examples/Terraform%20Plan%20Scanning.html
- Checkov Python Custom Policies: https://www.checkov.io/3.Custom%20Policies/Python%20Custom%20Policies.html
- Checkov YAML Custom Policies: https://www.checkov.io/3.Custom%20Policies/YAML%20Custom%20Policies.html
- Checkov GitHub Action README and action metadata: https://github.com/bridgecrewio/checkov-action
- GitHub CodeQL Action documentation: https://github.com/github/codeql-action
- HCP Terraform run tasks documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings/run-tasks
- HashiCorp TFE provider `tfe_workspace_run_task` documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace_run_task
- Palo Alto Networks Prisma Cloud Terraform provider documentation: https://registry.terraform.io/providers/PaloAltoNetworks/prismacloud/latest/docs
- Prisma Cloud provider resources for alert rules, policies, and cloud account onboarding: https://registry.terraform.io/providers/PaloAltoNetworks/prismacloud/latest/docs/resources/alert_rule, https://registry.terraform.io/providers/PaloAltoNetworks/prismacloud/latest/docs/resources/policy, https://registry.terraform.io/providers/PaloAltoNetworks/prismacloud/latest/docs/resources/cloud_account_v2
- HashiCorp Terraform drift documentation: https://developer.hashicorp.com/terraform/tutorials/state/resource-drift

## Issues Found
- The post described Checkov as the "Prisma Cloud CLI." Changed this to identify Checkov as the CLI used by Prisma Cloud Application Security for IaC scanning.
- The Prisma Cloud API URL was shown as a universal value. Added a note that users must use the API URL for their own tenant.
- The `checkov --check CIS_AWS` example was invalid for the documented Checkov CLI semantics. Replaced it with `--check HIGH,CRITICAL`, which is supported.
- The Checkov output examples used `--output-file`, but the documented CLI flag is `--output-file-path`. Updated both examples.
- The GitHub Actions workflow scanned a Terraform plan with `checkov` in a separate job without installing Checkov. Added an install step.
- The SARIF upload action used `github/codeql-action/upload-sarif@v2`, which is no longer the current major version. Updated it to `@v4`.
- The VPC Flow Logs custom Python policy always returned `UNKNOWN`, so it did not enforce anything. Replaced it with a YAML connection-state custom policy that checks for an `aws_vpc` connected to an `aws_flow_log`.
- The Prisma Cloud Terraform provider example referenced an undefined `prismacloud_policy.restrict_public_access` resource. Replaced the previous placeholder policy with a defined `restrict_public_access` policy.
- The Prisma Cloud alert notification block used `template_type`, which is not a documented field for `prismacloud_alert_rule.notification_config`. Removed it.
- The custom Prisma Cloud policy example was missing `cloud_type` and used IaC-specific query text in a provider example that was otherwise a run-policy example. Added `cloud_type = "aws"` and changed the rule parameters/query to a documented S3 public-access RQL shape.
- The Terraform provider version constraint was updated from `~> 1.5` to `~> 1.7` to match the current documented provider generation reviewed.
- The `tfe_workspace_run_task` examples used the deprecated `stage` argument. Replaced it with `stages = ["post_plan"]`.
- The post attributed Terraform state drift detection directly to Prisma Cloud. Updated the drift detection language to distinguish Terraform/HCP Terraform drift detection from Prisma Cloud security posture alerts.

## Review Notes
The remaining snippets are illustrative and still require environment-specific values such as Prisma Cloud tenant URL, account IDs, IAM role ARN, Terraform workspace resources, Slack integration recipients, and GitHub repository secrets before use in a real deployment.
