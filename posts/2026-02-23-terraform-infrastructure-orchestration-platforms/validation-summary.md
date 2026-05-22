# Validation Summary: How to Use Terraform with Infrastructure Orchestration Platforms

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- Spacelift Terraform provider
- Spacelift stack dependencies, drift detection, and policies
- env0 Terraform provider
- HCP Terraform and Terraform Enterprise
- Open Policy Agent/Rego

## Sources Consulted
- Spacelift Terraform provider `spacelift_stack` resource: https://raw.githubusercontent.com/spacelift-io/terraform-provider-spacelift/main/docs/resources/stack.md
- Spacelift Terraform provider `spacelift_stack_dependency` resource: https://raw.githubusercontent.com/spacelift-io/terraform-provider-spacelift/main/docs/resources/stack_dependency.md
- Spacelift Terraform provider `spacelift_stack_dependency_reference` resource: https://raw.githubusercontent.com/spacelift-io/terraform-provider-spacelift/main/docs/resources/stack_dependency_reference.md
- Spacelift Terraform provider `spacelift_drift_detection` resource: https://raw.githubusercontent.com/spacelift-io/terraform-provider-spacelift/main/docs/resources/drift_detection.md
- Spacelift Terraform provider `spacelift_policy` and `spacelift_policy_attachment` resources: https://raw.githubusercontent.com/spacelift-io/terraform-provider-spacelift/main/docs/resources/policy.md and https://raw.githubusercontent.com/spacelift-io/terraform-provider-spacelift/main/docs/resources/policy_attachment.md
- Spacelift plan policy documentation: https://docs.spacelift.io/concepts/policy/terraform-plan-policy
- Spacelift approval policy documentation: https://docs.spacelift.io/concepts/policy/approval-policy
- env0 Terraform provider `env0_project`, `env0_template`, `env0_template_project_assignment`, `env0_configuration_variable`, and `env0_project_budget` resources: https://raw.githubusercontent.com/env0/terraform-provider-env0/master/docs/resources/project.md, https://raw.githubusercontent.com/env0/terraform-provider-env0/master/docs/resources/template.md, https://raw.githubusercontent.com/env0/terraform-provider-env0/master/docs/resources/template_project_assignment.md, https://raw.githubusercontent.com/env0/terraform-provider-env0/master/docs/resources/configuration_variable.md, and https://raw.githubusercontent.com/env0/terraform-provider-env0/master/docs/resources/project_budget.md
- HCP Terraform overview and Terraform Enterprise naming: https://developer.hashicorp.com/terraform/cloud-docs
- Terraform releases: https://github.com/hashicorp/terraform/releases and https://releases.hashicorp.com/terraform/

## Issues Found
- Replaced "Terraform Cloud Enterprise" with "HCP Terraform, and Terraform Enterprise" because Terraform Cloud was renamed HCP Terraform and Terraform Enterprise is the self-hosted distribution.
- Updated Spacelift and env0 provider version constraints to current major/minor examples checked against the Terraform Registry search results and provider docs.
- Updated Terraform version examples from 1.7.0 to 1.15.2, matching the current official HashiCorp release source available during review.
- Corrected the Spacelift stack comment that said `autodeploy = false` enabled drift detection. That setting disables automatic deployment; drift detection is configured with `spacelift_drift_detection`.
- Replaced the invalid env0 `project_ids` argument on `env0_template` with `env0_template_project_assignment`, matching the env0 provider schema.
- Corrected env0 project budget `timeframe` from `monthly` to `MONTHLY`, one of the documented enum values.
- Replaced an undefined `spacelift_stack.monitoring` reference in the drift detection snippet with a stack defined earlier in the post.
- Corrected the Spacelift approval policy input path from `input.reviews.approvals` and `input.reviews.rejections` to `input.reviews.current.approvals` and `input.reviews.current.rejections`, matching the documented approval policy input schema.

## Review Notes
The Spacelift and env0 snippets are illustrative and still require real VCS integrations, credentials, repositories, stack outputs, and organization-specific permissions to run in a live account. The Rego examples use Rego v0-style rule syntax, which Spacelift still documents alongside Rego v1 examples.
