# Validation Summary: How to Create AWS WAFv2 Rule Groups with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS WAFv2 (`aws_wafv2_rule_group`, `aws_wafv2_web_acl`)
- AWS WAF rule statements: `byte_match_statement`, `sqli_match_statement`, `xss_match_statement`, `size_constraint_statement`, `not_statement`, `rule_group_reference_statement`
- CloudWatch metrics / sampled requests (visibility config)

## Sources Consulted
- AWS WAFv2 API Reference – ByteMatchStatement: https://docs.aws.amazon.com/waf/latest/APIReference/API_ByteMatchStatement.html
- Terraform AWS Provider docs – aws_wafv2_rule_group: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_rule_group
- Terraform AWS Provider docs – aws_wafv2_web_acl: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/wafv2_web_acl
- AWS WAF Developer Guide – Rule statements / Size constraint / SQL injection / XSS

## Issues Found
1. **Invalid `positional_constraint = "EXISTS"` in `byte_match_statement`** — The original `RequireAPIKey` rule used `positional_constraint = "EXISTS"` with `search_string = ""` to detect a missing header. Per the AWS WAFv2 API reference, valid `PositionalConstraint` values are limited to `EXACTLY | STARTS_WITH | ENDS_WITH | CONTAINS | CONTAINS_WORD`; `EXISTS` is not valid and `search_string` must be non-empty. Replaced the inner statement with a `size_constraint_statement` (`comparison_operator = "GE"`, `size = 1`) wrapped by the existing `not_statement`, which is the canonical pattern for "header is missing or empty" detection in WAFv2.

2. **Section title mismatch** — The third example was titled "Header Size Restriction Rule" but the rule actually constrains request body size (10 KB cap on `body`). Renamed the section to "Body Size Restriction Rule" to match the rule contents.

## Review Notes
- Other rule statements (`sqli_match_statement`, `xss_match_statement`, `size_constraint_statement`, `rule_group_reference_statement`) and their nested arguments (`field_to_match`, `text_transformation`, `oversize_handling`) are all valid per the AWS provider schema.
- `oversize_handling` values used (`CONTINUE`, `MATCH`) are valid for `body` field-to-match.
- `comparison_operator = "GT"` is valid for `size_constraint_statement`.
- `override_action { none {} }` correctly preserves the rule group's own actions when referenced from a Web ACL.
- `visibility_config` is required at both the rule_group/web_acl level and per-rule, and the post handles both correctly.
- WCU `capacity` values (100, 50) are illustrative; real-world values should be validated with `aws wafv2 check-capacity` since AWS calculates capacity based on the rules' complexity.
