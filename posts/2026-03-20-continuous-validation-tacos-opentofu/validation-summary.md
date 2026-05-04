# Validation Summary: How to Use Continuous Validation with TACOS in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- TACOS platforms (Spacelift, env0, Scalr, Terrateam)
- Spacelift Terraform provider (`spacelift-io/spacelift`)
- env0 Terraform provider (`env0/env0`)
- Terraform/OpenTofu HCL (`lifecycle { ignore_changes }`)
- Cron scheduling expressions

## Sources Consulted
- Spacelift provider source (resource_stack.go): https://github.com/spacelift-io/terraform-provider-spacelift/blob/master/spacelift/resource_stack.go
- Spacelift provider source (resource_drift_detection.go): https://github.com/spacelift-io/terraform-provider-spacelift/blob/master/spacelift/resource_drift_detection.go
- Spacelift Workflow Tool docs: https://docs.spacelift.io/vendors/terraform/workflow-tool
- env0 provider source (resource_drift_detection.go): https://github.com/env0/terraform-provider-env0/blob/main/env0/resource_drift_detection.go
- env0 provider registration (provider.go): https://github.com/env0/terraform-provider-env0/blob/main/env0/provider.go
- env0 drift detection docs: https://docs.env0.com/docs/drift-detection
- env0_environment_drift_detection registry page: https://registry.terraform.io/providers/env0/env0/latest/docs/resources/environment_drift_detection
- OpenTofu language reference for `lifecycle { ignore_changes }`

## Issues Found

1. **Spacelift `opentofu_version` argument does not exist.** The original post used `opentofu_version = "1.7.0"` in the `spacelift_stack` resource. Inspecting the provider source (`resource_stack.go`) shows the schema exposes `terraform_version` and `terraform_workflow_tool`; OpenTofu is selected by setting `terraform_workflow_tool = "OPEN_TOFU"`. Replaced the field with the two correct attributes.

2. **`drift_detection` is not a nested block on `spacelift_stack`.** The original post placed a `drift_detection { ... }` block inside the stack resource. The Spacelift provider implements drift detection as a separate top-level resource, `spacelift_drift_detection`, which takes `stack_id`, `reconcile`, `schedule`, and (optionally) `ignore_state` and `timezone`. Restructured the example to define `spacelift_drift_detection.production` referencing the stack's `id`.

3. **env0 drift detection is not configured via `env0.yml`.** The original post showed a `driftDetection:` block (with `enabled`, `cron`, `autoApproveApply`) inside an `env0.yml` file. Per env0's documentation and the provider source, drift detection is configured either through the environment Settings UI or through the `env0_environment_drift_detection` Terraform resource (fields: `environment_id`, `cron`, `auto_drift_remediation` with values `DISABLED`/`CODE_TO_CLOUD`/`CLOUD_TO_CODE`/`SMART_REMEDIATION`). Replaced the YAML example with the correct Terraform resource and noted that sub-daily intervals require an Enterprise plan and the scheduler is hourly.

## Review Notes

- The example cron `"0 */6 * * *"` for env0 is kept for illustrative parity with the original, but a comment now flags that sub-daily drift checks are an Enterprise-tier feature and that env0's scheduler runs once per hour (so the minute field is effectively ignored).
- The `spacelift_drift_detection` resource also supports `ignore_state` and `timezone`; not added to keep the example minimal and faithful to the author's original scope.
- The `lifecycle { ignore_changes }` example is correct: TACOS drift detection runs through standard `tofu plan`, so attributes listed in `ignore_changes` will be skipped during drift detection as well.
- The provider version constraint `version = "~> 1.0"` for `spacelift-io/spacelift` is reasonable; the provider has been on the 1.x line for a long time.
- Several en-dashes in prose are rendered as plain hyphens (e.g. "TACOS platforms-such as..."). This is a stylistic/typographic issue rather than a technical one and was left untouched per the review scope.
