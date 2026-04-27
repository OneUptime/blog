# Validation Summary: How to Use OpenTofu with Spacelift Drift Detection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Spacelift
- Spacelift Terraform provider (`spacelift_stack`, `spacelift_drift_detection`, `spacelift_webhook`)
- Open Policy Agent (Rego) for Spacelift plan policies
- AWS (auto-scaling groups, ECS services) as drift examples

## Sources Consulted
- Spacelift Terraform provider source — `resource_stack.go` (https://github.com/spacelift-io/terraform-provider-spacelift/blob/master/spacelift/resource_stack.go)
- Spacelift Terraform provider source — `resource_drift_detection.go` (https://github.com/spacelift-io/terraform-provider-spacelift/blob/master/spacelift/resource_drift_detection.go)
- Spacelift Terraform provider source — `resource_webhook.go` (https://github.com/spacelift-io/terraform-provider-spacelift/blob/master/spacelift/resource_webhook.go)
- Spacelift Drift Detection docs (https://docs.spacelift.io/concepts/stack/drift-detection)
- Spacelift Plan Policy docs (https://docs.spacelift.io/concepts/policy/terraform-plan-policy)
- Terraform Registry — `spacelift_drift_detection` (https://registry.terraform.io/providers/spacelift-io/spacelift/latest/docs/resources/drift_detection)
- Terraform Registry — `spacelift_stack` (https://registry.terraform.io/providers/spacelift-io/spacelift/latest/docs/resources/stack)

## Issues Found

1. **Invalid `opentofu_version` field on `spacelift_stack`** (two occurrences). The Spacelift provider does not expose an `opentofu_version` argument. The OpenTofu version is configured by combining `terraform_workflow_tool = "OPEN_TOFU"` with `terraform_version`. Updated both stack resource blocks accordingly.

2. **Invalid `ignored_run_updaters` field on `spacelift_drift_detection`**. This field does not exist in the `spacelift_drift_detection` schema (valid optional fields are `reconcile`, `timezone`, and `ignore_state`; `stack_id` and `schedule` are required). Removed the field along with its comment.

3. **Incorrect drift-detection check in Rego policies** (three occurrences). Policies used `input.spacelift.run.type == "DRIFT_DETECTION"` (and `!=`). Per Spacelift documentation, drift detection runs are identified by the boolean `input.spacelift.run.drift_detection`. Replaced `== "DRIFT_DETECTION"` with `input.spacelift.run.drift_detection` and `!= "DRIFT_DETECTION"` with `not input.spacelift.run.drift_detection`.

4. **Incorrect Rego input path for resource changes**. The post used `input.spacelift.run.changes.resources[_]` while accessing `change.actions` (plural array) and `change.after` — that nested object structure lives under `input.terraform.resource_changes`, not under `input.spacelift.run.changes` (which uses singular `action`/`entity`/`phase`). Updated all references to `input.terraform.resource_changes[_]` to match the data the policy actually inspects.

5. **`approve` is not a valid plan-policy decision keyword**. Spacelift plan policies only support `warn`, `deny`, and `sample`; `approve` belongs to a different policy type (approval policy). Rewrote the "Handling Legitimate Drift vs Unauthorized Changes" rule to use `warn` with inverted logic — it now warns only when drift is NOT in the expected auto-scaling attributes, preserving the post's original intent of distinguishing expected vs unauthorized drift.

## Review Notes
- The post pins OpenTofu 1.7.0 in examples; this is a reasonable version that matches existing posts in this series, though OpenTofu has since released newer minor versions. Readers should adjust to the version supported by their Spacelift workers.
- The `secret` field on `spacelift_webhook` is deprecated in favor of `secret_wo`/`secret_wo_version`. The post does not use `secret`, so no change was needed, but anyone copying this template to add an HMAC-signed webhook should prefer the write-only variants.
- The cron expression `*/30 * * * *` is a standard 5-field expression accepted by Spacelift's scheduler; no change required.
