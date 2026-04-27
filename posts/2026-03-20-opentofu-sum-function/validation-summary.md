# Validation Summary: How to Use the sum Function in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- OpenTofu (HCL language built-in functions)
- Terraform (compatible HCL syntax)
- AWS Provider (`aws_budgets_budget` resource used in one example)

## Sources Consulted
- OpenTofu `sum` function documentation: https://opentofu.org/docs/language/functions/sum/
- OpenTofu source code: `internal/lang/funcs/collection.go` (SumFunc)
- AWS Provider `aws_budgets_budget` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- Empirical verification via `tofu console` for output formatting and empty-list error behavior

## Issues Found
No technical issues found.

All examples verified:
- `sum([1, 2, 3, 4, 5])` = 15 ✓
- `sum([1.5, 2.5, 3.0])` displays as 7 ✓ (cty/HCL renders whole-valued numbers without trailing `.0`)
- `sum([42])` = 42 ✓
- Replica counts (3+5+2=10) ✓
- Service costs (450+120+85.5+200=855.5) ✓
- Cluster nodes (5+3+2=10) ✓
- abs values sum (1+2+3+4+5=15) ✓
- Console output `sum([1.5, 2.5])` displaying as `4` (not `4.0`) ✓
- Empty-list pitfall — confirmed `sum([])` produces "cannot sum an empty list" error ✓
- `aws_budgets_budget` top-level `limit_amount`/`limit_unit` attributes ✓ (still valid in current AWS provider)

## Review Notes
- The claim "OpenTofu handles coercion automatically" for mixed integer/float types is technically simplified — in HCL, all numbers share a single `number` type internally so there is no real coercion happening, but the user-observable behavior described is correct.
- The `aws_budgets_budget` example omits `time_period_start` which historically was required but is now optional in the AWS provider. The example is valid as written.
- The post is a clean, accurate reference for the `sum` function with practical IaC use cases.
