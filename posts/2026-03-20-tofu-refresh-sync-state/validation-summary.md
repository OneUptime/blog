# Validation Summary: How to Use tofu refresh to Sync State - Tofu Sync State

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Infrastructure as Code
- Terraform-compatible CLI workflows
- State management and drift detection
- Bash and jq

## Sources Consulted
- OpenTofu Command: refresh: https://opentofu.org/docs/cli/commands/refresh/
- OpenTofu Command: plan: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu Command: apply: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu Command: show: https://opentofu.org/docs/cli/commands/show/
- OpenTofu Machine-Readable UI: https://opentofu.org/docs/internals/machine-readable-ui/
- OpenTofu JSON Output Format: https://opentofu.org/docs/internals/json-format/
- OpenTofu Purpose of State: https://opentofu.org/docs/language/state/purpose/

## Issues Found
- The post described `tofu refresh` as legacy. OpenTofu documentation marks it as deprecated, so the heading and note were updated to use "Deprecated".
- The introduction said refresh updates only the state file. OpenTofu refresh-only mode can also update root module output values, so the introduction was corrected.
- The manual console-change example implied that `tofu apply -refresh-only` permanently accepts drift by itself. Refresh-only updates state but does not update configuration, so the example now explains that configuration must also match the new value, or the attribute must be intentionally ignored, before a normal plan will show no drift.
- The auto-scaling example implied refresh-only prevents later plans from changing the value back. It now notes that a later normal plan may still propose changes unless configuration or `ignore_changes` matches the observed value.
- The CI/CD example parsed `tofu plan -json` as if it were a single JSON plan document with `.resource_drift`. Official docs define `tofu plan -json` as a stream of JSON UI messages. The example now saves a plan with `-out`, converts it with `tofu show -json -plan=...`, and uses `jq` against the documented plan JSON structure.
- The conclusion said `-detailed-exitcode` detects drift. It was adjusted to say it detects refresh-only changes, because exit code 2 means a non-empty diff, which can include refresh-only changes beyond resource drift.

## Review Notes
- The `tofu` binary was not installed in the local environment, so CLI behavior was verified against official OpenTofu documentation rather than local `--help` output.
- The `-target` examples are valid, but OpenTofu documentation warns that targeting should be reserved for exceptional situations because routine use can hide unrelated drift.
- CI workflows that store saved plan files or `tofu show -json` output should protect those artifacts because plan JSON can include sensitive values.
