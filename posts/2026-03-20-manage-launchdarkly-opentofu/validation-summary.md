# Validation Summary: How to Manage LaunchDarkly Feature Flags with OpenTofu - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HashiCorp Configuration Language (HCL)
- LaunchDarkly Terraform/OpenTofu provider
- LaunchDarkly feature flags

## Sources Consulted
- LaunchDarkly Terraform provider docs: https://github.com/launchdarkly/terraform-provider-launchdarkly/blob/main/docs/index.md
- `launchdarkly_project` resource docs: https://github.com/launchdarkly/terraform-provider-launchdarkly/blob/main/docs/resources/project.md
- `launchdarkly_feature_flag` resource docs: https://github.com/launchdarkly/terraform-provider-launchdarkly/blob/main/docs/resources/feature_flag.md
- `launchdarkly_feature_flag_environment` resource docs: https://github.com/launchdarkly/terraform-provider-launchdarkly/blob/main/docs/resources/feature_flag_environment.md
- LaunchDarkly Terraform integration overview: https://launchdarkly.com/docs/integrations/terraform
- LaunchDarkly guide on managing flags with Terraform: https://launchdarkly.com/docs/guides/infrastructure/terraform
- LaunchDarkly docs on flag variations and defaults: https://launchdarkly.com/docs/fed-docs/home/flags/variations
- LaunchDarkly docs on flag types: https://launchdarkly.com/docs/home/flags/types

## Issues Found
- The production rollout example used unsupported nested `rollout` blocks with `variation_id` and `weight` inside `fallthrough`. The current provider schema expects `fallthrough { rollout_weights = [...] }`, with weights ordered by variation index. I updated the example to `rollout_weights = [20000, 80000]`.
- The boolean flag example included a `lifecycle` block with `prevent_destroy = false` and a comment implying it would prevent variation changes. That setting is the default and does not enforce the stated behavior, so I removed the inaccurate block.

## Review Notes
- No additional technical issues found after those corrections.
- The provider documentation still uses `version = "~> 2.0"` in example configuration. As of April 29, 2026, the latest 2.x provider release is 2.27.0, so the version constraint shown in the post remains valid for current 2.x releases.
- LaunchDarkly’s provider documentation cautions against managing environment-specific flag settings with Terraform when the flag is attached to experiments, because applies can overwrite experiment-driven changes. The post does not discuss experimentation, so no content change was required.
