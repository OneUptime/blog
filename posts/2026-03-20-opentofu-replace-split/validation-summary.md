# Validation Summary: How to Use replace() and split() in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (and Terraform-compatible HCL)
- HCL string functions: `replace()`, `split()`, `lower()`
- Regex syntax in `replace()` (forward-slash wrapped)
- HCL `for` expressions producing maps
- AWS provider resource: `aws_security_group_rule`

## Sources Consulted
- OpenTofu `replace` function documentation: https://opentofu.org/docs/language/functions/replace/
- OpenTofu `split` function documentation: https://opentofu.org/docs/language/functions/split/
- OpenTofu `lower` function documentation: https://opentofu.org/docs/language/functions/lower/
- OpenTofu `for` expression documentation: https://opentofu.org/docs/language/expressions/for/
- Terraform AWS provider `aws_security_group_rule` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- AWS ARN format documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_identifiers.html

## Issues Found
No technical issues found.

All code examples were verified for correctness:
- `replace()` examples (both literal substring and regex with `/.../` wrapping) match documented behavior.
- `split()` examples produce the documented list outputs.
- ARN parsing: splitting `"arn:aws:iam::123456789012:role/my-role"` on `:` yields 6 elements (including an empty string at index 3 from the `::` after `iam`), making index 4 the account ID `"123456789012"` and index 5 `"role/my-role"`. The subsequent `split("/", ...)[1]` correctly returns `"my-role"`.
- The `slug` and `bucket_name` examples both correctly produce `"my-awesome-project"`.
- The `for` expression building a map from `key=value` pairs is valid HCL and produces the documented result.
- The `aws_security_group_rule` example uses valid attributes (`type`, `from_port`, `to_port`, `protocol`, `cidr_blocks`, `security_group_id`).

## Review Notes
- The map result comment `{ env = "prod", team = "platform", cost-center = "123" }` shows a key with a hyphen. This is valid because string keys constructed via `for` expressions can contain any characters; only literal map-key syntax (without quotes) is restricted to identifiers. The display matches OpenTofu console output style.
- The post mixes `replace()` and `lower()` ordering between the `slug` and `bucket_name` examples — both happen to produce the same result for this input, which is correct, though readers should be aware that ordering can matter when the search/replace strings contain case-sensitive characters.
- No version-specific caveats; the functions and syntax shown are stable across all current OpenTofu versions.
