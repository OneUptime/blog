# Validation Summary: How to Use Terraform Stacks for Multi-Region Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform Stacks
- HCP Terraform
- Terraform AWS provider
- AWS VPC, subnets, EC2, IAM OIDC authentication, and Route 53
- Multi-region infrastructure deployment patterns

## Sources Consulted
- Terraform Stacks overview: https://developer.hashicorp.com/terraform/language/stacks
- Terraform Stack deployment configuration: https://developer.hashicorp.com/terraform/language/stacks/deploy/config
- Terraform Stack deployment conditions and auto-approval rules: https://developer.hashicorp.com/terraform/language/stacks/deploy/conditions
- Terraform Stack provider declarations: https://developer.hashicorp.com/terraform/language/stacks/component/declare-providers
- Terraform Stack OIDC authentication: https://developer.hashicorp.com/terraform/language/stacks/deploy/authenticate
- Terraform Stacks GA migration notes: https://developer.hashicorp.com/terraform/language/stacks/update-GA
- HCP Terraform Stacks state documentation: https://developer.hashicorp.com/terraform/cloud-docs/stacks/state

## Issues Found
- The post used beta-era Stack component file naming (`.tfstack.hcl`). Updated examples to use the current GA `.tfcomponent.hcl` extension.
- The post described Terraform Stacks as introduced in Terraform 1.7+. Removed the stale version-specific claim and described Stacks as an HCP Terraform feature supported by current Terraform Stacks documentation.
- The component module example declared its own AWS provider. Current Stack provider documentation says modules sourced by `component` blocks cannot declare their own providers; removed the module-level provider block and kept provider configuration in the Stack component configuration.
- The Stack provider configuration omitted `required_providers` and the `web_identity_token` argument required for AWS OIDC authentication. Added `required_providers`, an ephemeral `identity_token` variable, and `web_identity_token = var.identity_token`.
- The deployment examples used a nonstandard OIDC audience and did not pass `identity_token.aws.jwt` into deployment inputs. Updated the audience to `aws.workload.identity` and passed the generated JWT to each deployment.
- The post used deprecated `orchestrate "auto_approve"` syntax. Replaced it with GA `deployment_auto_approve` and `deployment_group` syntax.
- The state management section showed one state file per component per deployment. HCP Terraform stores one state file per deployment containing every component in that deployment; updated the explanation and conceptual diagram.
- The cross-region dependency wording implied direct references to resources in other regions, while the example references outputs from another component in the same deployment. Reworded it to describe global resources referencing regional component outputs.
- The rolling update section used "rollback" terminology. Terraform does not provide an automatic rollback workflow; updated the wording to describe reverting a change and applying again.

## Review Notes
The examples are illustrative and still omit some production details, such as complete compute and DNS component module definitions, real AMI discovery, AWS IAM trust policy setup, and health-check automation outside Terraform. Those omissions are acceptable for a conceptual tutorial, but a future hands-on version should include a complete runnable Stack repository and note HCP Terraform edition requirements for deployment group orchestration.
