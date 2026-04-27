# Validation Summary: How to Use the reverse Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu
- HCL (HashiCorp Configuration Language)
- Terraform (compatible function set)

## Sources Consulted
- OpenTofu official documentation for the `reverse` function: https://opentofu.org/docs/language/functions/reverse/
- OpenTofu CLI documentation for `tofu console`: https://opentofu.org/docs/cli/commands/console/
- OpenTofu `sort` function documentation: https://opentofu.org/docs/language/functions/sort/

## Issues Found
No technical issues found.

All examples were verified:
- `reverse(["a", "b", "c"])` correctly returns `["c", "b", "a"]`.
- `reverse(["a", "b", "c"])[0]` correctly returns `"c"`.
- `sort(["1.0.0", "1.1.0", "1.2.0", "2.0.0"])` returns the list lexicographically sorted (already in order); `reverse(...)[0]` correctly returns `"2.0.0"`.
- `reverse(["eu-west-1", "us-west-2", "us-east-1"])[0]` correctly returns `"us-east-1"`.
- `reverse(["deploy", "test", "build"])` correctly returns `["build", "test", "deploy"]`.
- `reverse([1, 2, 3, 4])` correctly returns `[4, 3, 2, 1]`.
- The `tofu console` command is the correct interactive REPL for OpenTofu.
- The function syntax `reverse(list)` matches the official signature.

## Review Notes
- The `sort` function performs lexicographical sorting on strings, which works correctly for the version strings in the example because they happen to sort in the desired order alphabetically. For semantic version sorting in general (e.g., comparing `"1.10.0"` vs `"1.2.0"`), lexicographical sort would not produce semantically correct results — but this caveat is outside the scope of a post focused on `reverse`.
- The post is concise and accurate. No deprecation concerns; `reverse` is a stable, standard list function in OpenTofu.
