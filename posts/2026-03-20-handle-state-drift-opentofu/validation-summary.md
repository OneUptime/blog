# Validation Summary: How to Handle State Drift in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Infrastructure as Code
- HCL configuration
- OpenTofu CLI
- AWS resource examples

## Sources Consulted
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command docs: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu `refresh` command docs: https://opentofu.org/docs/cli/commands/refresh/
- OpenTofu `show` command docs: https://opentofu.org/docs/cli/commands/show/
- OpenTofu `import` docs: https://opentofu.org/docs/cli/import/
- OpenTofu state management docs: https://opentofu.org/docs/cli/state/
- OpenTofu `check` block docs: https://opentofu.org/docs/language/checks/
- OpenTofu custom conditions docs: https://opentofu.org/docs/language/expressions/custom-conditions/

## Issues Found
- The post recommended `tofu refresh` as a normal reconciliation step. OpenTofu currently documents `tofu refresh` as deprecated and recommends `tofu apply -refresh-only` so changes can be reviewed before state is updated. I replaced the Step 2 guidance and updated the conclusion accordingly.
- The drift-detection examples used normal `tofu plan` and `tofu plan -refresh=true`. In normal mode, a non-empty plan can include configuration changes as well as drift, so that is not a drift-only signal. I changed Step 1, Step 3, and the CI example to use `tofu plan -refresh-only` so the examples specifically target out-of-band infrastructure changes.
- The `-detailed-exitcode` comments equated exit code `2` with drift while using normal planning mode. OpenTofu documents exit code `2` as any non-empty diff. I updated the comments so they match refresh-only planning behavior and no longer overstate what the exit code means.

## Review Notes
- The `check` block example is syntactically valid as a non-blocking assertion, but the primary built-in workflows for drift detection and reconciliation are the refresh-only `plan` and `apply` flows documented by OpenTofu.
