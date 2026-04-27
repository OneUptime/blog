# Validation Summary: How to Use the sort Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (sort function)
- HCL (HashiCorp Configuration Language)
- Terraform-compatible IaC syntax
- AWS IAM (used in for_each example)

## Sources Consulted
- Official OpenTofu `sort` function documentation: https://opentofu.org/docs/language/functions/sort/
- Official OpenTofu `format` function documentation (for padding example)
- OpenTofu console (`tofu console`) command reference

## Issues Found
No technical issues found.

All technical claims verified:
- `sort(list)` accepts a list of strings and returns a new list sorted lexicographically by Unicode codepoints — matches official docs.
- `sort(["banana", "apple", "cherry"])` → `["apple", "banana", "cherry"]` — correct.
- `sort(["1.10.0", "1.2.0", "1.9.0"])` → `["1.10.0", "1.2.0", "1.9.0"]` — correct lexicographic order (at position 2: `"1"` < `"2"` < `"9"`).
- `sort(["c", "a", "b"])` → `["a", "b", "c"]` — correct.
- `sort(["z10", "z2", "z1"])` → `["z1", "z10", "z2"]` — correct lexicographic (not numeric) order.
- The `["prod", "dev", "staging"]` → `["dev", "prod", "staging"]` example is correct.
- The `["myapp-logs", "myapp-data", "myapp-archive"]` first/last alphabetical example is correct (sorted: `["myapp-archive", "myapp-data", "myapp-logs"]`).
- `format("%04d", n)` for `[10, 2, 1, 100]` → `["0010", "0002", "0001", "0100"]`, sorted → `["0001", "0002", "0010", "0100"]` — correct.
- `tofu console` is a valid OpenTofu CLI subcommand for evaluating expressions interactively.
- `toset(sort(...))` and `for_each` usage is valid HCL.
- The IAM `assume_role_policy` JSON document (Version `2012-10-17`, `sts:AssumeRole`, `ec2.amazonaws.com` principal) is a correct AWS trust policy template.

## Review Notes
- Minor stylistic note (not corrected, since it is not technically incorrect): in `tofu console`, list-typed return values are commonly displayed wrapped as `tolist([...])`. The post simplifies this to just the bracket form, which is fine for didactic purposes.
- Using `toset(sort(...))` for `for_each` is functionally equivalent to `toset(...)` alone, since `for_each` over a set does not preserve order. The post correctly frames this as ensuring "consistent" ordering, which mainly affects display/logging of the keys rather than resource address determinism (resource addresses use the each.key strings themselves, which are already deterministic). This is a subtle nuance but the example is not technically wrong.
- The `sort` function only accepts lists of strings; passing a list of numbers or mixed types will error. The post focuses on strings throughout, which is appropriate.
