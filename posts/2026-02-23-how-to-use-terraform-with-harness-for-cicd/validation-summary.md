# Validation Summary: How to Use Terraform with Harness for CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Harness Terraform Provider
- Harness CD pipelines
- Harness Terraform Plan and Apply steps
- Harness IaCM workspaces
- Harness Policy as Code / OPA / Rego
- AWS and GitHub Harness connectors
- Kubernetes deployment stages

## Sources Consulted
- Harness Terraform Provider quickstart: https://developer.harness.io/docs/platform/Terraform/harness-terraform-provider
- Harness Terraform provisioning overview: https://developer.harness.io/docs/continuous-delivery/cd-infrastructure/terraform-infra/terraform-provisioning-with-harness/
- Harness Terraform Plan step documentation: https://developer.harness.io/docs/continuous-delivery/cd-infrastructure/terraform-infra/run-a-terraform-plan-with-the-terraform-plan-step
- Harness dynamic Terraform provisioning documentation: https://developer.harness.io/docs/continuous-delivery/cd-infrastructure/terraform-infra/provision-infra-dynamically-with-terraform/
- Harness Policy as Code for Terraform: https://developer.harness.io/docs/platform/governance/policy-as-code/policy-as-code-for-terraform/
- Harness IaCM OPA policies documentation: https://developer.harness.io/docs/infra-as-code-management/policies-governance/opa-workspace/
- Harness Terraform provider `harness_platform_workspace` resource: https://registry.terraform.io/providers/harness/harness/latest/docs/resources/platform_workspace
- Harness Terraform provider `harness_platform_policy` resource: https://registry.terraform.io/providers/harness/harness/latest/docs/resources/platform_policy
- Harness Terraform provider `harness_platform_policyset` resource: https://registry.terraform.io/providers/harness/harness/latest/docs/resources/platform_policyset
- Harness Terraform provider `harness_platform_monitored_service` resource: https://registry.terraform.io/providers/harness/harness/latest/docs/resources/platform_monitored_service
- Harness Terraform provider `harness_platform_connector_github` resource: https://registry.terraform.io/providers/harness/harness/latest/docs/resources/platform_connector_github
- Harness Terraform provider `harness_platform_connector_aws` resource: https://registry.terraform.io/providers/harness/harness/latest/docs/resources/platform_connector_aws
- Terraform `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan

## Issues Found
- The Harness provider version constraint was pinned to `~> 0.30`, while the post used current IaCM workspace resources and fields documented in the newer provider. Updated the constraint to `~> 0.42`.
- The Terraform Plan step omitted `repoName` for an account-level GitHub connector and omitted the AWS provider credential block. Added `repoName`, `moduleSource.useConnectorCredentials`, `providerCredential`, and a var-file identifier to match Harness Terraform Plan step examples.
- The Terraform Plan step used `account.harnessSecretManager`; official examples use `harnessSecretManager` for the built-in secret manager reference. Updated the reference.
- The Kubernetes Deployment stage lacked a `service` block, which is required for a Harness Deployment stage. Added a minimal `serviceRef` and Kubernetes service input structure.
- The IaCM workspace resource used invalid/outdated fields: `terraform_version`, plural `environment_variables`, plural `terraform_variables`, and a repository value that was not a URL. Updated to `provisioner_version`, singular nested `environment_variable` and `terraform_variable` blocks, a GitHub URL, `cost_estimation_enabled`, and a provider `connector` block. Also changed the Terraform version to `1.5.7` because Harness workspace documentation states Terraform is supported up to 1.5.7.
- The OPA policy used a non-Harness Terraform Plan input shape (`input.action`, `input.environment`, `input.approved`) and indexed `input.plan.resource_changes` inconsistently. Updated the Rego to use the documented Terraform Plan input shape with `input.plan.resource_changes[_]`.
- The policy set used `type = "custom"` and a `policies` block for Terraform plan enforcement. Updated it to a Terraform Plan policy set type and `policy_references`, matching current provider examples and Harness Terraform policy guidance.
- The monitored service example used invalid top-level fields (`name`, `service_ref`, `environment_ref`, `type`) for `harness_platform_monitored_service`. Updated it to use the documented `request` block.

## Review Notes
The post remains a high-level integration guide and still uses placeholder Harness identifiers such as `sample_service`, `account.k8s_connector`, and `account.platform_team`; those must exist in the reader's Harness account for the examples to run. Harness IaCM and CD YAML schemas continue to evolve, so future reviews should re-check provider resource schemas and pipeline YAML examples against the current Harness docs.
