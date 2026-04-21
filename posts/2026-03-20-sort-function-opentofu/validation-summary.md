# Validation Summary: How to Use the sort Function in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- OpenTofu collection functions (`sort`, `reverse`, `keys`, `tolist`, `toset`)
- OpenTofu `for` expressions
- AWS provider security group and load balancer resources

## Sources Consulted
- OpenTofu official documentation: `sort` function — https://opentofu.org/docs/language/functions/sort/
- OpenTofu official documentation: `reverse` function — https://opentofu.org/docs/language/functions/reverse/
- OpenTofu official documentation: `keys` function — https://opentofu.org/docs/language/functions/keys/
- OpenTofu official documentation: `tolist` function — https://opentofu.org/docs/language/functions/tolist/
- OpenTofu official documentation: `toset` function — https://opentofu.org/docs/language/functions/toset/
- OpenTofu official documentation: `for` expressions and element ordering — https://opentofu.org/docs/language/expressions/for/
- HashiCorp AWS provider documentation source: `aws_vpc_security_group_ingress_rule` — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/vpc_security_group_ingress_rule.html.markdown
- HashiCorp AWS provider documentation source: `aws_security_group_rule` — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/security_group_rule.html.markdown
- HashiCorp AWS provider documentation source: `aws_lb` — https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lb.html.markdown

## Issues Found
1. **Sort ordering was described as alphabetical/dictionary order:** OpenTofu documents `sort()` as lexicographic sorting by Unicode code point, which is more precise than alphabetical or dictionary order. Updated the description, introduction, and mixed-case comment to use Unicode code point terminology.
2. **Security group rule example used an older resource pattern:** The current AWS provider documentation recommends `aws_vpc_security_group_ingress_rule` for ingress rules and says to avoid `aws_security_group_rule`. Updated the example to use `aws_vpc_security_group_ingress_rule` with `cidr_ipv4` and `ip_protocol`.
3. **Version example could imply semantic version sorting:** `sort()` sorts strings lexicographically, not by semantic version rules. Added a comment clarifying that the `latest` example is only lexicographic for the sample input.
4. **Set sorting statement was too broad:** `sort(tolist(my_set))` is appropriate for sets of strings, because `sort()` accepts strings. Updated the text to specify sets of strings.
5. **Summary suggested unsupported custom comparator behavior:** OpenTofu does not provide a custom comparator for `sort()`, and converting numbers to strings produces lexicographic string order rather than numeric order. Replaced that guidance with an accurate limitation statement.

## Review Notes
- `keys(var.tags)` already returns keys in lexicographical order according to the OpenTofu documentation, so `sort(keys(var.tags))` is redundant but still technically correct.
- Sorting IP addresses, version labels, and numeric-looking strings is lexicographic, not numeric or semantic. The examples are valid for the specific sample values shown.
