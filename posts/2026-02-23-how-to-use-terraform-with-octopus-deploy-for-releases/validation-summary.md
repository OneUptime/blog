# Validation Summary: How to Use Terraform with Octopus Deploy for Releases

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Octopus Deploy
- Octopus Deploy Terraform provider
- AWS provider and S3 backend
- Octopus Deploy releases, deployment processes, runbooks, variables, workers, and output variables

## Sources Consulted
- Octopus Deploy Terraform documentation: https://octopus.com/docs/deployments/terraform
- Octopus Deploy Terraform output variables documentation: https://octopus.com/docs/deployments/terraform/terraform-output-variables
- Octopus Deploy Terraform provider v1.0 release announcement: https://octopus.com/blog/terraform-provider-release
- OctopusDeployLabs provider archive and migration notice: https://github.com/OctopusDeployLabs/terraform-provider-octopusdeploy
- Octopus Deploy Terraform provider `octopusdeploy_deployment_process` resource docs: https://registry.terraform.io/providers/OctopusDeploy/octopusdeploy/latest/docs/resources/deployment_process
- Octopus Deploy Terraform provider `octopusdeploy_process_step` resource docs: https://registry.terraform.io/providers/OctopusDeploy/octopusdeploy/latest/docs/resources/process_step
- Octopus Deploy Terraform provider `octopusdeploy_aws_account`, `octopusdeploy_variable`, `octopusdeploy_runbook`, `octopusdeploy_project`, and `octopusdeploy_lifecycle` resource docs: https://registry.terraform.io/providers/OctopusDeploy/octopusdeploy/latest/docs
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3

## Issues Found
- The Octopus Deploy Terraform provider used the archived `OctopusDeployLabs/octopusdeploy` namespace and a pre-1.0 version constraint. Updated the example to use the supported `OctopusDeploy/octopusdeploy` provider with a 1.x constraint.
- The deployment process example used invalid `apply_terraform_template_action` fields (`template_directory`, `managed_account`, `terraform_additional_init_params`, and `plan_only`). Replaced the plan example with a generic `Octopus.TerraformPlan` action using documented Octopus action properties, and updated the apply example to use the provider's documented `template`, `aws_account`, `template_parameters`, `primary_package`, and required `advanced_options` blocks.
- The AWS account was passed directly as a managed account ID in the Terraform step. Added an Octopus AWS account variable and referenced that variable from the Terraform plan/apply actions, matching the provider schema.
- The manual intervention example used `responsible_team_ids`, which is not a valid field for the provider's `manual_intervention_action`. Changed it to the documented `responsible_teams` string field.
- Runbook examples used the deprecated `retention_policy` block. Updated them to `retention_policy_with_strategy` with explicit `Count` strategy and `Items` unit.
- The S3 backend example used deprecated DynamoDB locking via `dynamodb_table`. Replaced it with the current `use_lockfile = true` S3-native locking option.
- The post said Octopus Terraform steps handle state management. Clarified that Octopus works with the configured remote state backend.
- The Terraform output variable example used `TerraformValueOutputs` as the main binding syntax. Updated it to the Octopus-recommended `TerraformJsonOutputs[...].value` syntax.

## Review Notes
The current provider documentation marks `octopusdeploy_deployment_process` as deprecated in favor of `octopusdeploy_process` and `octopusdeploy_process_step`. The post's corrected example is valid for the documented legacy resource shape, but a future larger rewrite should move the process example to the newer resource model.
