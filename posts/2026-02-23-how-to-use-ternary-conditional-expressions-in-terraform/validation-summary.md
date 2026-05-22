# Validation Summary: How to Use Ternary Conditional Expressions in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCL
- Terraform conditional expressions
- Terraform `count` and `for_each` meta-arguments
- Terraform functions including `one`, `concat`, `try`, and `tostring`

## Sources Consulted
- Terraform Conditional Expressions: https://developer.hashicorp.com/terraform/language/expressions/conditionals
- Terraform Types and Values: https://developer.hashicorp.com/terraform/language/expressions/types
- Terraform Strings and Templates: https://developer.hashicorp.com/terraform/language/expressions/strings
- Terraform `count` meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- Terraform `for_each` meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform `one` function: https://developer.hashicorp.com/terraform/language/functions/one
- Terraform `concat` function: https://developer.hashicorp.com/terraform/language/functions/concat
- Terraform `try` function: https://developer.hashicorp.com/terraform/language/functions/try

## Issues Found
- The type-handling section claimed `var.flag ? "hello" : 42` is an error. Terraform can automatically convert numbers to strings in conditional result type unification, so the example was changed to an actually incompatible string-versus-list case.
- The `aws_instance` example assigned `key_name` twice in the same resource block. The first alternative was commented out so the snippet no longer contains a duplicate argument.
- The gotcha section claimed Terraform evaluates both ternary branches. Official Terraform documentation describes conditional expressions as returning the selected result while requiring result expressions to be valid and type-compatible. The section was revised to explain the real caveat around valid branches and indexing counted resources.
- The summary repeated the inaccurate claim that both branches are evaluated. It was updated to state that Terraform returns only the branch selected by the condition.

## Review Notes
- Terraform CLI was not installed in the local environment, so validation was performed against official HashiCorp documentation rather than `terraform validate`.
