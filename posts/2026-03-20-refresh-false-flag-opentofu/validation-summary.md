# Validation Summary: How to Use the -refresh=false Flag in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu CLI
- Infrastructure as Code (IaC)
- `tofu plan`
- `tofu apply`
- `tofu test`
- OpenTofu state refresh and refresh-only planning

## Sources Consulted
- OpenTofu official documentation, `tofu plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu official documentation, `tofu apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu official documentation, `tofu test`: https://opentofu.org/docs/cli/commands/test/
- OpenTofu official documentation, `tofu show`: https://opentofu.org/docs/cli/commands/show/
- OpenTofu official documentation, environment variables: https://opentofu.org/docs/cli/config/environment-variables/

## Issues Found
1. The performance example used a shell-command snippet labeled as `hcl` and claimed `tofu plan -refresh=false` makes "no API calls." Updated the fence to `bash` and changed the wording to a documented-safe claim: skipping refresh can make the operation faster because it skips the refresh step, rather than asserting zero API calls in all cases.
2. The CI and refresh-check guidance overstated what `-refresh=false` proves. Updated the comments so they no longer imply it verifies that "nothing else was affected" or that it is universally "safe" after a refresh-only plan; the revised text now matches the narrower guarantee supported by the docs.
3. The `tofu test` section was inaccurate. `command = plan` does not disable refresh by itself; OpenTofu documents `plan_options { refresh = false }` for this behavior. Updated the test example accordingly.

## Review Notes
- `tofu apply -refresh=false` is valid when `tofu apply` is generating a plan automatically. When applying a previously saved plan file, additional planning options cannot be supplied at apply time.
- Plan files created with `-refresh=false` have caveats for machine-readable inspection with `tofu show -json`; the post does not discuss JSON plan inspection, so no content change was required.
- The timing numbers in the performance section are still examples rather than guaranteed benchmarks. Actual impact depends on provider behavior, number of managed objects, and whether other provider operations are involved.
