# Validation Summary: How to Refactor from count to for_each in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- OpenTofu `count` meta-argument
- OpenTofu `for_each` meta-argument
- OpenTofu `moved` blocks
- OpenTofu module refactoring
- AWS provider resources `aws_subnet` and `aws_route_table_association`

## Sources Consulted
- OpenTofu refactoring docs: https://opentofu.org/docs/language/modules/develop/refactoring/
- OpenTofu `count` meta-argument docs: https://opentofu.org/docs/language/meta-arguments/count/
- OpenTofu `for_each` meta-argument docs: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu resource addressing docs: https://opentofu.org/docs/cli/state/resource-addressing/
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command docs: https://opentofu.org/docs/v1.11/cli/commands/apply/
- HashiCorp AWS provider `aws_subnet` docs source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/subnet.html.markdown
- HashiCorp AWS provider `aws_route_table_association` docs source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route_table_association.html.markdown

## Issues Found
- The original `count` example hardcoded `count = 3` while explaining what happens when an item is removed from the indexed CIDR list. As written, removing an item from the list without also changing `count` would make the example invalid. I changed the example to derive `count` from `length(local.public_cidrs)` and index into `local.public_cidrs`, which matches OpenTofu's documented `count` pattern and makes the refactoring explanation technically correct.

## Review Notes
- The `moved` block examples for both resources and modules are consistent with OpenTofu's refactoring documentation, including moves from numeric `count` indexes to string `for_each` keys.
- The `for_each = aws_subnet.public` chaining pattern used for `aws_route_table_association` is supported by OpenTofu's `for_each` documentation for one-to-one resource relationships.
- The review environment did not have the `tofu` CLI installed, so command verification was done against official OpenTofu documentation rather than local `--help` output.
