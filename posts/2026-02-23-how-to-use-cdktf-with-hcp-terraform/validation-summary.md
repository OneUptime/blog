# Validation Summary: How to Use CDKTF with HCP Terraform

## Status
validated

## Post Type
Technical tutorial / integration guide

## Technologies Covered
- CDK for Terraform (CDKTF)
- HCP Terraform / Terraform Cloud
- Terraform CLI cloud integration
- CDKTF CLI
- TypeScript
- AWS provider for CDKTF
- HCP Terraform workspace variables
- HCP Terraform run triggers
- Sentinel and Open Policy Agent policies
- HCP Terraform cost estimation

## Sources Consulted
- HashiCorp CDKTF: Connect to HCP Terraform / Terraform Enterprise: https://developer.hashicorp.com/terraform/cdktf/create-and-deploy/hcp-terraform
- HashiCorp CDKTF CLI command reference: https://developer.hashicorp.com/terraform/cdktf/cli-reference/commands
- HashiCorp CDKTF API reference for `CloudBackend`, `NamedCloudWorkspace`, and `TaggedCloudWorkspaces`: https://developer.hashicorp.com/terraform/cdktf/api-reference/typescript/classes
- HashiCorp CDKTF variables and outputs documentation: https://developer.hashicorp.com/terraform/cdktf/concepts/variables-and-outputs
- HCP Terraform overview and rename information: https://developer.hashicorp.com/terraform/cloud-docs
- HCP Terraform CLI integration documentation: https://developer.hashicorp.com/terraform/cli/cloud
- HCP Terraform remote operations documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/remote-operations
- HCP Terraform workspace settings documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings
- HCP Terraform workspace variables API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspace-variables
- HCP Terraform workspaces API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HCP Terraform run triggers documentation: https://developer.hashicorp.com/terraform/enterprise/workspaces/settings/run-triggers
- HCP Terraform policy enforcement documentation: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement
- HCP Terraform OPA policy documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/define-policies/opa
- HCP Terraform organization cost estimation setting documentation: https://developer.hashicorp.com/terraform/cloud-docs/users-teams-organizations/organizations/settings
- Terraform Registry AWS provider `aws_db_instance` TypeScript reference: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance?lang=typescript

## Issues Found
- CDKTF is now deprecated. Added a note that HashiCorp deprecated CDKTF on December 10, 2025 and no longer supports or maintains it, so the guide is framed for existing CDKTF projects.
- The setup commands used `terraform login` but the CDKTF HCP Terraform workflow documents `cdktf login`. Updated the setup to install `cdktf-cli` and use `cdktf login`.
- The tag-based workspace snippet referenced CDKTF classes without importing them. Added the missing imports.
- The workspace variable API example implied a Terraform CLI variable-setting command but only showed the API flow. Reworded the comment to point to the API or TFE provider.
- The RDS example used `DbInstance` without importing it and omitted required practical configuration such as allocated storage, username, and final snapshot handling. Added the import and minimal required fields.
- The local execution section did not mention that HCP Terraform workspace variables and variable sets are not evaluated in local execution mode. Added that caveat.
- The multiple-environment section incorrectly stated that `CloudBackend` must be created inside the stack constructor. Official CDKTF docs allow configuring it outside the stack as long as it happens before `app.synth()`. Corrected the explanation while keeping the constructor-based example as an encapsulation option.
- The EC2 example used an old hard-coded AMI ID. Replaced it with an `aws_ami` data source via CDKTF so the example selects the latest matching Amazon Linux 2023 AMI in the configured region.

## Review Notes
The CDKTF APIs shown are still documented, but CDKTF itself is deprecated and unsupported as of December 10, 2025. Future blog updates should consider recommending maintained Terraform workflows for new projects rather than CDKTF.
