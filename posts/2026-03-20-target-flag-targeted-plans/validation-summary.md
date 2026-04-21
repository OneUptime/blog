# Validation Summary: How to Use the -target Flag for Targeted Plans in OpenTofu - Targeted Plans

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- OpenTofu CLI (`tofu plan`, `tofu apply`)
- Resource targeting with `-target`
- OpenTofu resource address syntax
- Infrastructure as Code workflows

## Sources Consulted
- OpenTofu `tofu plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `tofu apply` command documentation: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu resource addressing documentation: https://opentofu.org/docs/cli/state/resource-addressing/
- OpenTofu `depends_on` meta-argument documentation: https://opentofu.org/docs/language/meta-arguments/depends_on/
- OpenTofu resource behavior and lifecycle customization documentation: https://opentofu.org/docs/language/resources/behavior/
- OpenTofu source test coverage for targeting warnings: https://github.com/opentofu/opentofu/blob/main/internal/command/test_test.go

## Issues Found
- The post said `-target` bypasses OpenTofu's full dependency graph evaluation. Current OpenTofu documentation says `-target` focuses planning on matching resources and the objects those resources depend on, so I changed the wording to describe targeting as a narrowed plan that includes dependencies but can omit other requested changes.
- The caution list said dependent resources could be out of sync and repeated that targeting bypasses proper dependency graph evaluation. I revised this to say non-targeted resources or outputs can remain out of sync, configuration changes may remain unapplied, and the narrowed plan can miss other required changes.
- The warning excerpt did not reflect the current warning's main technical point. I updated it to emphasize that a targeted plan may not represent all changes requested by the current configuration.
- The targeting syntax section showed individual `count` and `for_each` instance addresses without the current OpenTofu caveat. I added a note that current OpenTofu documentation warns not to rely on individual resource instance addresses with `-target` and recommends whole-resource addresses.
- The alternatives section suggested only `depends_on` for dependency issues. Current OpenTofu documentation recommends expression references when possible and `depends_on` for hidden dependencies, so I changed the item to "Use references or `depends_on`."

## Review Notes
The command examples use valid `tofu plan` and automatic-plan-mode `tofu apply` syntax for the current OpenTofu CLI. The local `tofu` binary is not installed in this environment, so validation was performed against current official documentation and OpenTofu source rather than by executing the commands.
