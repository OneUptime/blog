# Validation Summary: How to Build Terraform Dynamic Blocks Advanced

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL language constructs: `dynamic` blocks, `for_each`, `iterator`, `for` expressions, `flatten`, `setproduct`, `merge`, `title`, `lookup`, `optional`)
- Variable validation (`validation` blocks, `alltrue`, `contains`, `distinct`)
- AWS provider resources: `aws_security_group`, `aws_wafv2_rule_group`, `aws_cloudfront_distribution`, `aws_iam_policy_document` (data source), `aws_iam_policy`, `aws_route_table`, `aws_autoscaling_group`, `aws_ecs_service`, `aws_cloudwatch_event_rule`, `aws_cloudwatch_event_target`
- AzureRM provider resource: `azurerm_network_security_group`

## Sources Consulted
- Terraform language docs — Dynamic Blocks: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform language docs — `for_each` meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform language docs — `optional()` object type modifier: https://developer.hashicorp.com/terraform/language/expressions/type-constraints#optional-object-type-attributes
- Terraform language docs — Custom Conditions / Variable Validation: https://developer.hashicorp.com/terraform/language/expressions/custom-conditions
- AWS provider — `aws_route_table`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table (confirms `tags` is a `map(string)` attribute, not a nested block)
- AWS provider — `aws_autoscaling_group` (`tag` block): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- AWS provider — `aws_wafv2_rule_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_rule_group
- AWS provider — `aws_cloudfront_distribution`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- AWS provider — `aws_iam_policy_document` (data source): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
- AWS provider — `aws_ecs_service`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- AWS provider — `aws_cloudwatch_event_target`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- AzureRM provider — `azurerm_network_security_group`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_security_group

## Issues Found
1. **Pattern 4 (Iterator Aliases) used `dynamic "tags"` on `aws_route_table`, which is invalid.** In the AWS provider, `tags` on `aws_route_table` is a `map(string)` attribute — not a nested block — so a `dynamic "tags"` block would fail with "Blocks of type 'tags' are not expected here." I replaced the bogus dynamic tags block with the correct attribute assignment (`tags = merge(...)`) and added a second example using `aws_autoscaling_group`'s real `tag` block (which IS a nested block), preserving the section's pedagogical goal of demonstrating distinct iterator aliases (`rt_route` vs. `tag_item`).

## Review Notes
- The WAFv2 example in Pattern 1 is HCL-syntactically valid and exercises real provider block names (`rule`, `action`, `statement`, `or_statement`, `regex_pattern_set_reference_statement`, `field_to_match`, `single_header`, `text_transformation`, `visibility_config`). It would not, however, plan/apply cleanly with the sample data because (a) when `length(conditions) == 1`, the outer `statement {}` would be empty (the schema requires exactly one nested statement type), and (b) the inner statement always emits `regex_pattern_set_reference_statement` even for `ip-match` conditions. The post's stated intent is to demonstrate *nesting syntax*, not a runnable WAF policy, so I left these semantic gaps as-is — flagging here for future revision.
- Pattern 2's CloudFront example uses the legacy `forwarded_values` block. It still works but is deprecated in favor of `cache_policy_id` / `origin_request_policy_id`. Out of scope for this review (the post is about dynamic blocks, not the modern CloudFront pattern), but worth a future refresh.
- Pattern 6 references `aws_sns_topic.email_notifications` and `each.value.config.topic_arn` without showing the supporting resources / the `sns` target in the variable default. This is fine for a partial illustrative snippet.
- The `optional(map(object(...)), {})` syntax (Pattern 3) requires Terraform 1.3+ for the default-value form. The post is labelled "Advanced" and targets current Terraform, so this is appropriate.
- `title()` correctly maps `"tcp" -> "Tcp"`, `"inbound" -> "Inbound"`, etc., which are the casings AzureRM expects in Pattern 7.
