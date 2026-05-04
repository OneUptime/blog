# Validation Summary: How to Use the contains Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Function reference

## Technologies Covered
- OpenTofu (and by extension, Terraform-compatible HCL)
- HCL (HashiCorp Configuration Language)
- AWS provider resources (`aws_cloudwatch_metric_alarm`, `aws_backup_plan`, `aws_security_group`) used as illustrative examples
- Built-in functions: `contains`, `index`

## Sources Consulted
- OpenTofu language docs — `contains` function: https://opentofu.org/docs/language/functions/contains/
- OpenTofu language docs — `index` function: https://opentofu.org/docs/language/functions/index_function/
- OpenTofu input variables / custom validation: https://opentofu.org/docs/language/values/variables/#custom-validation-rules
- OpenTofu `for` expressions (filtering with `if`): https://opentofu.org/docs/language/expressions/for/
- OpenTofu `count` meta-argument: https://opentofu.org/docs/language/meta-arguments/count/

## Issues Found
No technical issues found.

- Function signature `contains(list, value)` and the boolean return semantics are correct.
- Basic examples with string and number lists are valid and behave as commented (`true`/`false`).
- Validation block usage (`condition = contains([...], var.x)`) is the canonical pattern in OpenTofu/Terraform docs.
- `count = contains(...) ? 1 : 0` for conditional resource creation is a standard, correct idiom.
- `for instance in var.all_instances : instance if contains(instance.tags, "production")` is valid `for` expression filter syntax.
- The `contains` vs `index` comparison is accurate: `index(list, value)` returns the zero-based position and raises an error when the value is not found, while `contains` returns a boolean — so guarding `index` with `contains` is the documented safe pattern.

## Review Notes
- The post does not pin an OpenTofu version; the `contains` function has been stable since the Terraform 0.12 era and is unchanged in current OpenTofu releases (1.x), so omitting a version is fine.
- A subtle gotcha worth noting in a future revision: `contains` requires the value's type to be comparable to the list element type — for example, `contains([1, 2, 3], "1")` will error rather than return `false`. Not incorrect in the post, but a common pitfall readers hit.
- The `aws_backup_plan` example is truncated (`# ...`) and omits the required `rule` block; this is clearly intentional shorthand for illustrating the `count` pattern, not a technical error.
