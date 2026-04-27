# Validation Summary: How to Use OpenTofu with Spacelift Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Spacelift
- Open Policy Agent (OPA)
- Rego (policy language)
- Terraform `spacelift-io/spacelift` provider
- HCL

## Sources Consulted
- Spacelift Terraform provider `spacelift_stack` resource docs (https://github.com/spacelift-io/terraform-provider-spacelift/blob/master/docs/resources/stack.md)
- Spacelift Terraform provider `spacelift_policy` resource docs (https://github.com/spacelift-io/terraform-provider-spacelift/blob/master/docs/resources/policy.md)
- Spacelift Plan policy docs (https://docs.spacelift.io/concepts/policy/terraform-plan-policy)
- Spacelift Approval policy docs (https://docs.spacelift.io/concepts/policy/approval-policy)
- Spacelift Login policy docs (https://docs.spacelift.io/concepts/policy/login-policy)
- Spacelift policy contract schema (https://app.spacelift.io/.well-known/policy-contract.json)
- Spacelift policies example library (https://github.com/spacelift-io/spacelift-policies-example-library)

## Issues Found
1. **`spacelift_stack` had a non-existent `opentofu_version` field.** The provider has no such field. To use OpenTofu you set `terraform_workflow_tool = "OPEN_TOFU"` and specify the version with `terraform_version`. Replaced the single `opentofu_version = "1.7.0"` line with both correct fields.

2. **Plan policy used the wrong input path.** The post used `input.spacelift.run.changes.resources[_]` with `resource.change.actions[_]` semantics. That path does not exist. Plan policies receive Terraform plan data at `input.terraform.resource_changes[_]` (each entry having `change.actions`). Updated the `protect-production.rego` and `tagging.rego` examples to use `input.terraform.resource_changes`.

3. **Approval policy was structurally wrong.** It used `warn` (only valid for plan policies) and the same incorrect `input.spacelift.run.changes.resources` path with terraform-plan-style action values like `"create"`/`"update"`. Approval policies use boolean `approve` and `reject` rules, and changes are at `input.run.changes` with `action` values `"added"` / `"changed"` / `"deleted"`. Rewrote the example to use `input.run.changes`, `change.action == "added"`, removed the invalid `warn` rule, and added `import future.keywords.every` since `every` is required. The intent (auto-approve trivial runs; everything else needs human approval) is preserved — the absence of any `approve` rule firing means the run sits awaiting manual approval.

4. **Login policy used a non-existent `read` rule.** Login policies support `admin`, `allow`, and `deny` (plus `deny_admin` and `roles`). Changed `read` to `allow`, which is the correct rule for granting non-admin login.

## Review Notes
- All Rego examples use Rego v0 partial-set syntax (`deny[msg] { ... }`). The `spacelift_policy` resource defaults align with that, but a future-proof version would use `engine_type = "REGO_V1"` along with `import rego.v1` and `deny contains msg if { ... }`. Left unchanged to keep the post's style consistent.
- The tag-compliance policy's `{k | k := object.keys(resource.change.after.tags)[_]}` will error on resources whose `tags` attribute is null/absent. A defensive guard could be added in the future, but the example as written is technically valid Rego.
- `terraform_workflow_tool` defaults to `TERRAFORM_FOSS`; the `OPEN_TOFU` value was introduced in the Spacelift provider after OpenTofu support landed in Spacelift (mid-2024) and remains current as of the provider's latest release.
