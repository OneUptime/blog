# Validation Summary: How to Use the -exclude Flag in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- Infrastructure as Code (IaC)
- Resource targeting and resource addressing in OpenTofu
- AWS provider resource naming examples

## Sources Consulted
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command documentation: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu resource addressing documentation: https://opentofu.org/docs/cli/state/resource-addressing/
- OpenTofu 1.9 release notes / what's new: https://opentofu.org/docs/v1.9/intro/whats-new/
- Official AWS provider documentation for `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance

## Issues Found
- The post described `-exclude` as the inverse of `-target`. I changed this to a negative-targeting counterpart and clarified that `-exclude` also omits anything that depends on excluded resources or modules, which matches the OpenTofu docs.
- One command used `aws_rds_instance.database`, which is not the standard AWS provider resource type. I corrected it to `aws_db_instance.database` based on the official AWS provider docs.
- The post said `-target` and `-exclude` can be combined. I corrected this because OpenTofu documents positive targeting and negative targeting as mutually exclusive in a single command.
- The comparison table and full-plan follow-up note were too absolute. I updated them to reflect documented targeting behavior and to avoid implying that only the directly excluded resources can appear in a later full plan.

## Review Notes
- The post is accurate for OpenTofu 1.9+ after correction. `-exclude-file` and `-target-file` were added later, in OpenTofu 1.10, so it is appropriate that this post does not present them as part of the 1.9 feature set.
