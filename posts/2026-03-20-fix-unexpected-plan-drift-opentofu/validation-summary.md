# Validation Summary: How to Fix Unexpected Plan Changes (Drift) in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu lifecycle meta-arguments
- OpenTofu provider version constraints
- AWS provider configuration for OpenTofu/Terraform
- AWS CloudTrail CLI lookups

## Sources Consulted
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command docs: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu `refresh` command docs: https://opentofu.org/docs/cli/commands/refresh/
- OpenTofu `lifecycle` docs: https://opentofu.org/docs/language/meta-arguments/lifecycle/
- OpenTofu environment variables / `TF_LOG`: https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu settings (`terraform` block): https://opentofu.org/docs/language/settings/
- AWS CloudTrail CLI lookup docs: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events-cli.html
- AWS CLI `lookup-events` reference: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/lookup-events.html
- Terraform Registry AWS provider docs and upgrade guidance: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The description and introduction described unexpected plan changes as drift or normalization only, but the post also used a changing AMI lookup as an example. I corrected this to include data source result changes and provider version behavior, because a changing "latest" lookup is not drift in managed resource state.
- The "Computed attribute change" example used an updated AMI ID, which is not a computed attribute on `aws_instance`. I changed that item to "Data source result change" with a newer "latest" AMI lookup example, which matches OpenTofu's documented `ignore_changes` use case for values that may change after creation.
- The comment above `tofu refresh` said it refreshes state "without applying." I corrected it to say that it updates state immediately without a review step, because OpenTofu documents `tofu refresh` as a deprecated alias for `tofu apply -refresh-only -auto-approve`.
- The provider version snippet was fenced as `bash` even though it is HCL configuration. I changed the code fence to `hcl`.

## Review Notes
- `tofu refresh` still exists, but OpenTofu marks it as deprecated because it updates state without letting you review the detected changes first.
- The `TF_LOG=DEBUG tofu plan ... | grep ...` example is syntactically valid, but it is an ad hoc debugging pattern rather than an official drift-detection workflow.
