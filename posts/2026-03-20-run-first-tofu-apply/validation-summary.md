# Validation Summary: How to Run Your First tofu apply

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu CLI
- OpenTofu configuration language
- OpenTofu plan and apply workflow
- OpenTofu state and output commands
- HashiCorp Random provider
- HashiCorp Local provider

## Sources Consulted
- OpenTofu `tofu apply` command documentation: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu `tofu plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `tofu show` command documentation: https://opentofu.org/docs/cli/commands/show/
- OpenTofu `tofu output` command documentation: https://opentofu.org/docs/cli/commands/output/
- OpenTofu `tofu state show` command documentation: https://opentofu.org/docs/cli/commands/state/show/
- OpenTofu provider requirements documentation: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu settings documentation: https://opentofu.org/docs/language/settings/
- OpenTofu strings and templates documentation: https://opentofu.org/docs/language/expressions/strings/
- OpenTofu named values and `path.module` documentation: https://opentofu.org/docs/language/expressions/references/
- OpenTofu Registry Random provider `random_id` resource documentation: https://api.opentofu.org/registry/docs/providers/hashicorp/random/v3.8.1/resources/id.md
- OpenTofu Registry Local provider `local_file` resource documentation: https://api.opentofu.org/registry/docs/providers/hashicorp/local/v2.8.0/resources/file.md

## Issues Found
- The saved-plan review command used the legacy filename form `tofu show my-plan.tfplan`. Updated it to the current explicit target-selection form `tofu show -plan=my-plan.tfplan`, which the OpenTofu docs recommend for inspecting saved plan files.
- The `-target` comment said it applies only specific resources. Updated it to say it targets a resource and its dependencies, matching OpenTofu's documented behavior for `-target=ADDRESS`.
- The sample apply output showed the `random_id` resource ID as hexadecimal. Updated the resource completion ID to a base64-url-style value while leaving the `project_id` output as the hexadecimal `random_id.project_suffix.hex` value.

## Review Notes
OpenTofu was not installed in the local environment, so validation was performed against official OpenTofu documentation and OpenTofu Registry provider documentation rather than local `tofu --help` output. The tutorial's command sequence, provider requirements, resource arguments, outputs, and CI/CD saved-plan workflow are otherwise technically accurate.
