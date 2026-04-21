# Validation Summary: How to Use Spacelift with OpenTofu for Policy Enforcement

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Spacelift
- Open Policy Agent
- Rego
- Terraform/OpenTofu provider configuration
- Infrastructure as Code policy enforcement

## Sources Consulted
- Spacelift provider `spacelift_stack` resource documentation: https://github.com/spacelift-io/terraform-provider-spacelift/blob/main/docs/resources/stack.md
- Spacelift provider `spacelift_policy` resource documentation: https://github.com/spacelift-io/terraform-provider-spacelift/blob/main/docs/resources/policy.md
- Spacelift provider `spacelift_policy_attachment` resource documentation: https://github.com/spacelift-io/terraform-provider-spacelift/blob/main/docs/resources/policy_attachment.md
- Spacelift provider `spacelift_environment_variable` resource documentation: https://github.com/spacelift-io/terraform-provider-spacelift/blob/main/docs/resources/environment_variable.md
- Spacelift Workflow Tool documentation: https://docs.spacelift.io/vendors/terraform/workflow-tool
- Spacelift Policy documentation: https://docs.spacelift.io/concepts/policy
- Spacelift Plan Policy documentation: https://docs.spacelift.io/concepts/policy/terraform-plan-policy
- Spacelift Approval Policy documentation: https://docs.spacelift.io/concepts/policy/approval-policy
- Open Policy Agent policy language documentation: https://www.openpolicyagent.org/docs/latest/policy-language/

## Issues Found
- The `spacelift_stack` example used `repository = "my-org/infra-repo"`, but the provider expects the repository name without the owner. Changed it to `repository = "infra-repo"`.
- The stack example used `opentofu_version`, which is not a current `spacelift_stack` argument. Replaced it with `terraform_workflow_tool = "OPEN_TOFU"` and `terraform_version = "1.9.0"`.
- The `autodeploy = false` example had a comment saying it enabled auto-apply. Updated the comment to say auto-apply is disabled.
- The policy examples used older Rego syntax without declaring the engine. Updated the snippets to Rego v1 syntax and set `engine_type = "REGO_V1"` on the policy resource.
- The mandatory tags policy compared required tag keys with tag values from Terraform/OpenTofu plan JSON. Updated it to check for required tag keys on `resource.change.after.tags`.
- The approval policy used the wrong input path, `input.reviews.approvals`. Updated it to use `input.reviews.current.approvals` and require zero current rejections.
- The environment variable example described the values as AWS credentials, but the snippet only sets non-secret AWS configuration. Updated the comment accordingly.
- The conclusion referenced access policies even though the article only demonstrates plan and approval policies, and Spacelift now steers access control toward Spaces. Updated the conclusion to reference plan and approval policies.

## Review Notes
The Rego snippets were checked with OPA 1.15.2. The provider and Spacelift examples were reviewed against current official Spacelift documentation. For actual secrets, the current Spacelift provider documentation recommends `value_wo` and `value_wo_version` for write-only values when using Terraform/OpenTofu 1.11 or newer.
