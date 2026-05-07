# Validation Summary: How to Automate Resource Tagging with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS provider
- HCL
- Bash
- `jq`

## Sources Consulted
- OpenTofu Checks documentation: https://opentofu.org/docs/language/checks/
- OpenTofu `timestamp` function documentation: https://opentofu.org/docs/language/functions/timestamp/
- OpenTofu `show` command documentation: https://opentofu.org/docs/v1.9/cli/commands/show/
- OpenTofu `state show` documentation: https://opentofu.org/docs/v1.9/cli/commands/state/show/
- OpenTofu state and JSON format documentation: https://opentofu.org/docs/language/state/ and https://opentofu.org/docs/internals/json-format/
- AWS provider resource tagging guide: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/resource-tagging
- AWS provider configuration documentation (`default_tags`): https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/index.html.markdown

## Issues Found
- The introduction and `default_tags` section implied provider-level defaults apply to all AWS resources. I updated that wording to match the AWS provider documentation: `default_tags` applies to resources that implement `tags`, with `aws_autoscaling_group` as a notable exception.
- The provider example used `Owner` while the rest of the post enforced `Team`. I aligned the provider example to `Team` so the required-tag examples are internally consistent.
- The tagging module used `CreatedAt = timestamp()`. I removed that tag because the official OpenTofu docs state that `timestamp()` changes every second and causes a diff on every run when used directly in resource attributes.
- The `check` block section described checks as post-apply enforcement and referenced resources that were not defined in the article. I corrected the wording to reflect non-blocking validation during plan and apply, and updated the example to use the defined `aws_db_instance.main` and `aws_s3_bucket.backups` resources.
- The compliance script parsed `tofu state show` output with `grep`. I replaced it with `tofu show -state -json | jq` because the official OpenTofu docs say `tofu state show` output is intended for human consumption and recommend `tofu show -json` for external tooling.

## Review Notes
- The updated compliance script requires `jq`.
- `check` blocks emit warnings rather than blocking `plan` or `apply`; if hard enforcement is required, preconditions or postconditions are a better fit.
- The S3 bucket name in the example is illustrative. Real AWS bucket names must still be globally unique.
