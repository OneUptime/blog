# Validation Summary: How to Use the split and join Functions in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (HCL language built-in functions)
- Terraform (compatible syntax)
- AWS provider (`aws_security_group_rule`, `aws_autoscaling_group`)

## Sources Consulted
- OpenTofu `split` function documentation: https://opentofu.org/docs/language/functions/split/
- OpenTofu `join` function documentation: https://opentofu.org/docs/language/functions/join/
- OpenTofu `slice` function documentation: https://opentofu.org/docs/language/functions/slice/
- OpenTofu `sort` function documentation: https://opentofu.org/docs/language/functions/sort/
- OpenTofu `tofu console` command documentation: https://opentofu.org/docs/cli/commands/console/
- AWS provider `aws_autoscaling_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- AWS provider `aws_security_group_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule

## Issues Found
1. **Typo in "Joining Tags into a Display String" example**: The local was defined as `tag_string` but the output referenced `local.tag_summary`, which would cause a "Reference to undeclared local value" error during plan/apply. Changed `value = local.tag_summary` to `value = local.tag_string` so the output references the actual local that is declared.

2. **Conflicting attributes in autoscaling group example**: The `aws_autoscaling_group` resource had both a top-level `launch_template` block and a `mixed_instances_policy` block. These are mutually exclusive in the AWS provider — using both produces an error ("only one of `launch_configuration`, `launch_template`, or `mixed_instances_policy` can be set"). Removed the top-level `launch_template` block, since the launch template is already specified inside `mixed_instances_policy.launch_template.launch_template_specification`.

## Review Notes
- Function signatures (`split(separator, string)` and `join(separator, list)`), return types, and example outputs are all consistent with OpenTofu/Terraform documentation.
- The `slice(list, startindex, endindex)` usage in the DNS parsing example is correct: startindex inclusive, endindex exclusive.
- The `tofu console` output shown in the post is simplified — in practice, OpenTofu's console may render list returns from `split` as `tolist([...])`. The simplified form is acceptable for illustrative purposes and matches the conceptual return type.
- The round-trip consistency claim (`join(sep, split(sep, s)) == s`) is correct provided the separator does not overlap with itself in unusual ways; for the simple delimiters shown (`,`), this holds.
