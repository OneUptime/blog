# Validation Summary: How to Use the keys and values Functions in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- OpenTofu (`keys`, `values`, `sum`, `distinct`, `flatten`, `contains`, `join`, `length`, `zipmap`)
- HCL (HashiCorp Configuration Language)
- Terraform-compatible syntax (lifecycle preconditions, `for_each`, `null_resource`)
- AWS provider (referenced in `aws_instance` example)

## Sources Consulted
- OpenTofu `keys` function documentation: https://opentofu.org/docs/language/functions/keys/
- OpenTofu `values` function documentation: https://opentofu.org/docs/language/functions/values/
- OpenTofu functions index: https://opentofu.org/docs/language/functions/

## Issues Found
- **Incorrect function name `zip`**: In the "Consistent Ordering" section, the post listed `zip` as one of the operations that can rely on consistent ordering. OpenTofu does not have a `zip` function. The closest equivalent is `zipmap`, which pairs two lists into a map. Replaced `zip` with `zipmap` to reflect an actual OpenTofu built-in function that benefits from the `keys`/`values` ordering invariant.

## Review Notes
- All code examples are syntactically valid HCL and use current OpenTofu/Terraform APIs.
- The basic example output is correct: for `{api=8080, worker=9090, metrics=9100}`, `keys` returns `["api", "metrics", "worker"]` (lexicographical) and `values` returns `[8080, 9100, 9090]` (sorted by key).
- The sum example arithmetic checks out: 450 + 200 + 120 + 85 = 855.
- Lifecycle precondition usage on `null_resource` is valid (preconditions have been supported since Terraform 1.2 / since OpenTofu's initial release).
- The `tofu console` interactive example output is accurate.
- The claim that `keys` and `values` maintain corresponding indexes (i.e., `keys(m)[i]` and `values(m)[i]` refer to the same map entry) matches the official documentation, which states both are returned in lexicographical order by key.
