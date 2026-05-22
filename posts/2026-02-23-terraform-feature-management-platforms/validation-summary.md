# Validation Summary: How to Use Terraform with Feature Management Platforms

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- LaunchDarkly Terraform provider
- Harness FME / Split Terraform provider
- AWS ECS Terraform resource
- GitHub Actions
- Feature flags and progressive rollouts

## Sources Consulted
- LaunchDarkly Terraform integration documentation: https://launchdarkly.com/docs/integrations/terraform
- LaunchDarkly "Managing flags with Terraform" guide: https://launchdarkly.com/docs/guides/infrastructure/terraform
- LaunchDarkly Terraform provider `launchdarkly_project` resource docs: https://github.com/launchdarkly/terraform-provider-launchdarkly/blob/main/docs/resources/project.md
- LaunchDarkly Terraform provider `launchdarkly_feature_flag` resource docs: https://github.com/launchdarkly/terraform-provider-launchdarkly/blob/main/docs/resources/feature_flag.md
- LaunchDarkly Terraform provider `launchdarkly_feature_flag_environment` resource docs: https://github.com/launchdarkly/terraform-provider-launchdarkly/blob/main/docs/resources/feature_flag_environment.md
- LaunchDarkly Terraform provider `launchdarkly_segment` resource docs: https://github.com/launchdarkly/terraform-provider-launchdarkly/blob/main/docs/resources/segment.md
- Harness FME Terraform provider documentation: https://developer.harness.io/docs/feature-management-experimentation/integrations/terraform/
- Split Terraform provider documentation and source: https://github.com/davidji99/terraform-provider-split
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- HashiCorp setup-terraform GitHub Action: https://github.com/hashicorp/setup-terraform

## Issues Found
- The `launchdarkly_feature_flag_environment` examples omitted the required `off_variation` argument. Added `off_variation = 1` to each boolean flag environment example so the resources match the provider schema.
- The Split provider example used `traffic_type = "user"` on `split_split`, but the provider requires `traffic_type_id`. Updated the snippet to use `var.split_traffic_type_id`.
- The Split definition example used `environment = "production"` and `traffic_type`, but `split_split_definition` requires `environment_id` and does not take `traffic_type`. Updated the snippet to use `var.split_environment_id` and removed the unsupported argument.
- The Split definition treatments omitted the required `configurations` JSON string. Added empty JSON configuration strings for both treatments.
- The GitHub Actions rollout workflow used an unset shell variable in `-target` and did not run `terraform init` before `terraform apply`. Updated the workflow to initialize Terraform and use GitHub Actions input expressions for the target resource and environment variable.

## Review Notes
- LaunchDarkly's own guidance cautions that managing environment-specific flag settings with Terraform can conflict with UI changes or experiments. The post's examples are technically valid, but teams should decide which resources Terraform owns and avoid mixed ownership.
- The Split provider is a third-party/community provider tested by Harness FME, not owned or maintained by Harness.
