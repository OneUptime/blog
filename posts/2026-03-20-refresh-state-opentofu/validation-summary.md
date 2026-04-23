# Validation Summary: How to Refresh State to Match Real Infrastructure in OpenTofu (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- Infrastructure as Code (IaC)
- OpenTofu state management
- Drift detection and refresh workflows

## Sources Consulted
- OpenTofu docs, `tofu refresh`: https://opentofu.org/docs/cli/commands/refresh/
- OpenTofu docs, `tofu plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu docs, `tofu apply`: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu docs, Resource Addressing: https://opentofu.org/docs/cli/state/resource-addressing/
- OpenTofu docs, JSON Output Format: https://opentofu.org/docs/internals/json-format/

## Issues Found
- The post described `tofu refresh` as "legacy" and said it "may be deprecated in future versions." I changed this to state that `tofu refresh` is already deprecated, matching the official OpenTofu documentation.
- The post did not explain that `tofu refresh` is effectively an alias for `tofu apply -refresh-only -auto-approve`. I added that detail because it explains why the command updates state immediately without a confirmation step.
- The sample `tofu plan -refresh-only` output showed `aws_instance.web (read during apply)`. I corrected the example because OpenTofu reserves "read during apply" for data resources, not managed resources like `aws_instance`.
- The `-target` section lacked the official caveat that targeting is intended for exceptional circumstances. I added a brief warning so the post does not imply targeted refreshes are routine best practice.
- The conclusion suggested adding a refresh step before critical plans in pipelines. I changed that wording to reflect the documented behavior that `plan` and `apply` already refresh by default unless `-refresh=false` is used.

## Review Notes
- `tofu refresh` is still present in the current OpenTofu documentation as of April 23, 2026, but it is explicitly deprecated and not the recommended workflow.
- `tofu apply -refresh-only` and `tofu plan -refresh-only` update OpenTofu state and root module output values to match remote changes.
- Example CLI output can vary somewhat by provider and resource type, so illustrative output should avoid phrases that have specific meanings in OpenTofu, such as "read during apply."
