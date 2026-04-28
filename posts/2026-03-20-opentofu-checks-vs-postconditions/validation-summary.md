# Validation Summary: How to Choose Between Checks and Postconditions in OpenTofu

## Status
validated

## Post Type
Guide / Decision-making reference

## Technologies Covered
- OpenTofu (validation features: variable validation, preconditions, postconditions, check blocks)
- HCL (HashiCorp Configuration Language) syntax
- AWS provider resources (`aws_lb`, `aws_eks_cluster`, `aws_db_instance`, `aws_autoscaling_group`, `aws_s3_bucket`)
- `hashicorp/http` data source

## Sources Consulted
- OpenTofu Checks documentation: https://opentofu.org/docs/language/checks/
- OpenTofu Custom Conditions documentation: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu Variable Validation documentation: https://opentofu.org/docs/language/values/variables/#custom-validation-rules
- `hashicorp/http` provider documentation (registry)
- AWS provider resource attribute references for `aws_lb`, `aws_eks_cluster`, `aws_db_instance`, `aws_autoscaling_group`

## Issues Found
- **Variable validation reference scope (table row):** The original table claimed variable validation can reference "Only the variable." This was true for early Terraform 1.2 behavior but is no longer accurate in current OpenTofu — validation expressions may now reference other variables, locals, data sources, and resources. Updated the table cell to "The variable, other variables, locals, data sources."

## Review Notes
- All HCL code examples are syntactically correct and use valid OpenTofu features.
- The scoped data source pattern inside the `check "api_reachable"` block matches the official OpenTofu documentation example exactly.
- Verified AWS resource attributes used in postconditions and check blocks (`dns_name`, `status`, `allocated_storage`, `desired_capacity`, `min_size`) are all real, exported attributes.
- `data.http.health.status_code` is correctly compared as a number (the `hashicorp/http` provider exposes `status_code` as a Number).
- The `startswith` function used in the naming compliance example is a valid OpenTofu built-in.
- Minor nuance not addressed in the post: postconditions can also be evaluated during plan (not only apply) when the referenced values are known at plan time, and check blocks run during both plan and apply (not strictly "after all resources applied"). These are reasonable simplifications for an introductory guide and were not changed.
- Scoped data sources inside `check` blocks do not support `count` or `for_each` — worth noting in any future deeper-dive post but not required here.
