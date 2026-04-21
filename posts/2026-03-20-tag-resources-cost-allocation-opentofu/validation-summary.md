# Validation Summary: How to Tag Resources for Cost Allocation with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider for Terraform/OpenTofu
- AWS resource tags and provider default tags
- AWS Config managed rules
- AWS Cost Allocation Tags
- AWS Billing and Cost Management

## Sources Consulted
- OpenTofu input variables and validation blocks: https://opentofu.org/docs/language/values/variables/
- OpenTofu `merge` function: https://opentofu.org/docs/language/functions/merge/
- OpenTofu `timestamp` function: https://opentofu.org/docs/language/functions/timestamp/
- AWS provider `default_tags` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs#default_tags-configuration-block
- AWS provider `aws_config_config_rule` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/config_config_rule.html.markdown
- AWS provider `aws_ce_cost_allocation_tag` documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ce_cost_allocation_tag.html.markdown
- AWS Config `REQUIRED_TAGS` managed rule: https://docs.aws.amazon.com/config/latest/developerguide/required-tags.html
- AWS Billing user-defined cost allocation tag activation: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activating-tags.html

## Issues Found
- The post said provider `default_tags` are applied to every AWS resource. The AWS provider applies default tags to resources that implement `tags`, with documented exceptions such as `aws_autoscaling_group`, so the wording and diagram were narrowed to taggable AWS resources that support provider default tags.
- The module example used `merge(local.required_tags, var.tags)`, which allowed caller-supplied tags to override required `Team` and `Project` values because later `merge` arguments take precedence. Changed it to `merge(var.tags, local.required_tags)` so required tags win.
- The AWS Config wording said it enforced tagging. AWS Config's `REQUIRED_TAGS` rule detects non-compliance but does not prevent creation of resources with incorrect tags, so the wording now says it monitors required tags and tagging compliance.
- The standard tag schema used `formatdate("YYYY-MM-DD", timestamp())` for `CreatedAt`, which would cause drift if used directly in resource tags. Replaced it with a stable `var.created_at` value set once on creation.
- The best practice said to activate cost allocation tags in AWS Cost Explorer. AWS documents activation through AWS Billing and Cost Management or the `UpdateCostAllocationTagsStatus` API, so the wording now names AWS Billing and Cost Management.

## Review Notes
The AWS Config rule snippet uses valid `REQUIRED_TAGS` parameters and supported resource types. The `aws_ce_cost_allocation_tag` resources use valid `tag_key` and `status = "Active"` arguments. AWS notes that new user-defined tag keys can take up to 24 hours to appear for activation and up to 24 hours to activate. I could not run `tofu validate` locally because neither `tofu` nor `terraform` is installed in this environment.
